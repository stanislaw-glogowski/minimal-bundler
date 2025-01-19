import { parseEther } from 'viem';
import { registerAs } from '@nestjs/config';
import { parsePositive, parseAddress } from '@app/utils';

export const relayerConfig = registerAs('relayer', () => ({
  accountsMnemonic: process.env.RELAYER_ACCOUNTS_MNEMONIC,
  accountsCount: parsePositive(process.env.RELAYER_ACCOUNTS_COUNT, 'int', 3),
  minAccountBalance: parseEther(
    process.env.RELAYER_MIN_ACCOUNT_BALANCE || '0.0001',
  ),
  beneficiary: parseAddress(process.env.RELAYER_BENEFICIARY),
}));
