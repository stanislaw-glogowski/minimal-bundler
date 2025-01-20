import { filter, finalize, timeout } from 'rxjs';
import { formatEther, Hash, toHex } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { EntryPointService } from '@app/entry-point';
import { Logger } from '@app/logger';
import { NetworkService } from '@app/network';
import { autoId, mulBigint, StateCollection } from '@app/utils';
import {
  RelayerAccount,
  RelayerTransaction,
  RelayerTransactionParams,
} from './interfaces';
import { relayerConfig } from './relayer.config';

@Injectable()
export class RelayerService implements OnModuleInit, OnModuleDestroy {
  readonly accounts = new StateCollection<RelayerAccount>('address');

  readonly transactions = new StateCollection<RelayerTransaction>('id');

  constructor(
    @Inject(relayerConfig.KEY)
    private config: ConfigType<typeof relayerConfig>,
    private readonly logger: Logger,
    private readonly entryPointService: EntryPointService,
    private readonly networkService: NetworkService,
  ) {
    logger.setContext(RelayerService.name);

    const { accountsMnemonic, accountsCount } = config;

    if (!accountsMnemonic) {
      throw new Error('No relayer accounts mnemonic provided');
    }

    for (let accountIndex = 0; accountIndex < accountsCount; accountIndex++) {
      const hdAccount = mnemonicToAccount(accountsMnemonic, {
        accountIndex,
      });

      const { address } = hdAccount;

      this.accounts.addItem({
        state: 'unknown',
        address,
        hdAccount,
      });
    }
  }

  async onModuleInit() {
    const fetchAccounts = this.logger.lockAsync(
      this.fetchAccounts.bind(this), //
    );

    const processQueuedTransactions = this.logger.lockAsync(
      this.processQueuedTransactions.bind(this),
    );

    const processPendingTransactions = this.logger.lockAsync(
      this.processPendingTransactions.bind(this),
    );

    this.networkService //
      .on('newBlock', fetchAccounts)
      .on('newBlock', processPendingTransactions);

    this.accounts //
      .on('idleAppear', processQueuedTransactions);

    this.transactions //
      .on('queuedAppear', processQueuedTransactions)
      .on('pendingAppear', processPendingTransactions);

    await this.fetchAccounts();
  }

  onModuleDestroy() {
    this.accounts.off();
    this.transactions.off();
  }

  getFormattedAccounts() {
    return this.formatAccounts(this.accounts.items);
  }

  async fetchAccounts() {
    let accounts = this.accounts.getStateItems('drained');

    if (accounts.length) {
      this.logger.verbose(`Fetching drained accounts (${accounts.length})`);

      const updated: RelayerAccount[] = [];

      for (const account of accounts) {
        await this.fetchAccount(account, updated);
      }

      if (updated.length) {
        this.logger.debug(this.formatAccounts(updated));
      }
    }

    accounts = this.accounts.getStateItems('unknown');

    if (accounts.length) {
      this.logger.verbose(`Fetching unknown accounts (${accounts.length})`);

      const updated: RelayerAccount[] = [];

      for (const account of accounts) {
        const { address, nonce: currentNonce } = account;

        if (!currentNonce) {
          const nonce = await this.networkService.getTransactionCount({
            address,
          });

          if (nonce === null) {
            // maybe next time ...
            continue;
          }

          this.accounts.updateItem(address, {
            nonce,
          });
        }

        await this.fetchAccount(account, updated);
      }

      if (updated.length) {
        this.logger.debug(this.formatAccounts(updated));
      }
    }
  }

  async fetchAccount(account: RelayerAccount, updated: RelayerAccount[]) {
    const { address, state, balance: currentBalance } = account;

    const { minAccountBalance } = this.config;

    const balance = await this.networkService.getBalance({ address });

    if (balance === null) {
      if (state !== 'unknown') {
        updated.push(
          this.accounts.updateItem(address, {
            state: 'unknown',
            balance: undefined,
          }),
        );
      }
    } else if (balance < minAccountBalance) {
      if (state !== 'drained' || balance !== currentBalance) {
        updated.push(
          this.accounts.updateItem(address, {
            state: 'drained',
            balance,
          }),
        );
      }
    } else {
      updated.push(
        this.accounts.updateItem(address, {
          state: 'idle',
          balance,
        }),
      );
    }
  }

