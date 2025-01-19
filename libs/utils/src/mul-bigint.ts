export function mulBigint(b: bigint, mul: number, precision = 1000): bigint {
  return (b * BigInt(Math.floor(mul * precision))) / BigInt(precision);
}
