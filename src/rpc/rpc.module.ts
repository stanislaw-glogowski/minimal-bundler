import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DebugModule } from './debug';
import { EthModule } from './eth';
import { RpcController } from './rpc.controller';
import { rpcConfig } from './rpc.config';

@Module({
  imports: [ConfigModule.forFeature(rpcConfig), DebugModule, EthModule],
  controllers: [RpcController],
})
export class RpcModule {
  //
}
