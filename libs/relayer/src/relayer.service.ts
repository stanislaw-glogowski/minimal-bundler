import { formatEther, Hash } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Logger } from '@app/logger';
import { NetworkService } from '@app/network';
import { StateCollection } from '@app/utils';
import { RelayerAccount } from './interfaces';
import { relayerConfig } from './relayer.config';

@Injectable()
export class RelayerService implements OnModuleInit, OnModuleDestroy {
  private static formatAccounts(accounts: RelayerAccount[]) {
    return accounts.map(({ address, state, nonce, balance }) => ({
      address,
      state,
      nonce,
      balance: typeof balance === 'bigint' ? formatEther(balance) : undefined,
    }));
  }

  readonly accounts = new StateCollection<RelayerAccount>('address');

  readonly beneficiary: Hash;

  constructor(
    @Inject(relayerConfig.KEY)
    private config: ConfigType<typeof relayerConfig>,
    private readonly logger: Logger,
    private readonly networkService: NetworkService,
  ) {
    logger.setContext(RelayerService.name);

    const { accountsMnemonic, accountsCount, beneficiary } = config;

    if (!accountsMnemonic) {
      throw new Error('No relayer accounts mnemonic provided');
    }

    if (!beneficiary) {
      throw new Error('No relayer beneficiary provided');
    }

    this.beneficiary = beneficiary;

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

  onModuleInit() {
    const fetchAccounts = this.logger.lockAsync(
      this.fetchAccounts.bind(this), //
    );

    this.networkService.on('newBlock', fetchAccounts);
  }

  onModuleDestroy() {
    this.accounts.off();
  }

  getFormattedAccounts() {
    return RelayerService.formatAccounts(this.accounts.items);
  }

  async fetchAccounts() {
    let accounts = this.accounts.getStateItems('drained');

    if (accounts.length) {
      const updated: RelayerAccount[] = [];

      this.logger.verbose(`Fetching drained accounts (${accounts.length})`);

      for (const account of accounts) {
        await this.fetchAccount(account, updated);
      }

      if (updated.length) {
        this.logger.debug(RelayerService.formatAccounts(updated));
      }
    }

    accounts = this.accounts.getStateItems('unknown');

    if (accounts.length) {
      const updated: RelayerAccount[] = [];

      this.logger.verbose(`Fetching unknown accounts (${accounts.length})`);

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

          account.nonce = nonce;
        }

        await this.fetchAccount(account, updated);
      }

      if (updated.length) {
        this.logger.debug(RelayerService.formatAccounts(updated));
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
}
