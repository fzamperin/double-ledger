import { inject, injectable } from 'inversify';
import { AccountModel } from '../models/account-model';
import type { CreateAccountInput } from '../schemas/account-schema';
import type { AccountResponse } from '../schemas/account-schema';
import type { IAccountsRepository } from '../interfaces/accounts-repository-interface';
import type { IAccountsService } from '../interfaces/accounts-service-interface';
import { TYPES } from '../infra/container/di-types';

@injectable()
export class AccountsService implements IAccountsService {
  constructor(
    @inject(TYPES.AccountsRepository)
    private accountsRepository: IAccountsRepository,
  ) {}

  /**
   * Create a new account
   */
  createAccount(params: CreateAccountInput): AccountResponse {
    const account = AccountModel.fromInput(params);
    return this.accountsRepository.create(account);
  }

  /**
   * Get account by ID
   */
  getAccount(id: string): AccountResponse | null {
    return this.accountsRepository.findById(id);
  }

  /**
   * Get all accounts
   */
  getAllAccounts(): AccountResponse[] {
    return this.accountsRepository.findAll();
  }
}
