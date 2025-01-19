import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@app/logger';
import { NetworkModule } from '@app/network';
import { RelayerModule } from '@app/relayer';
import { TransactionService } from './transaction.service';
import { transactionConfig } from './transaction.config';

@Module({
  imports: [
    ConfigModule.forFeature(transactionConfig),
    LoggerModule,
    NetworkModule,
    RelayerModule,
  ],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {
  //
}
