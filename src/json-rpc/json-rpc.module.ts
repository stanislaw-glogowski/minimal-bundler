import { Module } from '@nestjs/common';
import { EntryPointModule } from '@app/entry-point';
import { NetworkModule } from '@app/network';
import { TransactionModule } from '@app/transaction';
import { JsonRpcController } from './json-rpc.controller';
import { JsonRpcMethods } from './json-rpc.methods';

@Module({
  imports: [EntryPointModule, NetworkModule, TransactionModule],
  controllers: [JsonRpcController],
  providers: [JsonRpcMethods],
})
export class JsonRpcModule {
  //
}
