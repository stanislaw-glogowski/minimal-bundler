import { Hash, isAddress, isHex } from 'viem';
import { Injectable } from '@nestjs/common';
import { EntryPointService, UserOp } from '@app/entry-point';
import { RelayerService } from '@app/relayer';
import { RpcError } from '../rpc.error';

@Injectable()
export class DebugService {
  constructor(
    private readonly entryPointService: EntryPointService,
    private readonly relayerService: RelayerService,
  ) {
    //
  }

  hashUserOp(userOp?: UserOp) {
    return this.entryPointService.hashUserOp(userOp);
  }

  async sendUserOp(userOp?: UserOp, waitForCompleted?: boolean) {
    if (!userOp) {
      throw RpcError.InvalidParams;
    }

    try {
      this.entryPointService.hashUserOp(userOp);
    } catch {
      throw RpcError.InvalidParams;
    }

    const id = this.relayerService.submitTransaction({
      type: 'userOp',
      userOp,
    });

    return waitForCompleted ? this.waitForTransaction(id) : id;
  }

  async sendTransaction(to?: Hash, data?: Hash, waitForCompleted?: boolean) {
    if (!to || !data || !isAddress(to) || !isHex(data)) {
      throw RpcError.InvalidParams;
    }

    const id = this.relayerService.submitTransaction({
      type: 'plain',
      to,
      data,
    });

    return waitForCompleted ? this.waitForTransaction(id) : id;
  }

  private async waitForTransaction(id: number) {
    let result: unknown;

    try {
      result = await this.relayerService.waitForTransaction(id);
    } catch {
      throw RpcError.RequestTimeout;
    }

    return result;
  }
}
