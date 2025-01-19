import { IsArray, IsInt, Equals, IsIn } from 'class-validator';
import { JSON_RPC_METHODS_MAP } from './constants';

export class JsonRpcBody {
  @Equals('2.0')
  jsonrpc: '2.0';

  @IsInt()
  id: number;

  @IsIn([...JSON_RPC_METHODS_MAP.keys()])
  method: string;

  @IsArray()
  params: Array<unknown>;
}
