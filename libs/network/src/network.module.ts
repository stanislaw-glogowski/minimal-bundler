import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/logger';
import { NetworkService } from './network.service';
import { networkConfig } from './network.config';

@Module({
  imports: [ConfigModule.forFeature(networkConfig), LoggerModule],
  providers: [NetworkService],
  exports: [NetworkService],
})
export class NetworkModule {
  //
}
