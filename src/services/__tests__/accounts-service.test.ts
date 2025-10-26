import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AccountModel } from '../../models/account-model';
import type { CreateAccountInput } from '../../schemas/account-schema';
import { Direction } from '../../enums/direction-enum';
import type { IAccountsRepository } from '../../interfaces/accounts-repository-interface';
import { AccountsService } from '../accounts-service';

describe('AccountsService', () => {
  let accountsService: AccountsService;
  let mockAccountsRepository: IAccountsRepository;

  beforeEach(() => {
    // Create mock implementation
    mockAccountsRepository = {
      create: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
      updateBalances: vi.fn(),
    };

    // Instantiate service with mock
    accountsService = new AccountsService(mockAccountsRepository);
  });

  describe('createAccount', () => {
    it('should create a debit account successfully', () => {
      const input: CreateAccountInput = {
        id: 'account-1',
        name: 'Cash',
        balance: 1000,
        direction: Direction.DEBIT,
      };

      const savedAccount: AccountModel = {
        id: 'account-1',
        name: 'Cash',
        balance: 1000,
        direction: Direction.DEBIT,
      };

      vi.mocked(mockAccountsRepository.create).mockReturnValue(savedAccount);

      const result = accountsService.createAccount(input);

      expect(result).toEqual({
        id: 'account-1',
        name: 'Cash',
        balance: 1000,
        direction: Direction.DEBIT,
      });

      expect(mockAccountsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'account-1',
          name: 'Cash',
          balance: 1000,
          direction: Direction.DEBIT,
        }),
      );
    });

    it('should create a credit account successfully', () => {
      const input: CreateAccountInput = {
        id: 'account-2',
        name: 'Revenue',
        balance: 0,
        direction: Direction.CREDIT,
      };

      const savedAccount: AccountModel = {
        id: 'account-2',
        name: 'Revenue',
        balance: 0,
        direction: Direction.CREDIT,
      };

      vi.mocked(mockAccountsRepository.create).mockReturnValue(savedAccount);

      const result = accountsService.createAccount(input);

      expect(result).toEqual({
        id: 'account-2',
        name: 'Revenue',
        balance: 0,
        direction: Direction.CREDIT,
      });

      expect(mockAccountsRepository.create).toHaveBeenCalledTimes(1);
    });

    it('should handle negative balance', () => {
      const input: CreateAccountInput = {
        id: 'account-3',
        name: 'Payable',
        balance: -500,
        direction: Direction.CREDIT,
      };

      const savedAccount: AccountModel = {
        id: 'account-3',
        name: 'Payable',
        balance: -500,
        direction: Direction.CREDIT,
      };

      vi.mocked(mockAccountsRepository.create).mockReturnValue(savedAccount);

      const result = accountsService.createAccount(input);

      expect(result.balance).toBe(-500);
    });

    it('should handle decimal balance', () => {
      const input: CreateAccountInput = {
        id: 'account-4',
        name: 'Checking',
        balance: 1234.56,
        direction: Direction.DEBIT,
      };

      const savedAccount: AccountModel = {
        id: 'account-4',
        name: 'Checking',
        balance: 1234.56,
        direction: Direction.DEBIT,
      };

      vi.mocked(mockAccountsRepository.create).mockReturnValue(savedAccount);

      const result = accountsService.createAccount(input);

      expect(result.balance).toBe(1234.56);
    });
  });

  describe('getAccount', () => {
    it('should return account when it exists', () => {
      const account: AccountModel = {
        id: 'account-1',
        name: 'Cash',
        balance: 1000,
        direction: Direction.DEBIT,
      };

      vi.mocked(mockAccountsRepository.findById).mockReturnValue(account);

      const result = accountsService.getAccount('account-1');

      expect(result).toEqual({
        id: 'account-1',
        name: 'Cash',
        balance: 1000,
        direction: Direction.DEBIT,
      });

      expect(mockAccountsRepository.findById).toHaveBeenCalledWith('account-1');
    });

    it('should return null when account does not exist', () => {
      vi.mocked(mockAccountsRepository.findById).mockReturnValue(null);

      const result = accountsService.getAccount('non-existent');

      expect(result).toBeNull();
      expect(mockAccountsRepository.findById).toHaveBeenCalledWith(
        'non-existent',
      );
    });
  });

  describe('getAllAccounts', () => {
    it('should return all accounts', () => {
      const accounts: AccountModel[] = [
        {
          id: 'account-1',
          name: 'Cash',
          balance: 1000,
          direction: Direction.DEBIT,
        },
        {
          id: 'account-2',
          name: 'Revenue',
          balance: 500,
          direction: Direction.CREDIT,
        },
        {
          id: 'account-3',
          name: 'Expenses',
          balance: 200,
          direction: Direction.DEBIT,
        },
      ];

      vi.mocked(mockAccountsRepository.findAll).mockReturnValue(accounts);

      const result = accountsService.getAllAccounts();

      expect(result).toEqual([
        {
          id: 'account-1',
          name: 'Cash',
          balance: 1000,
          direction: Direction.DEBIT,
        },
        {
          id: 'account-2',
          name: 'Revenue',
          balance: 500,
          direction: Direction.CREDIT,
        },
        {
          id: 'account-3',
          name: 'Expenses',
          balance: 200,
          direction: Direction.DEBIT,
        },
      ]);

      expect(result).toHaveLength(3);
      expect(mockAccountsRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no accounts exist', () => {
      vi.mocked(mockAccountsRepository.findAll).mockReturnValue([]);

      const result = accountsService.getAllAccounts();

      expect(result).toEqual([]);
      expect(mockAccountsRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return accounts with mixed directions', () => {
      const accounts: AccountModel[] = [
        {
          id: 'account-1',
          name: 'Assets',
          balance: 5000,
          direction: Direction.DEBIT,
        },
        {
          id: 'account-2',
          name: 'Liabilities',
          balance: 2000,
          direction: Direction.CREDIT,
        },
      ];

      vi.mocked(mockAccountsRepository.findAll).mockReturnValue(accounts);

      const result = accountsService.getAllAccounts();

      expect(result).toHaveLength(2);
      expect(result[0].direction).toBe(Direction.DEBIT);
      expect(result[1].direction).toBe(Direction.CREDIT);
    });
  });
});
