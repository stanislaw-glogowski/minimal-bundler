import {
  ConsoleLogger,
  Inject,
  Injectable,
  Optional,
  Scope,
  LogLevel,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { loggerConfig } from './logger.config';

@Injectable({
  scope: Scope.TRANSIENT,
})
export class Logger extends ConsoleLogger {
  constructor(
    @Inject(loggerConfig.KEY)
    config: ConfigType<typeof loggerConfig>,
    @Optional()
    context?: string,
  ) {
    super(context);

    const { logLevel } = config;

    this.setLogLevels([logLevel]);
  }

  async wrapAsync<T = unknown>(promise: Promise<T>): Promise<T | null> {
    let result: T | null;

    try {
      result = await promise;
    } catch (err) {
      this.error(err);
      result = null;
    }

    return result;
  }

  lockAsync(func: () => Promise<unknown>) {
    let locked = false;
    let repeat = false;

    const result = () => {
      if (locked) {
        repeat = true;
      } else {
        locked = true;

        try {
          func()
            .catch((err) => this.error(err))
            .finally(() => {
              locked = false;
              if (repeat) {
                repeat = false;

                process.nextTick(() => result());
              }
            });
        } catch (err) {
          locked = false;
          repeat = false;
          this.error(err);
        }
      }
    };

    return result;
  }

  protected printMessages(
    messages: unknown[],
    context?: string,
    logLevel?: LogLevel,
    writeStreamType?: 'stdout' | 'stderr',
  ) {
    if (this.context && this.context !== context) {
      context = `${this.context}#${context}`;
    }

    super.printMessages(messages, context, logLevel, writeStreamType);
  }
}
