import { LogLevel } from '@nestjs/common';

export function parseLogLevel(
  logLevel: string | undefined,
  defaultLogLevel: LogLevel = 'debug',
) {
  return ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'].includes(
    logLevel,
  )
    ? (logLevel as LogLevel)
    : defaultLogLevel;
}
