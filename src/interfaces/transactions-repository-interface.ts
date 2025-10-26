import type { TransactionModel } from '../models/transaction-model';

export interface ITransactionsRepository {
  createWithBalanceUpdates(
    transaction: TransactionModel,
    balanceUpdates: Array<{ id: string; balance: number }>,
  ): TransactionModel;
  findById(id: string, includeEntries?: boolean): TransactionModel | null;
  findAll(): TransactionModel[];
}
