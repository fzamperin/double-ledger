import type {
  CreateAccountInput,
  AccountResponse,
} from '../schemas/account-schema';

export interface IAccountsService {
  createAccount(params: CreateAccountInput): AccountResponse;
  getAccount(id: string): AccountResponse | null;
  getAllAccounts(): AccountResponse[];
}
