import { Hash } from 'viem';
import { HDAccount } from 'viem/accounts';

export interface RelayerAccount {
  state: 'unknown' | 'drained' | 'idle' | 'busy';
  address: Hash;
  nonce?: number;
  balance?: bigint;
  hdAccount: HDAccount;
}
