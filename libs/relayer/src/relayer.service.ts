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

/**
 * The RelayerService class provides services for managing relayer accounts and transactions
 * for a blockchain network. It ensures account state management, transaction lifecycle handling,
 * and interaction with blockchain network services.
 */
@Injectable()
export class RelayerService implements OnModuleInit, OnModuleDestroy {
  /**
   * Represents a collection of relayer accounts, indexed by their respective address.
   *
   * The `accounts` variable utilizes the `StateCollection` data structure to manage
   * and manipulate a set of `RelayerAccount` objects, which are indexed using the
   * unique 'address' identifier. This ensures efficient lookup, retrieval, and operations
   * on relayer account instances.
   *
   * @type {StateCollection<RelayerAccount>}
   */
  readonly accounts: StateCollection<RelayerAccount> =
    new StateCollection<RelayerAccount>('address');

  /**
   * Represents a collection of relayer transactions managed in a stateful way.
   *
   * @type {StateCollection<RelayerTransaction>}
   * @description The `transactions` variable holds a collection of `RelayerTransaction`
   * entities, managed as a state collection. Each transaction is uniquely identified
   * by the property `id` within this collection.
   */
  readonly transactions: StateCollection<RelayerTransaction> =
    new StateCollection<RelayerTransaction>('id');

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

  /**
   * Initializes the module by setting up event listeners and processing tasks.
   * This method is executed asynchronously, ensuring that the required processes
   * such as fetching accounts and processing transactions are locked and properly
   * bound. It subscribes to relevant events within the system to trigger
   * specific actions.
   *
   * @return {Promise<void>} A promise that resolves once the module has been successfully initialized.
   */
  async onModuleInit(): Promise<void> {
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

  /**
   * Executes cleanup logic when the module is being destroyed.
   * Removes all listeners associated with accounts and transactions
   * to ensure proper resource management and prevent memory leaks.
   *
   * @return {void} No return value.
   */
  onModuleDestroy(): void {
    this.accounts.off();
    this.transactions.off();
  }

  getFormattedAccounts() {
    return this.formatAccounts(this.accounts.items);
  }

  /**
   * Fetches accounts that are marked as 'drained' or 'unknown' and updates their state.
   *
   * For accounts marked as 'drained', it fetches account details and logs them if updates are made.
   * For accounts marked as 'unknown', it retrieves the nonce if not already present,
   * updates their state, and fetches account information. Logs updates if applicable.
   *
   * @return {Promise<void>} A promise that resolves once all account fetching operations are completed.
   */
  async fetchAccounts(): Promise<void> {
    let accounts = this.accounts.getStateItems('drained');

    // drained accounts
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

    // unknown accounts
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

  /**
   * Fetches and updates the state and balance of a given account based on its current balance
   * and predefined minimum account balance.
   *
   * @param {RelayerAccount} account - The account object containing information about the address, state, and balance.
   * @param {RelayerAccount[]} updated - An array to store updated account objects after processing.
   * @return {Promise<void>} A promise that resolves when the account fetching and updating process is complete.
   */
  async fetchAccount(
    account: RelayerAccount,
    updated: RelayerAccount[],
  ): Promise<void> {
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

  /**
   * Submits a new transaction to the transaction queue.
   *
   * @param {RelayerTransactionParams} params - The parameters of the transaction, including type, state, and other required details.
   * @return {number} The unique identifier for the submitted transaction.
   */
  submitTransaction(params: RelayerTransactionParams): number {
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

  /**
   * Waits for a transaction with the specified ID to complete or fail.
   *
   * @param {number} id - The unique identifier of the transaction to wait for.
   * @return {Promise<RelayerTransaction>} A promise that resolves with the transaction object if completed successfully,
   * or rejects with an error if the transaction fails or times out.
   */
  waitForTransaction(id: number): Promise<RelayerTransaction> {
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
          error: () => reject(new Error('Timeout')), // handled in rpc
        });
    });
  }

  /**
   * Drops queued transactions that have exceeded the allowed drop time.
   * Updates the state of each dropped transaction to 'dropped' and logs the action.
   *
   * @return {void} Does not return a value.
   */
  dropQueuedTransactions(): void {
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

  /**
   * Processes queued transactions by iteratively estimating gas, determining costs,
   * finding eligible sender accounts, signing, and sending the transaction to the network.
   * Updates transaction and account states accordingly. If any issues occur during the process
   * (e.g., gas estimation failure or transaction rejection), the respective transaction is
   * marked as reverted.
   *
   * @return {Promise<void>} Resolves once all queued transactions are processed or skipped
   *                         if no eligible transactions/accounts are found.
   */
  async processQueuedTransactions(): Promise<void> {
    // drop expired
    this.dropQueuedTransactions();

    const transactions = this.transactions.getStateItems('queued');
    const accounts = this.accounts.getStateItems('idle');

    if (!transactions.length || !accounts.length) {
      return;
    }

    const gasPrice = await this.getGasPrice();

    if (!gasPrice) {
      return;
    }

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

      // looking for a sender
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

      // sending transaction
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

  /**
   * Drops pending transactions that exceed the allowed drop time threshold.
   * Transactions with timestamps beyond the calculated maximum timestamp are
   * processed, and their state is updated either to 'dropped' or 'queued', based
   * on the presence of a previous transaction hash. Additionally, the sender of
   * each processed transaction is released with the current gas price.
   *
   * @return {Promise<void>} Resolves when all necessary transactions are
   * processed and their state updated. Logs messages and errors during the
   * process.
   */
  async dropPendingTransactions(): Promise<void> {
    const { pendingTransactionDropTime } = this.config;

    const maxTimestamp = Date.now() + pendingTransactionDropTime * 1000;

    const transactions = this.transactions
      .getStateItems('pending')
      .filter(({ timestamp }) => timestamp > maxTimestamp);

    if (!transactions.length) {
      return;
    }

    const gasPrice = await this.getGasPrice();

    if (!gasPrice) {
      return;
    }

    for (const transaction of transactions) {
      try {
        const { id, from, hash, previousHash } = transaction;

        await this.releaseTransactionSender(from, gasPrice);

        if (previousHash) {
          // final drop
          this.transactions.updateItem(
            id,
            {
              state: 'dropped',
            },
            true,
          );

          this.logger.verbose(`Transaction #${id} dropped`);
        } else {
          // first drop
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

  /**
   * Processes all pending transactions by verifying their state and updating their status.
   * The method handles the retrieval and confirmation of transactions, checking if they have been mined
   * and updating their respective account information and transaction details accordingly.
   *
   * The following steps are performed:
   * 1. Drops all pending transactions from the internal state.
   * 2. Fetches transactions marked as 'pending' from the state.
   * 3. Retrieves transaction details and receipts from the network service.
   * 4. Updates transaction state to 'confirmed' upon successful confirmation.
   * 5. Updates relevant account information, such as state, balance, and nonce.
   *
   * @return {Promise<void>} Resolves when all pending transactions are processed.
   */
  async processPendingTransactions(): Promise<void> {
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

  private async releaseTransactionSender(
    from: Hash,
    gasPrice: bigint,
  ): Promise<void> {
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

    let result: {
      chainId: number;
      nonce?: number;
      from?: Hash;
      to: Hash;
      data: Hash;
    } = {
      chainId,
      to,
      data,
    };

    if (sender) {
      result = {
        ...result,
        nonce: sender.nonce,
        from: sender.address,
      };
    }

    return result;
  }
}
