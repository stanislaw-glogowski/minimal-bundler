import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EntryPointModule } from '@app/entry-point';
import { LoggerModule } from '@app/logger';
import { NetworkModule } from '@app/network';
import { RelayerService } from './relayer.service';
import { relayerConfig } from './relayer.config';

@Module({
  imports: [
    ConfigModule.forFeature(relayerConfig),
    EntryPointModule,
    LoggerModule,
    NetworkModule,
  ],
  providers: [RelayerService],
  exports: [RelayerService],
})
export class RelayerModule {
  //
}
