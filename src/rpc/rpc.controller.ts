import {
  Controller,
  Post,
  Body,
  Inject,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { DebugService } from './debug';
import { EthService } from './eth';
import { RpcBodyDto } from './rpc-body.dto';
import { rpcConfig } from './rpc.config';
import { RpcError } from './rpc.error';

@Controller('rpc')
@UsePipes(ValidationPipe)
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
    let error: RpcError;

    try {
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
            error = RpcError.MethodNotFound;
          } else {
            switch (method) {
              case 'debug_hashUserOperation':
                result = this.debugService.hashUserOp(...params);
                break;

              case 'debug_sendUserOperation':
                result = await this.debugService.sendUserOp(...params);
                break;

              case 'debug_sendTransaction':
                result = await this.debugService.sendTransaction(...params);
                break;

              default:
                error = RpcError.MethodNotFound;
            }
          }
        }
      }
    } catch (err) {
      if (err instanceof RpcError) {
        error = err;
      } else {
        error = RpcError.InternalError;
      }
    }

    return {
      jsonrpc,
      id,
      result,
      error,
    };
  }
}
