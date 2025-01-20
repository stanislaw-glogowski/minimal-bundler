import { Module } from '@nestjs/common';
import { EntryPointModule } from '@app/entry-point';
import { RelayerModule } from '@app/relayer';
import { DebugService } from './debug.service';

@Module({
  imports: [EntryPointModule, RelayerModule],
  providers: [DebugService],
  exports: [DebugService],
})
export class DebugModule {
  //
}
