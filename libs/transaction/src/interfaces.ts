import {
  Hash,
  GetTransactionReturnType,
  GetTransactionReceiptReturnType,
} from 'viem';

export interface Transaction {
  state: 'waiting' | 'pending' | 'completed';
  id: number;
  from?: Hash;
  status?: 'success' | 'reverted';
  to: Hash;
  data: Hash;
  hash?: Hash;
  previousHash?: Hash;
  gas: bigint;
  gasPrice?: bigint;
  gasUsed?: bigint;
  tx?: GetTransactionReturnType;
  txReceipt?: GetTransactionReceiptReturnType;
  timestamp: number;
}
