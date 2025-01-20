import { parseEther } from 'viem';
import { parseAddress } from '@app/utils';
import { callBundler, createSmartAccounts } from './lib';

export async function main() {
  const { DEMO_EOA_MIN_BALANCE, DEMO_TX_RECIPIENT, DEMO_TX_VALUE } =
    process.env;

  console.log('`eth_chainId`:', await callBundler('eth_chainId'));
  console.log(
    '`eth_supportedEntryPoints`:',
    await callBundler('eth_supportedEntryPoints'),
  );

  const accounts = await createSmartAccounts();

  const tx = {
    to: parseAddress(DEMO_TX_RECIPIENT),
    value: parseEther(DEMO_TX_VALUE || '0'),
  };

  const accountMinBalance = parseEther(DEMO_EOA_MIN_BALANCE || '0.005');

  for (const account of accounts) {
    console.log();
    const address = await account.getAccountAddress();
    const balance = await account.getBalances();

    if (balance?.at(0)?.amount < accountMinBalance) {
      console.log('# Not enough balance in SCA:', address);
      continue;
    }

    console.log('# Sending UserOperation from SCA:', address);

    const userOp = await account.buildUserOp([tx]);
    const signedUserOp = await account.signUserOp(userOp);

    console.log(
      '`debug_hashUserOperation`:',
      await callBundler('debug_hashUserOperation', signedUserOp),
    );

    console.log(
      '`debug_sendUserOperation`:',
      await callBundler('debug_sendUserOperation', signedUserOp),
    );
  }
}
