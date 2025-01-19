import { registerAs } from '@nestjs/config';
import { parseAddress } from '@app/utils';

export const entryPointConfig = registerAs('entry-point', () => ({
  address: parseAddress(process.env.ENTRY_POINT_ADDRESS),
}));
