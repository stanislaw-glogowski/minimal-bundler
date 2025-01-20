import { parseEther } from 'viem';
import { registerAs } from '@nestjs/config';
import { parsePositive, parseFlag } from '@app/utils';

export const relayerConfig = registerAs('relayer', () => ({
  accountsMnemonic: process.env.RELAYER_ACCOUNTS_MNEMONIC,
  accountsCount: parsePositive(process.env.RELAYER_ACCOUNTS_COUNT, 'int', 3),
  dumpAccountsPrivateKeys: parseFlag(
    process.env.RELAYER_DUMP_ACCOUNTS_PRIVATE_KEYS,
  ),
  minAccountBalance: parseEther(
    process.env.RELAYER_MIN_ACCOUNT_BALANCE || '0.0001',
  ),
  transactionWaitingTimeout: parsePositive(
    process.env.RELAYER_TRANSACTION_WAITING_TIMEOUT,
    'int',
    30,
  ),
  queuedTransactionDropTime: parsePositive(
    process.env.RELAYER_QUEUED_TRANSACTION_DROP_TIME,
    'int',
    30,
  ),
  pendingTransactionDropTime: parsePositive(
    process.env.RELAYER_PENDING_TRANSACTION_DROP_TIME,
    'int',
    30,
  ),
  transactionGasMultiplier: parsePositive(
    process.env.RELAYER_TRANSACTION_GAS_MULTIPLIER,
    'float',
    1.1,
  ),
  transactionGasPriceMultiplier: parsePositive(
    process.env.RELAYER_TRANSACTION_GAS_PRICE_MULTIPLIER,
    'float',
    1.1,
  ),
}));
