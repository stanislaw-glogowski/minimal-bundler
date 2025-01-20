import { Hash } from 'viem';
import { Injectable } from '@nestjs/common';
import { EntryPointService, UserOp } from '@app/entry-point';
import { NetworkService } from '@app/network';
import { RelayerService } from '@app/relayer';
import { RpcError } from '../rpc.error';

@Injectable()
export class EthService {
  constructor(
    private readonly entryPointService: EntryPointService,
    private readonly networkService: NetworkService,
    private readonly relayerService: RelayerService,
  ) {
    //
  }

  getChainId() {
    return BigInt(this.networkService.chainId);
  }

  getSupportedEntryPointAddresses() {
    return [this.entryPointService.address];
  }

  sendUserOperation(userOp?: UserOp, entryPoint?: Hash) {
    if (
      !userOp ||
      !entryPoint ||
      this.entryPointService.address !== entryPoint
    ) {
      throw RpcError.InvalidParams;
    }

    let hash: Hash;

    try {
      hash = this.entryPointService.hashUserOp(userOp);
    } catch {
      throw RpcError.InvalidParams;
    }

    this.relayerService.submitTransaction({
      type: 'userOp',
      userOp,
    });

    return hash;
  }
}
