import { Hash } from 'viem';
import { filter, map, finalize, concat, of, timeout } from 'rxjs';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Logger } from '@app/logger';
import { NetworkService } from '@app/network';
import { RelayerAccount, RelayerService } from '@app/relayer';
import { StateCollection, autoId, mulBigint } from '@app/utils';
import { Transaction } from './interfaces';
import { transactionConfig } from './transaction.config';

@Injectable()
export class TransactionService implements OnModuleInit, OnModuleDestroy {
  private readonly transactions = new StateCollection<Transaction>('id');

  constructor(
    @Inject(transactionConfig.KEY)
    private config: ConfigType<typeof transactionConfig>,
    private readonly logger: Logger,
    private readonly networkService: NetworkService,
    private readonly relayerService: RelayerService,
  ) {
    logger.setContext(TransactionService.name);
  }

  async onModuleInit(): Promise<void> {
    const processWaitingTransactions = this.logger.lockAsync(
      this.processWaitingTransactions.bind(this),
    );
    const processPendingTransactions = this.logger.lockAsync(
      this.processPendingTransactions.bind(this),
    );

    this.relayerService.accounts //
      .on('idleAppear', processWaitingTransactions);

    this.transactions
      .on('waitingAppear', processWaitingTransactions)
      .on('pendingAppear', processPendingTransactions);

    this.networkService //
      .on('newBlock', processPendingTransactions);
  }

  onModuleDestroy() {
    this.transactions.off();
  }

  async submitTransaction(params: {
    to: Hash; //
    data: Hash;
    gas?: bigint;
  }) {
    let result: number | null = null;

    const { gasMultiplier } = this.config;

    const { to, data } = params;
    let { gas } = params;

    try {
      const id = autoId();

      if (!gas) {
        gas = mulBigint(
          await this.networkService.estimateTransactionGas({
            to,
            data,
          }),
          gasMultiplier, // apply gas multiplier
        );
      }

      this.transactions.addItem({
        id,
        state: 'waiting',
        to,
        data,
        gas,
        timestamp: Date.now(),
      });

      this.logger.log(`New waiting transaction: ${id}`);
      this.logger.debug({
        to,
        data,
        gas,
      });

      result = id;
    } catch (err) {
      // TODO: improve error handling
      this.logger.error(err);
    }

    return result;
  }

  subscribeTransaction(id: number, timeoutValue = 60) {
    return new Promise<Pick<Transaction, 'tx' | 'txReceipt'> | null>(
      (resolve) => {
        concat(
          of(this.transactions.getItem(id)), //
          this.transactions.items$.pipe(filter((item) => item.id === id)),
        )
          .pipe(
            filter(({ state }) => state === 'completed'),
            map(({ tx, txReceipt }) => ({ tx, txReceipt })),
            finalize(() => null),
          )
          .pipe(
            timeout({
              each: timeoutValue * 1000,
              with: () => of(null),
            }),
          )
          .subscribe({
            next: (result) => resolve(result),
            error: () => resolve(null),
          });
      },
    );
  }

  async processWaitingTransactions() {
    const accounts = this.relayerService.accounts.getStateItems('idle');

    const transactions = this.transactions.getStateItems('waiting');

    if (!accounts.length || !transactions.length) {
      return;
    }

    const { chainId } = this.networkService;

    const { gasPriceMultiplier } = this.config;

    const gasPrice = mulBigint(
      await this.networkService.getGasPrice(),
      gasPriceMultiplier,
    );

    for (const transaction of transactions) {
      const { id, to, data, gas } = transaction;

      try {
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

        const { address: from, nonce, hdAccount } = sender;

        const serializedTransaction = await hdAccount.signTransaction({
          chainId,
          from,
          to,
          nonce,
          data,
          gas,
          gasPrice,
        });

        const hash = await this.networkService.sendRawTransaction({
          serializedTransaction,
        });

        this.relayerService.accounts.updateItem(from, {
          state: 'busy',
        });

        this.transactions.updateItem(id, {
          state: 'pending',
          from,
          hash,
          gasPrice,
          timestamp: Date.now(),
        });

        this.logger.log(`New pending transaction: ${id}`);
        this.logger.debug({
          from,
          hash,
          gasPrice,
        });
      } catch (err) {
        // TODO: improve error handling
        this.logger.error(err);
      }
    }
  }

  async processPendingTransactions() {
    const { accounts } = this.relayerService;

    const transactions = this.transactions.getStateItems('pending');

    // TODO: remove tx based on timestamp
    for (const transaction of transactions) {
      const { id, from, hash } = transaction;
      let { tx } = transaction;

      if (!tx) {
        tx = await this.networkService.getTransaction({
          hash,
        });

        if (!tx) {
          // dropped ?
          continue;
        }

        if (!tx?.blockNumber) {
          // still pending ?
          continue;
        }

        transaction.tx = tx;
      }

      const txReceipt = await this.networkService.getTransactionReceipt({
        hash,
      });

      if (!txReceipt) {
        // try again ...
        continue;
      }

      const { nonce } = tx;
      const { status, gasUsed } = txReceipt;

      this.transactions.updateItem(id, {
        state: 'completed',
        status,
        gasUsed,
        txReceipt,
      });

      this.logger.log(`New completed transaction: ${id}`);
      this.logger.debug({
        hash,
        status,
        gasUsed,
      });

      accounts.updateItem(from, {
        state: 'unknown',
        balance: undefined,
        nonce: nonce + 1,
      });
    }
  }
}
