import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NetworkModule } from '@app/network';
import { RelayerModule } from '@app/relayer';
import { EntryPointService } from './entry-point.service';
import { entryPointConfig } from './entry-point.config';

@Module({
  imports: [
    ConfigModule.forFeature(entryPointConfig),
    NetworkModule,
    RelayerModule,
  ],
  providers: [EntryPointService],
  exports: [EntryPointService],
})
export class EntryPointModule {
  //
}
