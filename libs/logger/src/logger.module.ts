import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Logger } from './logger';
import { loggerConfig } from './logger.config';

@Module({
  imports: [ConfigModule.forFeature(loggerConfig)],
  providers: [Logger],
  exports: [Logger],
})
export class LoggerModule {
  //
}
