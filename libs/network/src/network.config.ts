import { registerAs } from '@nestjs/config';
import { parsePositive } from '@app/utils';
import { NetworkChains } from './interfaces';

export const networkConfig = registerAs('network', () => ({
  chainName: process.env.NETWORK_CHAIN as NetworkChains,
  httpTransportUrl: process.env.NETWORK_HTTP_TRANSPORT_URL || undefined,
  blockInterval: parsePositive(process.env.NETWORK_BLOCK_INTERVAL, 'int', 5),
  retryCount: parsePositive(process.env.NETWORK_RETRY_COUNT, 'int', 5),
  retryDelay: parsePositive(process.env.NETWORK_RETRY_DELAY, 'int', 150),
  timeout: parsePositive(process.env.NETWORK_TIMEOUT, 'int', 15_000),
}));
