import { registerAs } from '@nestjs/config';
import { parseFlag } from '@app/utils';

export const rpcConfig = registerAs('rpc', () => ({
  debug: parseFlag(process.env.RPC_DEBUG),
}));
