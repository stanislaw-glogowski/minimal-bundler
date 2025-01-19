import { registerAs } from '@nestjs/config';
import { parseLogLevel } from './utils';

export const loggerConfig = registerAs('logger', () => ({
  logLevel: parseLogLevel(process.env.LOGGER_LOG_LEVEL, 'debug'),
}));
