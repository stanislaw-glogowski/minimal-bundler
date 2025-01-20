import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NetworkModule } from '@app/network';
import { EntryPointService } from './entry-point.service';
import { entryPointConfig } from './entry-point.config';

@Module({
  imports: [ConfigModule.forFeature(entryPointConfig), NetworkModule],
  providers: [EntryPointService],
  exports: [EntryPointService],
})
export class EntryPointModule {
  //
}
