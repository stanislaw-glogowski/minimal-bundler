import './patches';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/logger';
import { RelayerModule } from '@app/relayer';
import { RpcModule } from './rpc';
import { BundlerController } from './bundler.controller';
import { bundlerConfig } from './bundler.config';

@Module({
  imports: [
    ConfigModule.forFeature(bundlerConfig),
    LoggerModule,
    RelayerModule,
    RpcModule,
  ],
  controllers: [BundlerController],
})
export class BundlerModule {
  //
}
