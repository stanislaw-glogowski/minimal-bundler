const AUTO_ID_CONTEXT = new Map<string, number>();

export function autoId(context: 'global' | string = 'global') {
  let result = AUTO_ID_CONTEXT.get(context) || 0;

  AUTO_ID_CONTEXT.set(context, ++result);

  return result;
}
