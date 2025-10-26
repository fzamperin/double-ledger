import { randomUUID } from 'node:crypto';
import type { Direction } from '../enums/direction-enum';
import type { CreateAccountInput } from '../schemas/account-schema';

export class AccountModel {
  id!: string;
  name!: string;
  balance!: number;
  direction!: Direction;

  /**
   * Create an AccountModel from input data
   */
  static fromInput(input: CreateAccountInput): AccountModel {
    const account = new AccountModel();
    account.id = input.id || randomUUID();
    account.name = input.name || '';
    account.balance = input.balance || 0;
    account.direction = input.direction;
    return account;
  }
}
