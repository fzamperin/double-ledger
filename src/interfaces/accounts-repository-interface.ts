import type { AccountModel } from '../models/account-model';

export interface IAccountsRepository {
  create(account: AccountModel): AccountModel;
  findById(id: string): AccountModel | null;
  findAll(): AccountModel[];
  updateBalances(balanceUpdates: Array<{ id: string; balance: number }>): void;
}
