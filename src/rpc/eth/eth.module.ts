import { Module } from '@nestjs/common';
import { EntryPointModule } from '@app/entry-point';
import { NetworkModule } from '@app/network';
import { RelayerModule } from '@app/relayer';
import { EthService } from './eth.service';

@Module({
  imports: [EntryPointModule, NetworkModule, RelayerModule],
  providers: [EthService],
  exports: [EthService],
})
export class EthModule {
  //
}
