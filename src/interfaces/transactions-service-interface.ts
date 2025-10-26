import type { TransactionModel } from '../models/transaction-model';
import type {
  CreateTransactionInput,
  TransactionResponse,
} from '../schemas/transaction-schema';

export interface ITransactionsService {
  createTransaction(
    transactionInput: CreateTransactionInput,
  ): TransactionResponse;
  getTransaction(id: string, includeEntries?: boolean): TransactionModel | null;
  getAllTransactions(): TransactionModel[];
}
