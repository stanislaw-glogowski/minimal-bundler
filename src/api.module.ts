import './patches';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/logger';
import { RelayerModule } from '@app/relayer';
import { JsonRpcModule } from './json-rpc';
import { ApiController } from './api.controller';
import { apiConfig } from './api.config';

@Module({
  imports: [
    ConfigModule.forFeature(apiConfig),
    LoggerModule,
    RelayerModule,
    JsonRpcModule,
  ],
  controllers: [ApiController],
})
export class ApiModule {
  //
}