  submitTransaction(params: RelayerTransactionParams) {
    const id = autoId();

    const { type } = params;

    this.transactions.addItem({
      ...params,
      state: 'queued',
      id,
      timestamp: Date.now(),
    });

    this.logger.verbose(`New ${type} transaction #${id}`);

    return id;
  }

  waitForTransaction(id: number) {
    const { transactionWaitingTimeout } = this.config;

    return new Promise<RelayerTransaction>((resolve, reject) => {
      this.transactions
        .subscribeItem(id)
        .pipe(
          filter(({ state }) => state !== 'queued' && state !== 'pending'),
          finalize(() => null),
        )
        .pipe(
          timeout({
            each: transactionWaitingTimeout * 1000,
          }),
        )
        .subscribe({
          next: (item) => resolve(item),
          error: () => reject(new Error(`Transaction #${id} timeout`)),
        });
    });
  }

  dropQueuedTransactions() {
    const { queuedTransactionDropTime } = this.config;

    const maxTimestamp = Date.now() + queuedTransactionDropTime * 1000;

    const transactions = this.transactions
      .getStateItems('queued')
      .filter(({ timestamp }) => timestamp > maxTimestamp);

    for (const transaction of transactions) {
      const { id } = transaction;

      this.transactions.updateItem(
        id,
        {
          state: 'dropped',
        },
        true,
      );

      this.logger.verbose(`Transaction #${id} dropped`);
    }
  }

  async processQueuedTransactions() {
    this.dropQueuedTransactions();

    const transactions = this.transactions.getStateItems('queued');
    const accounts = this.accounts.getStateItems('idle');

    if (!transactions.length || !accounts.length) {
      return;
    }

    const gasPrice = await this.getGasPrice();

    const { transactionGasMultiplier } = this.config;

    for (const transaction of transactions) {
      const { id } = transaction;

      let { gas } = transaction;

      if (!gas) {
        // gas estimation
        try {
          gas = mulBigint(
            await this.networkService.estimateGas(
              this.buildTransactionRequest(transaction),
            ),
            transactionGasMultiplier,
          );
        } catch (err) {
          this.transactions.updateItem(
            id,
            {
              state: 'reverted',
            },
            true,
          );

          this.logger.verbose(`Transaction #${id} reverted`);
          this.logger.warn(err);
          continue;
        }

        this.transactions.updateItem(id, {
          gas,
        });
      }

      const cost = gas * gasPrice;

      let sender: RelayerAccount | undefined;

      for (const account of accounts) {
        if (account.balance >= cost) {
          sender = account;
          break;
        }
      }

      if (!sender) {
        continue; // wait for another sender
      }

      const { address: from, hdAccount } = sender;

      let hash: Hash | undefined;

      try {
        const serializedTransaction = await hdAccount.signTransaction({
          ...this.buildTransactionRequest(transaction, sender),
          gas,
          gasPrice,
        });

        hash = await this.networkService.sendRawTransaction({
          serializedTransaction,
        });
      } catch (err) {
        this.transactions.updateItem(
          id,
          {
            state: 'reverted',
          },
          true,
        );

        this.logger.verbose(`Transaction #${id} reverted`);
        this.logger.warn(err);
        continue;
      }

      if (!hash) {
        // try again ...
        continue;
      }

      this.accounts.updateItem(from, {
        state: 'busy',
      });

      this.transactions.updateItem(id, {
        state: 'pending',
        from,
        hash,
        timestamp: Date.now(),
      });

      this.logger.verbose(`Transaction #${id} sent`);
      this.logger.debug({
        id,
        from,
        hash,
      });
    }
  }

  async releaseTransactionSender(from: Hash, gasPrice: bigint) {
    const sender = this.accounts.getItem(from);

    const { hdAccount } = sender;

    const transactionRequest = this.buildSelfTransactionRequest(sender);

    const serializedTransaction = await hdAccount.signTransaction({
      transactionRequest,
      gasPrice,
    });

    const hash = await this.networkService.sendRawTransaction({
      serializedTransaction,
    });

    const id = autoId();

    const { to, data, gas } = transactionRequest;

    this.transactions.addItem({
      id,
      type: 'plain',
      state: 'pending',
      hash,
      from,
      to,
      data,
      gas,
      timestamp: Date.now(),
    });

    this.logger.verbose(`Self transaction #${id} sent`);
    this.logger.debug({
      id,
      hash,
      from,
    });
  }

