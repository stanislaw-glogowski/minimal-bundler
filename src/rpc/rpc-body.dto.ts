import { IsArray, IsInt, Equals, IsString } from 'class-validator';

export class RpcBodyDto {
  @Equals('2.0')
  jsonrpc: '2.0';

  @IsInt()
  id: number;

  @IsString()
  method: string;

  @IsArray()
  params: Array<any>;
}
