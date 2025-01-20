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
  private errorHandler: (err: unknown) => boolean | void = () => false;

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

  setErrorHandler(errorHandler: (err: unknown) => boolean | void) {
    this.errorHandler = errorHandler;
    return this;
  }

  catchError(err: unknown) {
    if (!this.errorHandler(err)) {
      this.error(err);
    }
  }

  async wrapAsync<T = unknown>(promise: Promise<T>): Promise<T | null> {
    let result: T | null;

    try {
      result = await promise;
    } catch (err) {
      this.catchError(err);
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
            .catch((err) => this.catchError(err))
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
          this.catchError(err);
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
