export class RpcError extends Error {
  static MethodNotFound = new RpcError(-32601, 'Method not found');

  static InvalidParams = new RpcError(-32602, 'Invalid params');

  static InternalError = new RpcError(-32603, 'Internal error');

  static RequestTimeout = new RpcError(-32099, 'Request timeout');

  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}
