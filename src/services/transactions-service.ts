import { inject, injectable } from 'inversify';
import type {
  CreateTransactionInput,
  TransactionEntryInput,
  TransactionResponse,
} from '../schemas/transaction-schema';
import type { ITransactionsService } from '../interfaces/transactions-service-interface';
import type { IAccountsService } from '../interfaces/accounts-service-interface';
import type { ITransactionsRepository } from '../interfaces/transactions-repository-interface';
import { TYPES } from '../infra/container/di-types';
import { Direction } from '../enums/direction-enum';
import { TransactionModel } from '../models/transaction-model';

@injectable()
export class TransactionsService implements ITransactionsService {
  constructor(
    @inject(TYPES.TransactionsRepository)
    private transactionsRepository: ITransactionsRepository,
    @inject(TYPES.AccountsService) private accountsService: IAccountsService,
  ) {}

  /**
   * Create a new transaction with entries
   */
  createTransaction(
    transactionInput: CreateTransactionInput,
  ): TransactionResponse {
    // Validate entries balance
    this.validateEntriesBalance(transactionInput.entries);

    // Fetch and validate all accounts exist, and calculate balance changes
    const balanceUpdates = this.calculateBalanceUpdates(
      transactionInput.entries,
    );

    // Create transaction model using factory method
    const transaction = TransactionModel.fromInput(transactionInput);

    // Save transaction and update balances atomically
    const savedTransaction =
      this.transactionsRepository.createWithBalanceUpdates(
        transaction,
        balanceUpdates,
      );

    // Format response
    return {
      id: savedTransaction.id,
      name: savedTransaction.name,
      entries: savedTransaction.entries.map((e) => ({
        id: e.id,
        account_id: e.accountId,
        amount: e.amount,
        direction: e.direction,
      })),
    };
  }

  /**
   * Get transaction by ID
   */
  getTransaction(id: string): TransactionModel | null {
    return this.transactionsRepository.findById(id);
  }

  /**
   * Get all transactions
   */
  getAllTransactions(): TransactionModel[] {
    return this.transactionsRepository.findAll();
  }

  /**
   * Validate that entries balance (sum of debits = sum of credits)
   */
  private validateEntriesBalance(entries: TransactionEntryInput[]): void {
    let debitTotal = 0;
    let creditTotal = 0;

    for (const entry of entries) {
      if (entry.direction === Direction.DEBIT) {
        debitTotal += entry.amount;
      } else if (entry.direction === Direction.CREDIT) {
        creditTotal += entry.amount;
      }
    }

    // Check if debits equal credits
    if (Math.abs(debitTotal - creditTotal) > 0.001) {
      // Allow for floating point precision
      throw new Error(
        `Transaction entries must balance. Debits: ${debitTotal}, Credits: ${creditTotal}`,
      );
    }
  }

  /**
   * Calculate balance updates for all affected accounts
   *
   * Rule: When an entry is applied to an account:
   * - If the entry direction matches the account direction, add the amount
   * - If the entry direction differs from the account direction, subtract the amount
   *
   * @returns Array of balance updates to be applied atomically
   */
  private calculateBalanceUpdates(
    entries: TransactionEntryInput[],
  ): Array<{ id: string; balance: number }> {
    const balanceMap = new Map<string, number>();

    for (const entry of entries) {
      // We can improve this by getting all accounts at once and then iterating over them
      const account = this.accountsService.getAccount(entry.account_id);
      if (!account) {
        throw new Error(`Account with id ${entry.account_id} not found`);
      }

      // Calculate the new balance for this account
      const currentBalance =
        balanceMap.get(entry.account_id) ?? account.balance;

      const sameSide = entry.direction === account.direction;
      const newBalance = sameSide
        ? currentBalance + entry.amount
        : currentBalance - entry.amount;

      balanceMap.set(entry.account_id, newBalance);
    }

    return Array.from(balanceMap.entries()).map(([id, balance]) => ({
      id,
      balance,
    }));
  }
}
