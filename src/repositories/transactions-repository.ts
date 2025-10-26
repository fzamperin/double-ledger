import { injectable, inject } from 'inversify';
import { db } from '../db';
import type { TransactionModel } from '../models/transaction-model';
import type { ITransactionsRepository } from '../interfaces/transactions-repository-interface';
import type { IAccountsRepository } from '../interfaces/accounts-repository-interface';
import { TYPES } from '../infra/container/di-types';
import type { Direction } from '../enums/direction-enum';

interface TransactionRow {
  id: string;
  name: string;
  date: string;
}

@injectable()
export class TransactionsRepository implements ITransactionsRepository {
  constructor(
    @inject(TYPES.AccountsRepository)
    private accountsRepository: IAccountsRepository,
  ) {}

  /**
   * Create a new transaction with its entries and update account balances atomically
   */
  createWithBalanceUpdates(
    transaction: TransactionModel,
    balanceUpdates: Array<{ id: string; balance: number }>,
  ): TransactionModel {
    // Use a database transaction to ensure atomicity
    const result = db.transaction(() => {
      // Insert transaction
      const transactionStmt = db.prepare(`
        INSERT INTO transactions (id, name, date)
        VALUES (?, ?, ?)
      `);

      transactionStmt.run(
        transaction.id,
        transaction.name,
        transaction.date.toISOString(),
      );

      // Insert entries
      const entryStmt = db.prepare(`
        INSERT INTO transaction_entries (id, transaction_id, account_id, amount, direction)
        VALUES (?, ?, ?, ?, ?)
      `);

      for (const entry of transaction.entries) {
        entryStmt.run(
          entry.id,
          transaction.id,
          entry.accountId,
          entry.amount,
          entry.direction,
        );
      }

      // Update account balances
      this.accountsRepository.updateBalances(balanceUpdates);

      return transaction;
    })();

    return result;
  }

  /**
   * Find transaction by ID with optional entries
   * @param id Transaction ID
   * @param includeEntries Whether to include entries (default: true)
   */
  findById(id: string, includeEntries = true): TransactionModel | null {
    if (!includeEntries) {
      // Simple query without entries
      const stmt = db.prepare(`
        SELECT id, name, date
        FROM transactions
        WHERE id = ?
      `);

      const transaction = stmt.get(id) as TransactionRow | undefined;
      if (!transaction) {
        return null;
      }

      return {
        id: transaction.id,
        name: transaction.name,
        date: new Date(transaction.date),
        entries: [],
      };
    }

    // Single query with INNER JOIN to get transaction and entries together
    const stmt = db.prepare(`
      SELECT 
        t.id as transaction_id,
        t.name as transaction_name,
        t.date as transaction_date,
        e.id as entry_id,
        e.account_id,
        e.amount,
        e.direction
      FROM transactions t
      INNER JOIN transaction_entries e ON t.id = e.transaction_id
      WHERE t.id = ?
    `);

    const rows = stmt.all(id) as Array<{
      transaction_id: string;
      transaction_name: string;
      transaction_date: string;
      entry_id: string;
      account_id: string;
      amount: number;
      direction: Direction;
    }>;

    if (rows.length === 0) {
      return null;
    }

    // All rows have the same transaction info, just different entries
    const firstRow = rows[0];

    return {
      id: firstRow.transaction_id,
      name: firstRow.transaction_name,
      date: new Date(firstRow.transaction_date),
      entries: rows.map((row) => ({
        id: row.entry_id,
        transactionId: row.transaction_id,
        accountId: row.account_id,
        amount: row.amount,
        direction: row.direction,
      })),
    };
  }

  /**
   * Get all transactions with their entries using a single JOIN query
   */
  findAll(): TransactionModel[] {
    const stmt = db.prepare(`
      SELECT 
        t.id as transaction_id,
        t.name as transaction_name,
        t.date as transaction_date,
        e.id as entry_id,
        e.account_id,
        e.amount,
        e.direction
      FROM transactions t
      INNER JOIN transaction_entries e ON t.id = e.transaction_id
      ORDER BY t.id, e.id
    `);

    const rows = stmt.all() as Array<{
      transaction_id: string;
      transaction_name: string;
      transaction_date: string;
      entry_id: string;
      account_id: string;
      amount: number;
      direction: Direction;
    }>;

    // Group rows by transaction ID
    const transactionsMap = new Map<string, TransactionModel>();

    for (const row of rows) {
      if (!transactionsMap.has(row.transaction_id)) {
        transactionsMap.set(row.transaction_id, {
          id: row.transaction_id,
          name: row.transaction_name,
          date: new Date(row.transaction_date),
          entries: [],
        });
      }

      const transaction = transactionsMap.get(row.transaction_id);
      if (transaction) {
        transaction.entries.push({
          id: row.entry_id,
          transactionId: row.transaction_id,
          accountId: row.account_id,
          amount: row.amount,
          direction: row.direction,
        });
      }
    }

    return Array.from(transactionsMap.values());
  }
}
