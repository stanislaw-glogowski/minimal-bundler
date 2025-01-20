export function parseFlag(data: string | undefined, defaultValue = false) {
  let result: boolean | undefined;

  if (data) {
    switch (data.charAt(0).toUpperCase()) {
      case 'Y':
      case 't':
      case '1':
        result = true;
        break;

      default:
        result = false;
    }
  }

  return typeof result === 'undefined' ? defaultValue : result;
}
