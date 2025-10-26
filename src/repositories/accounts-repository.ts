import { injectable } from 'inversify';
import { db } from '../db';
import type { AccountModel } from '../models/account-model';
import type { IAccountsRepository } from '../interfaces/accounts-repository-interface';

@injectable()
export class AccountsRepository implements IAccountsRepository {
  /**
   * Create a new account
   */
  create(account: AccountModel): AccountModel {
    const stmt = db.prepare(`
      INSERT INTO accounts (id, name, balance, direction)
      VALUES (?, ?, ?, ?)
    `);

    stmt.run(account.id, account.name, account.balance, account.direction);
    return account;
  }

  /**
   * Find account by ID
   */
  findById(id: string): AccountModel | null {
    const stmt = db.prepare(`
      SELECT id, name, balance, direction
      FROM accounts
      WHERE id = ?
    `);

    const row = stmt.get(id) as AccountModel | undefined;
    return row || null;
  }

  /**
   * Get all accounts
   */
  findAll(): AccountModel[] {
    const stmt = db.prepare(`
      SELECT id, name, balance, direction
      FROM accounts
    `);

    return stmt.all() as AccountModel[];
  }

  /**
   * Update multiple account balances in batch (internal use only)
   * Note: This should be called within a transaction
   */
  updateBalances(balanceUpdates: Array<{ id: string; balance: number }>): void {
    const stmt = db.prepare(`
      UPDATE accounts
      SET balance = ?
      WHERE id = ?
    `);

    for (const update of balanceUpdates) {
      stmt.run(update.balance, update.id);
    }
  }
}
