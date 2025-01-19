import { registerAs } from '@nestjs/config';
import { parsePositive } from '@app/utils';

export const transactionConfig = registerAs('transaction', () => ({
  dropTime: parsePositive(process.env.TRANSACTION_DROP_TIME, 'int', 30),
  gasMultiplier: parsePositive(
    process.env.TRANSACTION_GAS_MULTIPLIER,
    'float',
    1.1,
  ),
  gasPriceMultiplier: parsePositive(
    process.env.TRANSACTION_GAS_PRICE_MULTIPLIER,
    'float',
    1.1,
  ),
}));
