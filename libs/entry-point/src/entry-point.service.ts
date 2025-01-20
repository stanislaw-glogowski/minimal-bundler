import { Hash, encodeFunctionData, encodeAbiParameters, keccak256 } from 'viem';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { NetworkService } from '@app/network';
import { entryPointAbi } from './entry-point.abi';
import { entryPointConfig } from './entry-point.config';
import { UserOp } from './interfaces';

@Injectable()
export class EntryPointService {
  readonly address: Hash;

  constructor(
    @Inject(entryPointConfig.KEY)
    config: ConfigType<typeof entryPointConfig>,
    private readonly networkService: NetworkService,
  ) {
    const { address } = config;

    if (!address) {
      throw new Error('No entrypoint address provided');
    }

    this.address = address;
  }

  buildContractTransaction(
    functionName: 'handleOps',
    userOps: UserOp[],
    beneficiary?: Hash | undefined,
  ) {
    return {
      to: this.address,
      data: encodeFunctionData({
        abi: entryPointAbi,
        functionName,
        args: [
          userOps.map(
            ({
              nonce,
              callGasLimit,
              verificationGasLimit,
              preVerificationGas,
              maxFeePerGas,
              maxPriorityFeePerGas,
              ...userOp
            }) => ({
              nonce: BigInt(nonce),
              callGasLimit: BigInt(callGasLimit),
              verificationGasLimit: BigInt(verificationGasLimit),
              preVerificationGas: BigInt(preVerificationGas),
              maxFeePerGas: BigInt(maxFeePerGas),
              maxPriorityFeePerGas: BigInt(maxPriorityFeePerGas),
              ...userOp,
            }),
          ), //
          beneficiary || this.address,
        ],
      }),
    };
  }

  hashUserOp(userOp: UserOp) {
    const { chainId } = this.networkService;

    const {
      sender,
      nonce,
      initCode,
      callData,
      callGasLimit,
      verificationGasLimit,
      preVerificationGas,
      maxFeePerGas,
      maxPriorityFeePerGas,
      paymasterAndData,
    } = userOp;

    const hash = keccak256(
      encodeAbiParameters(
        [
          { type: 'address', name: 'sender' }, //
          { type: 'uint256', name: 'nonce' },
          { type: 'bytes32', name: 'hashInitCode' },
          { type: 'bytes32', name: 'hashCallData' },
          { type: 'uint256', name: 'callGasLimit' },
          { type: 'uint256', name: 'verificationGasLimit' },
          { type: 'uint256', name: 'preVerificationGas' },
          { type: 'uint256', name: 'maxFeePerGas' },
          { type: 'uint256', name: 'maxPriorityFeePerGas' },
          { type: 'bytes32', name: 'hashPaymasterAndData' },
        ],
        [
          sender, //
          BigInt(nonce),
          keccak256(initCode),
          keccak256(callData),
          BigInt(callGasLimit),
          BigInt(verificationGasLimit),
          BigInt(preVerificationGas),
          BigInt(maxFeePerGas),
          BigInt(maxPriorityFeePerGas),
          keccak256(paymasterAndData),
        ],
      ),
    );

    return keccak256(
      encodeAbiParameters(
        [
          { type: 'bytes32' }, //
          { type: 'address' },
          { type: 'uint256' },
        ],
        [
          hash, //
          this.address,
          BigInt(chainId),
        ],
      ),
    );
  }
}
