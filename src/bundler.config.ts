import { registerAs } from '@nestjs/config';
import { parsePositive } from '@app/utils';

export const bundlerConfig = registerAs('bundler', () => ({
  port: parsePositive(process.env.PORT, 'int', 4000),
}));
