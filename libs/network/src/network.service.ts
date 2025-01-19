import { EventEmitter } from 'events';
import { setInterval, clearInterval } from 'timers';
import {
  Chain,
  EstimateGasParameters,
  GetBalanceParameters,
  GetTransactionCountParameters,
  GetTransactionParameters,
  GetTransactionReceiptParameters,
  HttpTransport,
  ParseAccount,
  PublicClient,
  SendRawTransactionParameters,
  createPublicClient,
  http,
} from 'viem';
import { sepolia, hardhat } from 'viem/chains';
import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Logger } from '@app/logger';
import { networkConfig } from './network.config';

@Injectable()
export class NetworkService implements OnModuleInit, OnModuleDestroy {
  public readonly client: PublicClient<
    HttpTransport,
    Chain,
    ParseAccount<undefined>
  >;

  private readonly eventEmitter = new EventEmitter<{
    newBlock: [bigint];
  }>();

  private blockNumber = 0n;
  private interval: NodeJS.Timeout;

  constructor(
    @Inject(networkConfig.KEY)
    private readonly config: ConfigType<typeof networkConfig>,
    private readonly logger: Logger,
  ) {
    logger.setContext(NetworkService.name);

    let chain: Chain;

    switch (config?.chain) {
      case 'sepolia':
        chain = sepolia;
        break;

      case 'hardhat':
        chain = hardhat;
        break;

      default:
        throw new Error('Unsupported network chain');
    }

    this.client = createPublicClient<HttpTransport, Chain>({
      chain,
      transport: http(config?.httpTransportUrl),
    });
  }

  async onModuleInit() {
    // initial fetch
    await this.fetchBlockNumber();

    // start fetch in interval
    const { blockInterval } = this.config;

    const fetchBlockNumber = this.logger.lockAsync(
      this.fetchBlockNumber.bind(this),
    );

    this.interval = setInterval(fetchBlockNumber, blockInterval * 1000);
  }

  onModuleDestroy() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    this.eventEmitter.removeAllListeners();
  }

  on(event: 'newBlock', listener: (blockNumber: bigint) => void) {
    this.eventEmitter.on(event, listener);
    return this;
  }

  get chainId() {
    return this.client.chain.id;
  }

  getBlockNumber() {
    return this.client.getBlockNumber();
  }

  getGasPrice() {
    return this.logger.wrapAsync(this.client.getGasPrice());
  }

  getBalance(params: Pick<GetBalanceParameters, 'address'>) {
    return this.logger.wrapAsync(this.client.getBalance(params));
  }

  getTransactionCount(params: Pick<GetTransactionCountParameters, 'address'>) {
    return this.logger.wrapAsync(this.client.getTransactionCount(params));
  }

  getTransaction(params: Required<Pick<GetTransactionParameters, 'hash'>>) {
    return this.logger.wrapAsync(this.client.getTransaction(params));
  }

  getTransactionReceipt(
    params: Required<Pick<GetTransactionReceiptParameters, 'hash'>>,
  ) {
    return this.logger.wrapAsync(this.client.getTransactionReceipt(params));
  }

  async sendRawTransaction(params: SendRawTransactionParameters) {
    return this.logger.wrapAsync(this.client.sendRawTransaction(params));
  }

  async estimateTransactionGas(
    params: Pick<EstimateGasParameters, 'to' | 'data'>,
  ) {
    return this.client.estimateGas({
      ...params,
    });
  }

  private async fetchBlockNumber() {
    const blockNumber = await this.getBlockNumber();

    if (blockNumber > this.blockNumber) {
      this.logger.verbose(`New block detected: ${blockNumber}`);

      this.eventEmitter.emit('newBlock', blockNumber);
      this.blockNumber = blockNumber;
    }
  }
}
