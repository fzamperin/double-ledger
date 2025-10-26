import { randomUUID } from 'node:crypto';
import type { Direction } from '../enums/direction-enum';
import type { CreateTransactionInput } from '../schemas/transaction-schema';

export class TransactionModel {
  id!: string;
  name!: string;
  date!: Date;
  entries!: TransactionEntryModel[];

  /**
   * Create a TransactionModel from input data
   */
  static fromInput(input: CreateTransactionInput): TransactionModel {
    const transaction = new TransactionModel();
    transaction.id = input.id || randomUUID();
    transaction.name = input.name || '';
    transaction.date = new Date();
    transaction.entries = input.entries.map((e) =>
      TransactionEntryModel.fromInput(e, transaction.id),
    );
    return transaction;
  }
}

export class TransactionEntryModel {
  id!: string;
  transactionId!: string;
  accountId!: string;
  amount!: number;
  direction!: Direction;

  /**
   * Create a TransactionEntryModel from input data
   */
  static fromInput(
    input: {
      id?: string;
      account_id: string;
      amount: number;
      direction: Direction;
    },
    transactionId: string,
  ): TransactionEntryModel {
    const entry = new TransactionEntryModel();
    entry.id = input.id || randomUUID();
    entry.transactionId = transactionId;
    entry.accountId = input.account_id;
    entry.amount = input.amount;
    entry.direction = input.direction;
    return entry;
  }
}
