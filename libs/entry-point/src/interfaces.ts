import { Hex } from 'viem';
import { BigIntLike } from '@app/utils';

/**
 * struct UserOperation {
 *   address sender;
 *   uint256 nonce;
 *   bytes initCode;
 *   bytes callData;
 *   uint256 callGasLimit;
 *   uint256 verificationGasLimit;
 *   uint256 preVerificationGas;
 *   uint256 maxFeePerGas;
 *   uint256 maxPriorityFeePerGas;
 *   bytes paymasterAndData;
 *   bytes signature;
 * }
 */

export interface UserOp {
  sender: Hex;
  nonce: BigIntLike;
  initCode: Hex;
  callData: Hex;
  callGasLimit: BigIntLike;
  verificationGasLimit: BigIntLike;
  preVerificationGas: BigIntLike;
  maxFeePerGas: BigIntLike;
  maxPriorityFeePerGas: BigIntLike;
  paymasterAndData: Hex;
  signature: Hex;
}
