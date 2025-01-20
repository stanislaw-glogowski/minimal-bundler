import { Hash } from 'viem';
import { Injectable } from '@nestjs/common';
import { EntryPointService, UserOp } from '@app/entry-point';
import { NetworkService } from '@app/network';
import { RelayerService } from '@app/relayer';

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

  async sendUserOperation(userOp?: UserOp, entryPoint?: Hash) {
    if (this.entryPointService.address !== entryPoint) {
      throw new Error('Invalid entry point');
    }

    const hash = this.entryPointService.hashUserOp(userOp);

    const id = this.relayerService.submitTransaction({
      type: 'userOp',
      userOp,
    });

    return id ? hash : null;
  }
}
