import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransactionsService } from '../transactions-service';
import type { TransactionModel } from '../../models/transaction-model';
import type { CreateTransactionInput } from '../../schemas/transaction-schema';
import { Direction } from '../../enums/direction-enum';
import type { ITransactionsRepository } from '../../interfaces/transactions-repository-interface';
import type { IAccountsService } from '../../interfaces/accounts-service-interface';
import type { AccountResponse } from '../../schemas/account-schema';

describe('TransactionsService', () => {
  let transactionsService: TransactionsService;
  let mockTransactionsRepository: ITransactionsRepository;
  let mockAccountsService: IAccountsService;

  beforeEach(() => {
    // Create mock implementations
    mockTransactionsRepository = {
      createWithBalanceUpdates: vi.fn(),
      findById: vi.fn(),
      findAll: vi.fn(),
    };

    mockAccountsService = {
      createAccount: vi.fn(),
      getAccount: vi.fn(),
      getAllAccounts: vi.fn(),
    };

    // Instantiate service with mocks
    transactionsService = new TransactionsService(
      mockTransactionsRepository,
      mockAccountsService,
    );
  });

  describe('createTransaction', () => {
    it('should create a balanced transaction successfully', () => {
      // Arrange
      const checkingAccount: AccountResponse = {
        id: 'account-1',
        name: 'Checking',
        balance: 5000,
        direction: Direction.DEBIT,
      };

      const revenueAccount: AccountResponse = {
        id: 'account-2',
        name: 'Revenue',
        balance: 0,
        direction: Direction.CREDIT,
      };

      const input: CreateTransactionInput = {
        name: 'Test transaction',
        entries: [
          {
            account_id: 'account-1',
            direction: Direction.DEBIT,
            amount: 1000,
          },
          {
            account_id: 'account-2',
            direction: Direction.CREDIT,
            amount: 1000,
          },
        ],
      };

      const savedTransaction: TransactionModel = {
        id: 'transaction-1',
        name: 'Test transaction',
        date: new Date(),
        entries: [
          {
            id: 'entry-1',
            transactionId: 'transaction-1',
            accountId: 'account-1',
            direction: Direction.DEBIT,
            amount: 1000,
          },
          {
            id: 'entry-2',
            transactionId: 'transaction-1',
            accountId: 'account-2',
            direction: Direction.CREDIT,
            amount: 1000,
          },
        ],
      };

      // Mock implementations
      vi.mocked(mockAccountsService.getAccount)
        .mockReturnValueOnce(checkingAccount)
        .mockReturnValueOnce(revenueAccount);

      vi.mocked(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).mockReturnValue(savedTransaction);

      // Act
      const result = transactionsService.createTransaction(input);

      // Assert
      expect(result).toEqual({
        id: 'transaction-1',
        name: 'Test transaction',
        entries: [
          {
            id: 'entry-1',
            account_id: 'account-1',
            direction: Direction.DEBIT,
            amount: 1000,
          },
          {
            id: 'entry-2',
            account_id: 'account-2',
            direction: Direction.CREDIT,
            amount: 1000,
          },
        ],
      });

      expect(mockAccountsService.getAccount).toHaveBeenCalledTimes(2);
      expect(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Test transaction',
        }),
        [
          { id: 'account-1', balance: 6000 }, // 5000 + 1000 (debit account + debit entry)
          { id: 'account-2', balance: 1000 }, // 0 + 1000 (credit account + credit entry)
        ],
      );
    });

    it('should throw error for unbalanced transaction (debits > credits)', () => {
      const input: CreateTransactionInput = {
        name: 'Unbalanced transaction',
        entries: [
          {
            account_id: 'account-1',
            direction: Direction.DEBIT,
            amount: 1000,
          },
          {
            account_id: 'account-2',
            direction: Direction.CREDIT,
            amount: 500,
          },
        ],
      };

      expect(() => transactionsService.createTransaction(input)).toThrow(
        'Transaction entries must balance. Debits: 1000, Credits: 500',
      );

      expect(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).not.toHaveBeenCalled();
    });

    it('should throw error for unbalanced transaction (credits > debits)', () => {
      const input: CreateTransactionInput = {
        name: 'Unbalanced transaction',
        entries: [
          {
            account_id: 'account-1',
            direction: Direction.DEBIT,
            amount: 500,
          },
          {
            account_id: 'account-2',
            direction: Direction.CREDIT,
            amount: 1000,
          },
        ],
      };

      expect(() => transactionsService.createTransaction(input)).toThrow(
        'Transaction entries must balance. Debits: 500, Credits: 1000',
      );
    });

    it('should throw error when account does not exist', () => {
      const input: CreateTransactionInput = {
        name: 'Test transaction',
        entries: [
          {
            account_id: 'non-existent',
            direction: Direction.DEBIT,
            amount: 1000,
          },
          {
            account_id: 'account-2',
            direction: Direction.CREDIT,
            amount: 1000,
          },
        ],
      };

      vi.mocked(mockAccountsService.getAccount).mockReturnValue(null);

      expect(() => transactionsService.createTransaction(input)).toThrow(
        'Account with id non-existent not found',
      );

      expect(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).not.toHaveBeenCalled();
    });

    it('should handle multiple entries affecting the same account', () => {
      const account: AccountResponse = {
        id: 'account-1',
        name: 'Checking',
        balance: 5000,
        direction: Direction.DEBIT,
      };

      const revenueAccount: AccountResponse = {
        id: 'account-2',
        name: 'Revenue',
        balance: 0,
        direction: Direction.CREDIT,
      };

      const input: CreateTransactionInput = {
        name: 'Multiple entries same account',
        entries: [
          {
            account_id: 'account-1',
            direction: Direction.CREDIT,
            amount: 500,
          },
          {
            account_id: 'account-1',
            direction: Direction.CREDIT,
            amount: 300,
          },
          {
            account_id: 'account-2',
            direction: Direction.DEBIT,
            amount: 800,
          },
        ],
      };

      const savedTransaction: TransactionModel = {
        id: 'transaction-1',
        name: 'Multiple entries same account',
        date: new Date(),
        entries: [],
      };

      vi.mocked(mockAccountsService.getAccount)
        .mockReturnValueOnce(account)
        .mockReturnValueOnce(account)
        .mockReturnValueOnce(revenueAccount);

      vi.mocked(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).mockReturnValue(savedTransaction);

      transactionsService.createTransaction(input);

      expect(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).toHaveBeenCalledWith(expect.anything(), [
        { id: 'account-1', balance: 4200 }, // 5000 - 500 - 300 (debit account - credit entries)
        { id: 'account-2', balance: -800 }, // 0 - 800 (credit account - debit entry)
      ]);
    });

    it('should handle decimal amounts correctly', () => {
      const account1: AccountResponse = {
        id: 'account-1',
        name: 'Account 1',
        balance: 1000.5,
        direction: Direction.DEBIT,
      };

      const account2: AccountResponse = {
        id: 'account-2',
        name: 'Account 2',
        balance: 500.25,
        direction: Direction.CREDIT,
      };

      const input: CreateTransactionInput = {
        name: 'Decimal transaction',
        entries: [
          {
            account_id: 'account-1',
            direction: Direction.DEBIT,
            amount: 99.99,
          },
          {
            account_id: 'account-2',
            direction: Direction.CREDIT,
            amount: 99.99,
          },
        ],
      };

      const savedTransaction: TransactionModel = {
        id: 'transaction-1',
        name: 'Decimal transaction',
        date: new Date(),
        entries: [],
      };

      vi.mocked(mockAccountsService.getAccount)
        .mockReturnValueOnce(account1)
        .mockReturnValueOnce(account2);

      vi.mocked(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).mockReturnValue(savedTransaction);

      transactionsService.createTransaction(input);

      expect(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).toHaveBeenCalledWith(expect.anything(), [
        { id: 'account-1', balance: 1100.49 }, // 1000.50 + 99.99
        { id: 'account-2', balance: 600.24 }, // 500.25 + 99.99
      ]);
    });

    it('should correctly calculate balance for debit account with credit entry', () => {
      const debitAccount: AccountResponse = {
        id: 'account-1',
        name: 'Asset Account',
        balance: 5000,
        direction: Direction.DEBIT,
      };

      const creditAccount: AccountResponse = {
        id: 'account-2',
        name: 'Revenue',
        balance: 0,
        direction: Direction.CREDIT,
      };

      const input: CreateTransactionInput = {
        name: 'Test balance calculation',
        entries: [
          {
            account_id: 'account-1',
            direction: Direction.CREDIT, // Credit entry on debit account
            amount: 1000,
          },
          {
            account_id: 'account-2',
            direction: Direction.DEBIT, // Debit entry on credit account
            amount: 1000,
          },
        ],
      };

      const savedTransaction: TransactionModel = {
        id: 'transaction-1',
        name: 'Test balance calculation',
        date: new Date(),
        entries: [],
      };

      vi.mocked(mockAccountsService.getAccount)
        .mockReturnValueOnce(debitAccount)
        .mockReturnValueOnce(creditAccount);

      vi.mocked(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).mockReturnValue(savedTransaction);

      transactionsService.createTransaction(input);

      expect(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).toHaveBeenCalledWith(expect.anything(), [
        { id: 'account-1', balance: 4000 }, // 5000 - 1000 (different sides)
        { id: 'account-2', balance: -1000 }, // 0 - 1000 (different sides)
      ]);
    });

    it('should allow floating point precision tolerance', () => {
      const account1: AccountResponse = {
        id: 'account-1',
        name: 'Account 1',
        balance: 100,
        direction: Direction.DEBIT,
      };

      const account2: AccountResponse = {
        id: 'account-2',
        name: 'Account 2',
        balance: 100,
        direction: Direction.CREDIT,
      };

      // This simulates floating point precision issues
      // 1000.0001 vs 1000.00009 should be within tolerance
      const input: CreateTransactionInput = {
        name: 'Precision test',
        entries: [
          {
            account_id: 'account-1',
            direction: Direction.DEBIT,
            amount: 1000.0001,
          },
          {
            account_id: 'account-2',
            direction: Direction.CREDIT,
            amount: 1000.00009,
          },
        ],
      };

      const savedTransaction: TransactionModel = {
        id: 'transaction-1',
        name: 'Precision test',
        date: new Date(),
        entries: [],
      };

      vi.mocked(mockAccountsService.getAccount)
        .mockReturnValueOnce(account1)
        .mockReturnValueOnce(account2);

      vi.mocked(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).mockReturnValue(savedTransaction);

      // Should not throw because difference is < 0.001
      expect(() => transactionsService.createTransaction(input)).not.toThrow();
    });
  });

  describe('getTransaction', () => {
    it('should return transaction when it exists', () => {
      const transaction: TransactionModel = {
        id: 'transaction-1',
        name: 'Test transaction',
        date: new Date(),
        entries: [],
      };

      vi.mocked(mockTransactionsRepository.findById).mockReturnValue(
        transaction,
      );

      const result = transactionsService.getTransaction('transaction-1');

      expect(result).toEqual(transaction);
      expect(mockTransactionsRepository.findById).toHaveBeenCalledWith(
        'transaction-1',
      );
    });

    it('should return null when transaction does not exist', () => {
      vi.mocked(mockTransactionsRepository.findById).mockReturnValue(null);

      const result = transactionsService.getTransaction('non-existent');

      expect(result).toBeNull();
      expect(mockTransactionsRepository.findById).toHaveBeenCalledWith(
        'non-existent',
      );
    });
  });

  describe('getAllTransactions', () => {
    it('should return all transactions', () => {
      const transactions: TransactionModel[] = [
        {
          id: 'transaction-1',
          name: 'Transaction 1',
          date: new Date(),
          entries: [],
        },
        {
          id: 'transaction-2',
          name: 'Transaction 2',
          date: new Date(),
          entries: [],
        },
      ];

      vi.mocked(mockTransactionsRepository.findAll).mockReturnValue(
        transactions,
      );

      const result = transactionsService.getAllTransactions();

      expect(result).toEqual(transactions);
      expect(result).toHaveLength(2);
      expect(mockTransactionsRepository.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no transactions exist', () => {
      vi.mocked(mockTransactionsRepository.findAll).mockReturnValue([]);

      const result = transactionsService.getAllTransactions();

      expect(result).toEqual([]);
      expect(mockTransactionsRepository.findAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Complex multi-entry transactions', () => {
    it('should handle transaction with 5 entries correctly', () => {
      const accounts: Record<string, AccountResponse> = {
        'account-1': {
          id: 'account-1',
          name: 'Checking',
          balance: 10000,
          direction: Direction.DEBIT,
        },
        'account-2': {
          id: 'account-2',
          name: 'Payable',
          balance: 5000,
          direction: Direction.CREDIT,
        },
        'account-3': {
          id: 'account-3',
          name: 'Rent Expense',
          balance: 0,
          direction: Direction.DEBIT,
        },
        'account-4': {
          id: 'account-4',
          name: 'Utilities Expense',
          balance: 0,
          direction: Direction.DEBIT,
        },
        'account-5': {
          id: 'account-5',
          name: 'Insurance Expense',
          balance: 0,
          direction: Direction.DEBIT,
        },
      };

      const input: CreateTransactionInput = {
        name: 'Complex transaction',
        entries: [
          {
            account_id: 'account-1',
            direction: Direction.CREDIT,
            amount: 2000,
          },
          {
            account_id: 'account-2',
            direction: Direction.CREDIT,
            amount: 1500,
          },
          { account_id: 'account-3', direction: Direction.DEBIT, amount: 1000 },
          { account_id: 'account-4', direction: Direction.DEBIT, amount: 1500 },
          { account_id: 'account-5', direction: Direction.DEBIT, amount: 1000 },
        ],
      };

      const savedTransaction: TransactionModel = {
        id: 'transaction-1',
        name: 'Complex transaction',
        date: new Date(),
        entries: [],
      };

      vi.mocked(mockAccountsService.getAccount).mockImplementation(
        (id: string) => {
          return accounts[id] || null;
        },
      );

      vi.mocked(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).mockReturnValue(savedTransaction);

      transactionsService.createTransaction(input);

      expect(
        mockTransactionsRepository.createWithBalanceUpdates,
      ).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          { id: 'account-1', balance: 8000 }, // 10000 - 2000
          { id: 'account-2', balance: 6500 }, // 5000 + 1500
          { id: 'account-3', balance: 1000 }, // 0 + 1000
          { id: 'account-4', balance: 1500 }, // 0 + 1500
          { id: 'account-5', balance: 1000 }, // 0 + 1000
        ]),
      );
    });
  });
});
