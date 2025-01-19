import { Controller, Get } from '@nestjs/common';
import { RelayerService } from '@app/relayer';

@Controller()
export class ApiController {
  constructor(private readonly relayerService: RelayerService) {
    //
  }

  @Get()
  index() {
    return {
      name: 'bundler',
      version: '0.0.0',
      relayer: {
        accounts: this.relayerService.getFormattedAccounts(),
      },
    };
  }
}
