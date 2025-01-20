import {
  GetTransactionReceiptReturnType,
  GetTransactionReturnType,
  Hash,
} from 'viem';
import { HDAccount } from 'viem/accounts';
import { UserOp } from '@app/entry-point';

export interface RelayerAccount {
  state: 'unknown' | 'drained' | 'idle' | 'busy';
  address: Hash;
  nonce?: number;
  balance?: bigint;
  hdAccount: HDAccount;
}

export interface RelayerRawTransactionParams {
  type: 'plain';
  to: Hash;
  data: Hash;
}

export interface RelayerUserOpTransactionParams {
  type: 'userOp';
  userOp: UserOp;
}

export interface RelayerCommonTransaction {
  state: 'queued' | 'pending' | 'reverted' | 'confirmed' | 'dropped';
  id: number;
  hash?: Hash;
  previousHash?: Hash;
  from?: Hash | null;
  gas?: bigint | null;
  tx?: GetTransactionReturnType | null;
  txReceipt?: GetTransactionReceiptReturnType | null;
  timestamp: number;
}

export interface RelayerRawTransaction
  extends RelayerCommonTransaction,
    RelayerRawTransactionParams {
  //
}

export interface RelayerUserOpTransaction
  extends RelayerCommonTransaction,
    RelayerUserOpTransactionParams {
  //
}

export type RelayerTransactionParams =
  | RelayerRawTransactionParams
  | RelayerUserOpTransactionParams;

export type RelayerTransaction =
  | RelayerRawTransaction
  | RelayerUserOpTransaction;
