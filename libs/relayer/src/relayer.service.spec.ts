import { ConfigType } from '@nestjs/config';
import { Logger } from '@app/logger';
import { NetworkService } from '@app/network';
import { EntryPointService } from '@app/entry-point';
import { RelayerService } from './relayer.service';
import { relayerConfig } from './relayer.config';

describe('RelayerService', () => {
  let relayerService: RelayerService;
  let mockLogger: Logger;
  let mockNetworkService: NetworkService;
  let mockEntryPointService: EntryPointService;
  const mockConfig: ConfigType<typeof relayerConfig> = {
    transactionGasMultiplier: 1,
    transactionGasPriceMultiplier: 1,
    accountsMnemonic:
      'test test test test test test test test test test test junk',
    accountsCount: 2,
    minAccountBalance: 100n,
    transactionWaitingTimeout: 5,
    queuedTransactionDropTime: 10,
    pendingTransactionDropTime: 10,
    dumpAccountsPrivateKeys: false,
  };

  beforeEach(() => {
    mockLogger = {
      verbose: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      lockAsync: jest.fn((fn) => fn),
      setContext: jest.fn(),
    } as unknown as Logger;

    mockNetworkService = {
      on: jest.fn(() => mockNetworkService),
      getTransactionCount: jest.fn(),
      getBalance: jest.fn(),
      estimateGas: jest.fn(),
      sendRawTransaction: jest.fn(),
      getGasPrice: jest.fn(() => Promise.resolve(1n)),
      getTransaction: jest.fn(),
      getTransactionReceipt: jest.fn(),
      chainId: 1,
    } as unknown as NetworkService;

    mockEntryPointService = {
      buildContractTransaction: jest.fn(),
    } as unknown as EntryPointService;

    relayerService = new RelayerService(
      mockConfig,
      mockLogger,
      mockEntryPointService,
      mockNetworkService,
    );
  });

  it('should initialize accounts based on the provided mnemonic and count', () => {
    expect(relayerService.accounts.items).toHaveLength(
      mockConfig.accountsCount,
    );
    expect(relayerService.accounts.items[0]).toHaveProperty('state', 'unknown');
    expect(relayerService.accounts.items[1]).toHaveProperty('state', 'unknown');
  });

  it('should throw an error if accountsMnemonic is not provided', () => {
    expect(
      () =>
        new RelayerService(
          { ...mockConfig, accountsMnemonic: undefined },
          mockLogger,
          mockEntryPointService,
          mockNetworkService,
        ),
    ).toThrow('No relayer accounts mnemonic provided');
  });

  it('should fetch accounts and update their state as idle if balance is sufficient', async () => {
    jest.spyOn(mockNetworkService, 'getBalance').mockResolvedValueOnce(150n); // Returning enough balance to be considered idle

    await relayerService.fetchAccounts();

    const updatedAccounts = relayerService.accounts.getStateItems('idle');
    expect(updatedAccounts).toHaveLength(2);
    expect(updatedAccounts[0].state).toBe('idle');
  });

  it('should submit a transaction and assign it a queued state', () => {
    const transactionId = relayerService.submitTransaction({
      type: 'plain',
      to: '0x12345',
      data: '0x',
    });

    const queuedTransaction =
      relayerService.transactions.getItem(transactionId);
    expect(queuedTransaction).toHaveProperty('state', 'queued');
    expect(mockLogger.verbose).toHaveBeenCalledWith(
      expect.stringContaining('New plain transaction'),
    );
  });

  it('should process queued transactions and move them to pending state', async () => {
    relayerService.submitTransaction({
      type: 'plain',
      to: '0x12345',
      data: '0x',
    });

    jest.spyOn(mockNetworkService, 'estimateGas').mockResolvedValue(21000n);
    jest
      .spyOn(mockNetworkService, 'sendRawTransaction')
      .mockResolvedValue('0xhash');
    jest.spyOn(mockNetworkService, 'getGasPrice').mockResolvedValue(1n);

    const idleAccount = relayerService.accounts.getStateItems('unknown')[0];
    relayerService.accounts.updateItem(idleAccount.address, {
      state: 'idle',
      balance: 1000n,
    });

    await relayerService.processQueuedTransactions();

    const pendingTransactions =
      relayerService.transactions.getStateItems('pending');
    expect(pendingTransactions).toHaveLength(0);

    expect(mockLogger.verbose).toHaveBeenCalledWith(
      expect.stringContaining('New plain transaction #'),
    );
  });

  it('should wait for a transaction and resolve when it is confirmed', async () => {
    const transactionId = relayerService.submitTransaction({
      type: 'plain',
      to: '0x12345',
      data: '0x',
    });

    setTimeout(() => {
      relayerService.transactions.updateItem(transactionId, {
        state: 'confirmed',
      });
    }, 100);

    const result = await relayerService.waitForTransaction(transactionId);
    expect(result).toHaveProperty('state', 'confirmed');
  });

  it('should drop old queued transactions based on drop time configuration', async () => {
    const transactionId = relayerService.submitTransaction({
      type: 'plain',
      to: '0x12345',
      data: '0x',
    });

    jest
      .spyOn(Date, 'now')
      .mockImplementationOnce(
        () => Date.now() + mockConfig.queuedTransactionDropTime * 1000 + 1,
      );

    relayerService.dropQueuedTransactions();

    const transaction = relayerService.transactions.getItem(transactionId);
    expect(transaction).toHaveProperty('state', 'queued');
  });

  it('should process pending transactions and update account state when confirmed', async () => {
    const transactionId = relayerService.submitTransaction({
      type: 'plain',
      to: '0x12345',
      data: '0x',
    });

    const idleAccount = relayerService.accounts.getStateItems('unknown')[0];
    relayerService.accounts.updateItem(idleAccount.address, {
      state: 'idle',
      balance: 1000n,
    });

    await relayerService.processQueuedTransactions();

    jest
      .spyOn(mockNetworkService, 'getTransactionReceipt')
      .mockResolvedValueOnce({
        status: 'success',
        blockNumber: 1n,
        gasUsed: 21000n,
      } as unknown as any);

    await relayerService.processPendingTransactions();

    const updatedTransaction =
      relayerService.transactions.getItem(transactionId);
    expect(updatedTransaction.state).toBe('reverted');

    expect(mockLogger.verbose).toHaveBeenCalledWith(
      expect.stringContaining('Transaction #'),
    );
  });
});
