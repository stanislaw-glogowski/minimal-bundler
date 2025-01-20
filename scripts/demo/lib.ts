import { createWalletClient, http } from 'viem';
import { mnemonicToAccount } from 'viem/accounts';
import {
  createSmartAccountClient,
  SupportedSigner,
  BiconomySmartAccountV2,
} from '@biconomy/account';
import { autoId, getChain, parsePositive } from '@app/utils';

export async function callBundler<R = unknown>(
  method: string,
  ...params: unknown[]
) {
  const { PORT } = process.env;

  const id = autoId();

  const response = await fetch(`http://localhost:${PORT}/rpc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      id,
      params,
    }),
  });

  const { result }: { result: R } = await response.json();

  return result;
}

export async function createSmartAccounts() {
  const {
    NETWORK_CHAIN,
    NETWORK_HTTP_TRANSPORT_URL,
    DEMO_EOA_MNEMONIC,
    DEMO_EOA_COUNT,
    DEMO_SCA_BUNDLER_URL,
  } = process.env;

  const result: BiconomySmartAccountV2[] = [];

  const chain = getChain(NETWORK_CHAIN);
  const accountsCount = parsePositive(DEMO_EOA_COUNT, 'int');

  for (let accountIndex = 0; accountIndex < accountsCount; accountIndex++) {
    const account = mnemonicToAccount(DEMO_EOA_MNEMONIC, {
      accountIndex,
    });

    const client = createWalletClient({
      account,
      chain,
      transport: http(NETWORK_HTTP_TRANSPORT_URL),
    });

    const smartAccount = await createSmartAccountClient({
      signer: client as SupportedSigner,
      bundlerUrl: DEMO_SCA_BUNDLER_URL,
    });

    result.push(smartAccount);
  }

  return result;
}
