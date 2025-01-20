const AUTO_ID_CONTEXT = new Map<string, number>();

/**
 * Generates a unique sequential ID within a specified context.
 *
 * @param {string} [context='global'] - The context in which the ID generation is scoped. Defaults to 'global'.
 * @return {number} The next sequential ID for the specified context.
 */
export function autoId(context: 'global' | string = 'global'): number {
  let result = AUTO_ID_CONTEXT.get(context) || 0;

  AUTO_ID_CONTEXT.set(context, ++result);

  return result;
}
