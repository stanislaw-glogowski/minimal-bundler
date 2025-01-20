import { Chain } from 'viem';
import * as chains from 'viem/chains';

export function getChain(name: string): Chain | undefined {
  const chain: Chain | undefined = chains[name];

  if (chain && typeof chain.id === 'number' && chain.rpcUrls) {
    return chain;
  }
}
