import { Hash } from 'viem';
import { Injectable } from '@nestjs/common';
import { EntryPointService, UserOp } from '@app/entry-point';
import { NetworkService } from '@app/network';
import { TransactionService } from '@app/transaction';
import { JsonRpcMethod } from './decorators';

@Injectable()
export class JsonRpcMethods {
  constructor(
    private readonly entryPointService: EntryPointService,
    private readonly networkService: NetworkService,
    private readonly transactionService: TransactionService,
  ) {
    //
  }

  @JsonRpcMethod('eth_chainId')
  ethGetChainId() {
    return BigInt(this.networkService.chainId);
  }

  @JsonRpcMethod('eth_supportedEntryPoints')
  ethGetSupportedEntryPointAddresses() {
    return [this.entryPointService.address];
  }

  @JsonRpcMethod('eth_sendUserOperation')
  async ethSendUserOperation(userOp: UserOp, entryPoint: Hash) {
    if (this.entryPointService.address !== entryPoint) {
      throw new Error('Invalid entry point');
    }

    const hash = this.entryPointService.hashUserOp(userOp);

    const id = await this.transactionService.submitTransaction(
      this.entryPointService.buildHandleOpsTransaction(userOp),
    );

    return id ? hash : null;
  }

  @JsonRpcMethod('debug_sendUserOperation')
  async debugSendUserOperation(userOp: UserOp) {
    const id = await this.transactionService.submitTransaction(
      this.entryPointService.buildHandleOpsTransaction(userOp),
    );

    return id ? this.transactionService.subscribeTransaction(id) : null;
  }

  @JsonRpcMethod('debug_submitTransaction')
  async debugSendTransaction(params: {
    to: Hash; //
    data: Hash;
  }) {
    const { to, data } = params;

    const id = await this.transactionService.submitTransaction({ to, data });

    return id ? this.transactionService.subscribeTransaction(id) : null;
  }
}
