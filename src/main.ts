import 'dotenv-pre/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigType } from '@nestjs/config';
import { Logger } from '@app/logger';
import { BundlerModule } from './bundler.module';
import { bundlerConfig } from './bundler.config';

async function main() {
  const app = await NestFactory.create<NestFastifyApplication>(
    BundlerModule,
    new FastifyAdapter(),
    {
      bufferLogs: true,
    },
  );

  const logger = await app.resolve(Logger);

  app.useLogger(logger);

  app.useGlobalPipes(new ValidationPipe());

  try {
    const { port } = app.get<ConfigType<typeof bundlerConfig>>(
      bundlerConfig.KEY,
    );

    await app.listen(port, '0.0.0.0', (err, address) => {
      if (err) {
        logger.error(err);
        return;
      }

      logger.log(`Server running at ${address}`, 'ApiModule');
    });
  } catch (err) {
    logger.error(err);
  }
}

main().catch(console.error);
