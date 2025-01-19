import { registerAs } from '@nestjs/config';
import { parsePositive } from '@app/utils';

export const apiConfig = registerAs('bundler', () => ({
  port: parsePositive(process.env.PORT, 'int', 4000),
}));
