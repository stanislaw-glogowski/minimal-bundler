import { Controller, Post, Inject, Body } from '@nestjs/common';
import { JsonRpcMethods } from './json-rpc.methods';
import { JsonRpcBody } from './json-rpc.body';
import { JSON_RPC_METHODS_MAP } from './constants';

@Controller('json-rpc')
export class JsonRpcController {
  constructor(
    @Inject(JsonRpcMethods)
    private readonly methods: Record<
      string,
      (...params: Array<unknown>) => unknown
    >,
  ) {
    //
  }

  @Post()
  async rpc(@Body() body: JsonRpcBody) {
    let result: unknown = null;

    const { jsonrpc, id, method, params } = body;

    const methodOptions = JSON_RPC_METHODS_MAP.get(method);

    if (methodOptions) {
      const { propertyKey } = methodOptions;

      if (typeof this.methods[propertyKey] === 'function') {
        const output: unknown = this.methods[propertyKey](...params);

        if (output instanceof Promise) {
          result = await output;
        } else {
          result = output;
        }
      }
    }

    return {
      jsonrpc,
      id,
      result,
    };
  }
}
