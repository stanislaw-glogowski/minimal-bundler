import { Chain } from 'viem';
import * as chains from 'viem/chains';

/**
 * Retrieves a chain object by its name.
 *
 * @param {string} name - The name of the chain to retrieve.
 * @return {Chain | undefined} The Chain object if found and valid, otherwise undefined.
 */
export function getChain(name: string): Chain | undefined {
  const chain: Chain | undefined = chains[name];

  if (chain && typeof chain.id === 'number' && chain.rpcUrls) {
    return chain;
  }
}
