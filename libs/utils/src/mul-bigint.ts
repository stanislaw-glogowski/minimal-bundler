/**
 * Multiplies a given bigint by a floating-point multiplier with specified precision.
 *
 * @param {bigint} b - The bigint value to be multiplied.
 * @param {number} mul - The multiplier, specified as a floating-point number.
 * @param {number} [precision=1000] - The precision factor to ensure accuracy during the multiplication process. Defaults to 1000.
 * @return {bigint} The result of multiplying the bigint by the multiplier, adjusted for the specified precision.
 */
export function mulBigint(
  b: bigint,
  mul: number,
  precision: number = 1000,
): bigint {
  return (b * BigInt(Math.floor(mul * precision))) / BigInt(precision);
}
