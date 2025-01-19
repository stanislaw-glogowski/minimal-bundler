import { JSON_RPC_METHODS_MAP } from '../constants';

export function JsonRpcMethod(methodName: string): MethodDecorator {
  return function (_target: object, propertyKey: string): void {
    JSON_RPC_METHODS_MAP.set(methodName, {
      propertyKey,
    });
  };
}
