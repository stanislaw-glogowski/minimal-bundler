import { sepolia, hardhat } from 'viem/chains';
import { getChain } from './get-chain';

describe('getChain()', () => {
  it('should return the correct chain when a valid chain name is provided', () => {
    expect(getChain('sepolia')).toEqual(sepolia);
    expect(getChain('hardhat')).toEqual(hardhat);
  });

  it('should return undefined when an invalid chain name is provided', () => {
    expect(getChain('unknown_chain')).toBeUndefined();
  });
});
