import { toHex } from 'viem';

interface BigIntPrototype {
  toJSON?: () => string;
}

const BigIntPrototype = BigInt.prototype as BigIntPrototype;

if (BigIntPrototype.toJSON === undefined) {
  BigIntPrototype.toJSON = function (this: bigint) {
    return toHex(this);
  };
}
