import { Controller, Post, Body, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { DebugService } from './debug';
import { EthService } from './eth';
import { RpcBodyDto } from './rpc-body.dto';
import { rpcConfig } from './rpc.config';

@Controller('rpc')
export class RpcController {
  constructor(
    @Inject(rpcConfig.KEY)
    private readonly config: ConfigType<typeof rpcConfig>,
    private readonly debugService: DebugService,
    private readonly ethService: EthService,
  ) {
    //
  }

  @Post()
  async rpc(@Body() body: RpcBodyDto) {
    const { jsonrpc, id, method, params } = body;

    let result: unknown | undefined = undefined;

    switch (method) {
      case 'eth_chainId':
        result = this.ethService.getChainId();
        break;

      case 'eth_supportedEntryPoints':
        result = this.ethService.getSupportedEntryPointAddresses();
        break;

      case 'eth_sendUserOperation':
        result = this.ethService.sendUserOperation(...params);
        break;

      default: {
        const { debug } = this.config;

        if (!debug) {
          // not found
        }

        switch (method) {
          case 'debug_hashUserOperation':
            result = await this.debugService.hashUserOp(...params);
            break;

          case 'debug_sendUserOperation':
            result = await this.debugService.sendUserOp(...params);
            break;

          case 'debug_sendTransaction':
            result = await this.debugService.sendTransaction(...params);
            break;

          default:
          // not found
        }
      }
    }

    return {
      jsonrpc,
      id,
      result,
    };
  }
}
