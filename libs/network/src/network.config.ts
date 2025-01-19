import { registerAs } from '@nestjs/config';
import { parsePositive } from '@app/utils';
import { NetworkChains } from './interfaces';

export const networkConfig = registerAs('network', () => ({
  chain: process.env.NETWORK_CHAIN as NetworkChains,
  httpTransportUrl: process.env.NETWORK_HTTP_TRANSPORT_URL || undefined,
  blockInterval: parsePositive(process.env.NETWORK_BLOCK_INTERVAL, 'int', 3),
}));
