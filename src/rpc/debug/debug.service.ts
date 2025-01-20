import { Hash } from 'viem';
import { Injectable } from '@nestjs/common';
import { EntryPointService, UserOp } from '@app/entry-point';
import { RelayerService } from '@app/relayer';

@Injectable()
export class DebugService {
  constructor(
    private readonly entryPointService: EntryPointService,
    private readonly relayerService: RelayerService,
  ) {
    //
  }

  async hashUserOp(userOp?: UserOp) {
    return this.entryPointService.hashUserOp(userOp);
  }

  async sendUserOp(userOp?: UserOp, waitForCompleted?: boolean) {
    const id = this.relayerService.submitTransaction({
      type: 'userOp',
      userOp,
    });

    if (!id) {
      return null;
    }

    return waitForCompleted ? this.relayerService.waitForTransaction(id) : id;
  }

  async sendTransaction(
    params?: {
      to: Hash; //
      data: Hash;
    },
    waitForCompleted?: boolean,
  ) {
    const { to, data } = params;

    const id = this.relayerService.submitTransaction({
      type: 'plain',
      to,
      data,
    });

    if (!id) {
      return null;
    }

    return waitForCompleted ? this.relayerService.waitForTransaction(id) : id;
  }
}
