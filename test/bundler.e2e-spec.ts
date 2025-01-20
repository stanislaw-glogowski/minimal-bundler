import { config } from 'dotenv-pre';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { NetworkModule } from '@app/network';
import { BundlerModule } from '../src/bundler.module';

config({
  name: 'test',
});

describe('BundlerController (e2e)', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [BundlerModule, NetworkModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/ (GET)', () => {
    it('should successfully execute the endpoint and return valid name and version fields in the response', async () => {
      return app
        .inject({
          method: 'GET',
          url: '/',
        })
        .then((res) => {
          expect(res.statusCode).toEqual(200);

          const body = res.json<{
            name: unknown;
            version: unknown;
          }>();

          expect(body?.name).toEqual('bundler');
          expect(body?.version).toEqual('0.0.0');
        });
    });
  });
});
