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
  state: 'queued' | 'pending' | 'reverted' | 'confirmed';
  id: number;
  hash?: Hash;
  from?: Hash;
  gas?: bigint;
  tx?: GetTransactionReturnType;
  txReceipt?: GetTransactionReceiptReturnType;
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
