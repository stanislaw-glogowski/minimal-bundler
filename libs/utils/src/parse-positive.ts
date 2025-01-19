export function parsePositive(
  data: string | undefined,
  type: 'float' | 'int',
  defaultValue = 0,
) {
  let result: number | undefined;

  if (data) {
    switch (type) {
      case 'int':
        result = parseInt(data, 10);
        break;

      case 'float':
        result = parseFloat(data);
        break;
    }
  }

  return result > 0 ? result : defaultValue;
}