  async dropPendingTransactions() {
    const { pendingTransactionDropTime } = this.config;

    const maxTimestamp = Date.now() + pendingTransactionDropTime * 1000;

    const transactions = this.transactions
      .getStateItems('pending')
      .filter(({ timestamp }) => timestamp > maxTimestamp);

    if (!transactions.length) {
      return;
    }

    const gasPrice = await this.getGasPrice();

    for (const transaction of transactions) {
      try {
        const { id, from, hash, previousHash } = transaction;

        await this.releaseTransactionSender(from, gasPrice);

        if (previousHash) {
          this.transactions.updateItem(
            id,
            {
              state: 'dropped',
            },
            true,
          );

          this.logger.verbose(`Transaction #${id} dropped`);
        } else {
          this.transactions.updateItem(
            id,
            {
              state: 'queued',
              from: null,
              hash: null,
              previousHash: hash,
              tx: null,
            },
            true,
          );

          this.logger.verbose(`Transaction #${id} moved to queue`);
        }
      } catch (err) {
        this.logger.error(err);
      }
    }
  }

  async processPendingTransactions() {
    await this.dropPendingTransactions();

    const transactions = this.transactions.getStateItems('pending');

    for (const transaction of transactions) {
      const { id, from, hash } = transaction;

      let { tx } = transaction;

      if (!tx) {
        tx = await this.networkService.getTransaction({
          hash,
        });

        if (!tx) {
          // try again ...
          continue;
        }

        if (!tx?.blockNumber) {
          // try again ...
          continue;
        }

        this.transactions.updateItem(id, {
          tx,
        });
      }

      const txReceipt = await this.networkService.getTransactionReceipt({
        hash,
      });

      if (!txReceipt) {
        // try again ...
        continue;
      }

      const { nonce } = tx;

      this.transactions.updateItem(
        id,
        {
          state: 'confirmed',
          txReceipt,
        },
        true,
      );

      const { status, gasUsed } = txReceipt;

      this.logger.verbose(`Transaction #${id} confirmed`);
      this.logger.debug({
        id,
        from,
        hash,
        status,
        gasUsed,
      });

      this.accounts.updateItem(from, {
        state: 'unknown',
        balance: undefined,
        nonce: nonce + 1,
      });
    }
  }

  private formatAccounts(accounts: RelayerAccount[]) {
    const { dumpAccountsPrivateKeys } = this.config;

    return accounts.map(({ address, state, nonce, balance, hdAccount }) => {
      let privateKey: string | undefined;

      if (dumpAccountsPrivateKeys) {
        privateKey = toHex(hdAccount.getHdKey().privateKey);
      }

      return {
        address,
        state,
        nonce,
        balance: typeof balance === 'bigint' ? formatEther(balance) : undefined,
        privateKey,
      };
    });
  }

  private async getGasPrice() {
    const {
      transactionGasPriceMultiplier, //
    } = this.config;

    return mulBigint(
      await this.networkService.getGasPrice(),
      transactionGasPriceMultiplier,
    );
  }

  private buildSelfTransactionRequest(sender: RelayerAccount): {
    chainId: number;
    nonce: number;
    from: Hash;
    to: Hash;
    data: Hash;
    gas: bigint;
  } {
    const { chainId } = this.networkService;

    return {
      chainId,
      nonce: sender.nonce,
      from: sender.address,
      to: sender.address,
      data: '0x',
      gas: 21000n,
    };
  }

  private buildTransactionRequest(
    transaction: RelayerTransaction,
    sender?: RelayerAccount,
  ): {
    chainId: number;
    nonce?: number;
    from?: Hash;
    to: Hash;
    data: Hash;
  } {
    const { type } = transaction;

    const { chainId } = this.networkService;

    let to: Hash;
    let data: Hash;

    switch (type) {
      case 'plain': {
        ({ to, data } = transaction);
        break;
      }

      case 'userOp': {
        const { userOp } = transaction;
        ({ to, data } = this.entryPointService.buildContractTransaction(
          'handleOps',
          [userOp],
          sender?.address,
        ));
        break;
      }
    }

    return {
      chainId,
      nonce: sender?.nonce,
      from: sender?.address,
      to,
      data,
    };
  }
}
