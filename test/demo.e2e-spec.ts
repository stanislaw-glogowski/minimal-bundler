import { config } from 'dotenv-pre';
import { createWalletClient, Hex, http, parseEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { Test, TestingModule } from '@nestjs/testing';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { createSmartAccountClient, SupportedSigner } from '@biconomy/account';
import { NetworkService, NetworkModule } from '@app/network';
import { ApiModule } from '../src/api.module';

// Load environment configuration for the 'test' environment to set required environment variables
config({
  name: 'test',
});

const {
  DEMO_EOA_PRIVATE_KEY,
  DEMO_BUNDLER_URL,
  DEMO_TX_RECIPIENT,
  DEMO_TX_VALUE,
} = process.env;

describe('Demo', () => {
  let app: NestFastifyApplication;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ApiModule, NetworkModule],
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

  describe("Test suite for the 'debug_sendUserOperation' JSON RPC method", () => {
    let userOp: unknown; // signed UserOP

    beforeEach(async () => {
      const {
        client: { chain, transport },
      } = await app.resolve(NetworkService);

      const account = privateKeyToAccount(DEMO_EOA_PRIVATE_KEY as Hex);

      const client = createWalletClient({
        account,
        chain,
        transport: http(transport.url),
      });

      const sca = await createSmartAccountClient({
        signer: client as SupportedSigner,
        bundlerUrl: DEMO_BUNDLER_URL,
      });

      userOp = await sca.signUserOp(
        await sca.buildUserOp([
          {
            to: DEMO_TX_RECIPIENT,
            value: parseEther(DEMO_TX_VALUE),
          },
        ]),
      );
    });

    it(
      'should send signed userOp successfully',
      async () => {
        return app
          .inject({
            method: 'POST',
            url: '/json-rpc',
            payload: {
              jsonrpc: '2.0',
              method: 'debug_sendUserOperation',
              params: [userOp],
              id: 1,
            },
          })
          .then((res) => {
            expect(res.statusCode).toEqual(201);

            const { result } = res.json<{
              result: { tx: unknown; txReceipt: unknown }; // expect to retrieve transaction details and receipt
            }>();

            expect(result?.tx).toBeDefined();
            expect(result?.txReceipt).toBeDefined();
          });
      },
      60 * 1000,
    );
  });
});
