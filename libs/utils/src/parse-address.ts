import { getAddress, Hash } from 'viem';

export function parseAddress(data: string | undefined): Hash | undefined {
  return data ? getAddress(data.trim()) : undefined;
}
