import { Controller, Get } from '@nestjs/common';
import { RelayerService } from '@app/relayer';

@Controller()
export class BundlerController {
  constructor(private readonly relayerService: RelayerService) {
    //
  }

  @Get()
  index() {
    return {
      name: 'bundler',
      version: '0.0.0',
    };
  }

  @Get('relayer')
  relayer() {
    return {
      accounts: this.relayerService.getFormattedAccounts(),
    };
  }
}
