import { describe, it, expect, beforeAll } from 'vitest';
import { randomUUID } from 'node:crypto';
import { testClient } from 'hono/testing';
import { app } from '../routes';
import { initializeDatabase } from '../db';
import { Direction } from '../enums/direction-enum';
import type { TransactionResponse } from '../schemas/transaction-schema';
import type { AccountResponse } from '../schemas/account-schema';

// Test client for making requests
const client = testClient(app);

describe('Double-Entry Ledger API', () => {
  beforeAll(() => {
    // Initialize database schema
    initializeDatabase();
  });

  // Generate all account IDs at the top level for reuse
  const debitAccountId = randomUUID().toString();
  const creditAccountId = randomUUID().toString();
  const rentAccountId = randomUUID().toString();
  const utilitiesAccountId = randomUUID().toString();
  const insuranceAccountId = randomUUID().toString();
  const accountAId = randomUUID().toString();
  const accountBId = randomUUID().toString();

  describe('Account Creation', () => {
    it('should create a debit account with initial balance', async () => {
      const res = await client.accounts.$post({
        json: {
          name: 'Checking Account',
          direction: Direction.DEBIT,
          balance: 5000,
          id: debitAccountId,
        },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toMatchObject({
        id: debitAccountId,
        name: 'Checking Account',
        balance: 5000,
        direction: Direction.DEBIT,
      });
    });

    it('should create a credit account with default balance', async () => {
      const res = await client.accounts.$post({
        json: {
          name: 'Revenue Account',
          direction: Direction.CREDIT,
          id: creditAccountId,
        },
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toMatchObject({
        id: creditAccountId,
        name: 'Revenue Account',
        balance: 0,
        direction: Direction.CREDIT,
      });
    });
  });

  describe('Account Retrieval', () => {
    it('should retrieve an existing account by ID', async () => {
      const resDebit = await client.accounts[':id'].$get({
        param: { id: debitAccountId },
      });

      expect(resDebit.status).toBe(200);
      const dataDebit = await resDebit.json();
      expect(dataDebit).toMatchObject({
        id: debitAccountId,
        name: 'Checking Account',
        balance: 5000,
        direction: Direction.DEBIT,
      });

      const resCredit = await client.accounts[':id'].$get({
        param: { id: creditAccountId },
      });

      expect(resCredit.status).toBe(200);
      const dataCredit = await resCredit.json();
      expect(dataCredit).toMatchObject({
        id: creditAccountId,
        name: 'Revenue Account',
        balance: 0,
        direction: Direction.CREDIT,
      });
    });

    it('should return 404 for non-existent account', async () => {
      const res = await client.accounts[':id'].$get({
        param: { id: randomUUID().toString() },
      });

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Simple Two-Entry Transaction', () => {
    it('should create a transaction with 2 balanced entries and update account balances correctly', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Simple transfer',
          entries: [
            {
              direction: Direction.CREDIT,
              account_id: debitAccountId,
              amount: 1000,
            },
            {
              direction: Direction.DEBIT,
              account_id: creditAccountId,
              amount: 1000,
            },
          ],
        },
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as TransactionResponse;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('entries');
      expect(data.entries).toHaveLength(2);

      const [resDebit, resCredit] = await Promise.all([
        client.accounts[':id'].$get({
          param: { id: debitAccountId },
        }),
        client.accounts[':id'].$get({
          param: { id: creditAccountId },
        }),
      ]);
      const [dataDebit, dataCredit] = await Promise.all([
        resDebit.json() as Promise<AccountResponse>,
        resCredit.json() as Promise<AccountResponse>,
      ]);
      expect(dataDebit.balance).toBe(4000);
      expect(dataCredit.balance).toBe(-1000);
    });
  });

  describe('Multi-Entry Transaction (Split Transaction)', () => {
    beforeAll(async () => {
      // Create additional accounts for multi-entry test
      await client.accounts.$post({
        json: {
          name: 'Expense: Rent',
          direction: Direction.DEBIT,
          id: rentAccountId,
        },
      });

      await client.accounts.$post({
        json: {
          name: 'Expense: Utilities',
          direction: Direction.DEBIT,
          id: utilitiesAccountId,
        },
      });

      await client.accounts.$post({
        json: {
          name: 'Expense: Insurance',
          direction: Direction.DEBIT,
          id: insuranceAccountId,
        },
      });
    });

    it('should create a transaction with 4 entries (1 credit, 3 debits) and update account balances correctly', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Monthly expenses payment',
          entries: [
            {
              direction: Direction.CREDIT,
              account_id: debitAccountId,
              amount: 3000,
            },
            {
              direction: Direction.DEBIT,
              account_id: rentAccountId,
              amount: 1500,
            },
            {
              direction: Direction.DEBIT,
              account_id: utilitiesAccountId,
              amount: 800,
            },
            {
              direction: Direction.DEBIT,
              account_id: insuranceAccountId,
              amount: 700,
            },
          ],
        },
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as TransactionResponse;
      expect(data).toHaveProperty('id');
      expect(data.entries).toHaveLength(4);

      const [resDebit, resRent, resUtilities, resInsurance] = await Promise.all(
        [
          client.accounts[':id'].$get({
            param: { id: debitAccountId },
          }),
          client.accounts[':id'].$get({
            param: { id: rentAccountId },
          }),
          client.accounts[':id'].$get({
            param: { id: utilitiesAccountId },
          }),
          client.accounts[':id'].$get({
            param: { id: insuranceAccountId },
          }),
        ],
      );

      const [dataDebit, dataRent, dataUtilities, dataInsurance] =
        await Promise.all([
          resDebit.json() as Promise<AccountResponse>,
          resRent.json() as Promise<AccountResponse>,
          resUtilities.json() as Promise<AccountResponse>,
          resInsurance.json() as Promise<AccountResponse>,
        ]);

      expect(dataDebit.balance).toBe(1000);
      expect(dataRent.balance).toBe(1500);
      expect(dataUtilities.balance).toBe(800);
      expect(dataInsurance.balance).toBe(700);
    });
  });

  describe('Complex Multi-Entry Transaction', () => {
    beforeAll(async () => {
      await client.accounts.$post({
        json: {
          name: 'Account A',
          direction: Direction.DEBIT,
          balance: 10000,
          id: accountAId,
        },
      });

      await client.accounts.$post({
        json: {
          name: 'Account B',
          direction: Direction.CREDIT,
          balance: 5000,
          id: accountBId,
        },
      });
    });

    it('should create complex transaction (2 credits + 3 debits = balanced) and update account balances correctly', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Complex transfer',
          entries: [
            {
              direction: Direction.CREDIT,
              account_id: accountAId,
              amount: 2000,
            },
            {
              direction: Direction.CREDIT,
              account_id: accountBId,
              amount: 1500,
            },
            {
              direction: Direction.DEBIT,
              account_id: rentAccountId,
              amount: 1000,
            },
            {
              direction: Direction.DEBIT,
              account_id: utilitiesAccountId,
              amount: 1500,
            },
            {
              direction: Direction.DEBIT,
              account_id: insuranceAccountId,
              amount: 1000,
            },
          ],
        },
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as TransactionResponse;
      expect(data).toHaveProperty('id');
      expect(data.entries).toHaveLength(5);

      const [resAccountA, resAccountB, resRent, resUtilities, resInsurance] =
        await Promise.all([
          client.accounts[':id'].$get({
            param: { id: accountAId },
          }),
          client.accounts[':id'].$get({
            param: { id: accountBId },
          }),
          client.accounts[':id'].$get({
            param: { id: rentAccountId },
          }),
          client.accounts[':id'].$get({
            param: { id: utilitiesAccountId },
          }),
          client.accounts[':id'].$get({
            param: { id: insuranceAccountId },
          }),
        ]);
      const [
        dataAccountA,
        dataAccountB,
        dataRent,
        dataUtilities,
        dataInsurance,
      ] = await Promise.all([
        resAccountA.json() as Promise<AccountResponse>,
        resAccountB.json() as Promise<AccountResponse>,
        resRent.json() as Promise<AccountResponse>,
        resUtilities.json() as Promise<AccountResponse>,
        resInsurance.json() as Promise<AccountResponse>,
      ]);
      expect(dataAccountA.balance).toBe(8000);
      expect(dataAccountB.balance).toBe(6500);
      expect(dataRent.balance).toBe(2500);
      expect(dataUtilities.balance).toBe(2300);
      expect(dataInsurance.balance).toBe(1700);
    });
  });

  describe('Edge Case: Single Entry Transaction', () => {
    it('should reject transaction with 0 entries', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Invalid 0 entries',
          entries: [],
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });

    it('should reject transaction with only 1 entry (unbalanced)', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Invalid single entry',
          entries: [
            {
              direction: Direction.DEBIT,
              account_id: debitAccountId,
              amount: 500,
            },
          ],
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });
  });

  describe('Edge Case: Unbalanced Transaction', () => {
    it('should reject unbalanced transaction (debits ≠ credits)', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Unbalanced',
          entries: [
            {
              direction: Direction.DEBIT,
              account_id: debitAccountId,
              amount: 1000,
            },
            {
              direction: Direction.CREDIT,
              account_id: creditAccountId,
              amount: 500,
            },
          ],
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });
  });

  describe('Edge Case: Non-existent Account', () => {
    it('should reject transaction with non-existent account', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Invalid account',
          entries: [
            {
              direction: Direction.DEBIT,
              account_id: '99999999-9999-4999-8999-999999999999',
              amount: 100,
            },
            {
              direction: Direction.CREDIT,
              account_id: debitAccountId,
              amount: 100,
            },
          ],
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });
  });

  describe('Edge Case: Zero or Negative Amount', () => {
    it('should reject transaction with zero amount', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Zero amount',
          entries: [
            {
              direction: Direction.DEBIT,
              account_id: debitAccountId,
              amount: 0,
            },
            {
              direction: Direction.CREDIT,
              account_id: creditAccountId,
              amount: 0,
            },
          ],
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });

    it('should reject transaction with negative amount', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Negative amount',
          entries: [
            {
              direction: Direction.DEBIT,
              account_id: debitAccountId,
              amount: -100,
            },
            {
              direction: Direction.CREDIT,
              account_id: creditAccountId,
              amount: -100,
            },
          ],
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });
  });

  describe('Edge Case: Invalid UUID Format', () => {
    it('should reject account with invalid UUID format', async () => {
      const res = await client.accounts.$post({
        json: {
          name: 'Invalid ID',
          direction: Direction.DEBIT,
          id: 'not-a-valid-uuid',
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });
  });

  describe('Edge Case: Missing Required Fields', () => {
    it('should reject account without required direction field', async () => {
      const res = await client.accounts.$post({
        json: {
          name: 'Missing direction',
          // biome-ignore lint/suspicious/noExplicitAny: Bypass TypeScript check to test runtime validation
        } as any,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });

    it('should reject transaction without entries', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'No entries',
          entries: [],
        },
      });

      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data).toHaveProperty('error');
    });
  });

  describe('Edge Case: Empty Entries Array', () => {
    it('should reject transaction with empty entries array', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Empty entries',
          entries: [],
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });

    it('should reject transaction with less than 2 entries', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Less than 2 entries',
          entries: [
            {
              direction: Direction.DEBIT,
              account_id: rentAccountId,
              amount: 100,
            },
          ],
        },
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as { error: string };
      expect(data).toHaveProperty('error');
    });
  });

  describe('Edge Case: Large Multi-Entry Transaction', () => {
    // Generate IDs for accounts 6-9
    const account6Id = '66666666-6666-4666-8666-666666666666';
    const account7Id = '77777777-7777-4777-8777-777777777777';
    const account8Id = '88888888-8888-4888-8888-888888888888';
    const account9Id = '99999999-9999-4999-8999-999999999999';

    beforeAll(async () => {
      // Create more test accounts
      await client.accounts.$post({
        json: {
          name: 'Test Account 6',
          direction: Direction.DEBIT,
          id: account6Id,
        },
      });
      await client.accounts.$post({
        json: {
          name: 'Test Account 7',
          direction: Direction.DEBIT,
          id: account7Id,
        },
      });
      await client.accounts.$post({
        json: {
          name: 'Test Account 8',
          direction: Direction.DEBIT,
          id: account8Id,
        },
      });
      await client.accounts.$post({
        json: {
          name: 'Test Account 9',
          direction: Direction.DEBIT,
          id: account9Id,
        },
      });
    });

    it('should handle large transaction with 10 entries', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Large transaction',
          entries: [
            {
              direction: Direction.CREDIT,
              account_id: debitAccountId,
              amount: 5000,
            },
            {
              direction: Direction.DEBIT,
              account_id: account6Id,
              amount: 1000,
            },
            {
              direction: Direction.DEBIT,
              account_id: account7Id,
              amount: 1000,
            },
            {
              direction: Direction.DEBIT,
              account_id: account8Id,
              amount: 1000,
            },
            {
              direction: Direction.DEBIT,
              account_id: account9Id,
              amount: 1000,
            },
            {
              direction: Direction.DEBIT,
              account_id: rentAccountId,
              amount: 200,
            },
            {
              direction: Direction.DEBIT,
              account_id: utilitiesAccountId,
              amount: 200,
            },
            {
              direction: Direction.DEBIT,
              account_id: insuranceAccountId,
              amount: 200,
            },
            {
              direction: Direction.DEBIT,
              account_id: accountAId,
              amount: 200,
            },
            {
              direction: Direction.DEBIT,
              account_id: accountBId,
              amount: 200,
            },
          ],
        },
      });
      expect(res.status).toBe(201);
      const data = (await res.json()) as TransactionResponse;
      expect(data).toHaveProperty('id');
      expect(data.entries).toHaveLength(10);
      const [
        resDebit,
        resAccount6,
        resAccount7,
        resAccount8,
        resAccount9,
        resRent,
        resUtilities,
        resInsurance,
        resAccountA,
        resAccountB,
      ] = await Promise.all([
        client.accounts[':id'].$get({
          param: { id: debitAccountId },
        }),
        client.accounts[':id'].$get({
          param: { id: account6Id },
        }),
        client.accounts[':id'].$get({
          param: { id: account7Id },
        }),
        client.accounts[':id'].$get({
          param: { id: account8Id },
        }),
        client.accounts[':id'].$get({
          param: { id: account9Id },
        }),
        client.accounts[':id'].$get({
          param: { id: rentAccountId },
        }),
        client.accounts[':id'].$get({
          param: { id: utilitiesAccountId },
        }),
        client.accounts[':id'].$get({
          param: { id: insuranceAccountId },
        }),
        client.accounts[':id'].$get({
          param: { id: accountAId },
        }),
        client.accounts[':id'].$get({
          param: { id: accountBId },
        }),
      ]);
      const [
        dataDebit,
        dataAccount6,
        dataAccount7,
        dataAccount8,
        dataAccount9,
        dataRent,
        dataUtilities,
        dataInsurance,
        dataAccountA,
        dataAccountB,
      ] = await Promise.all([
        resDebit.json() as Promise<AccountResponse>,
        resAccount6.json() as Promise<AccountResponse>,
        resAccount7.json() as Promise<AccountResponse>,
        resAccount8.json() as Promise<AccountResponse>,
        resAccount9.json() as Promise<AccountResponse>,
        resRent.json() as Promise<AccountResponse>,
        resUtilities.json() as Promise<AccountResponse>,
        resInsurance.json() as Promise<AccountResponse>,
        resAccountA.json() as Promise<AccountResponse>,
        resAccountB.json() as Promise<AccountResponse>,
      ]);
      expect(dataDebit.balance).toBe(-4000);
      expect(dataAccount6.balance).toBe(1000);
      expect(dataAccount7.balance).toBe(1000);
      expect(dataAccount8.balance).toBe(1000);
      expect(dataAccount9.balance).toBe(1000);
      expect(dataRent.balance).toBe(2700);
      expect(dataUtilities.balance).toBe(2500);
      expect(dataInsurance.balance).toBe(1900);
      expect(dataAccountA.balance).toBe(8200);
      expect(dataAccountB.balance).toBe(6300);
    });
  });

  describe('Edge Case: Decimal Precision', () => {
    it('should handle decimal amounts correctly', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Decimal amounts',
          entries: [
            {
              direction: Direction.DEBIT,
              account_id: debitAccountId,
              amount: 99.99,
            },
            {
              direction: Direction.CREDIT,
              account_id: creditAccountId,
              amount: 99.99,
            },
          ],
        },
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as TransactionResponse;
      expect(data).toHaveProperty('id');

      const [resDebit, resCredit] = await Promise.all([
        client.accounts[':id'].$get({
          param: { id: debitAccountId },
        }),
        client.accounts[':id'].$get({
          param: { id: creditAccountId },
        }),
      ]);
      const [dataDebit, dataCredit] = await Promise.all([
        resDebit.json() as Promise<AccountResponse>,
        resCredit.json() as Promise<AccountResponse>,
      ]);
      expect(dataDebit.balance).toBe(-3900.01);
      expect(dataCredit.balance).toBe(-900.01);
    });
  });

  describe('Atomicity: Transaction Rollback', () => {
    it('should rollback all changes if transaction fails', async () => {
      // Get initial balance
      const initialRes = await client.accounts[':id'].$get({
        param: { id: debitAccountId },
      });
      const initialData = (await initialRes.json()) as AccountResponse;
      const initialBalance = initialData.balance;

      // Try to create a transaction that will fail (non-existent account)
      await client.transactions.$post({
        json: {
          name: 'Should fail and rollback',
          entries: [
            {
              direction: Direction.CREDIT,
              account_id: debitAccountId,
              amount: 1000,
            },
            {
              direction: Direction.DEBIT,
              account_id: randomUUID().toString(), // Non-existent
              amount: 1000,
            },
          ],
        },
      });

      // Verify balance hasn't changed
      const afterRes = await client.accounts[':id'].$get({
        param: { id: debitAccountId },
      });
      const afterData = (await afterRes.json()) as AccountResponse;

      expect(afterData.balance).toBe(initialBalance);
    });
  });

  describe('Multiple Entries on Same Account', () => {
    const accountId = randomUUID().toString();
    beforeAll(async () => {
      await client.accounts.$post({
        json: {
          name: 'Multi-Entry Test Account',
          direction: Direction.DEBIT,
          balance: 1000,
          id: accountId,
        },
      });
    });

    it('should handle multiple entries affecting the same account', async () => {
      const res = await client.transactions.$post({
        json: {
          name: 'Multiple entries same account',
          entries: [
            {
              direction: Direction.CREDIT,
              account_id: accountId,
              amount: 100,
            },
            {
              direction: Direction.CREDIT,
              account_id: accountId,
              amount: 200,
            },
            {
              direction: Direction.DEBIT,
              account_id: debitAccountId,
              amount: 300,
            },
          ],
        },
      });

      expect(res.status).toBe(201);
      expect(await res.json()).toMatchObject({
        id: expect.any(String),
        name: 'Multiple entries same account',
        entries: expect.any(Array),
      });

      const [resAccount, resDebit] = await Promise.all([
        client.accounts[':id'].$get({
          param: { id: accountId },
        }),
        client.accounts[':id'].$get({
          param: { id: debitAccountId },
        }),
      ]);

      const [dataAccount, dataDebit] = await Promise.all([
        resAccount.json() as Promise<AccountResponse>,
        resDebit.json() as Promise<AccountResponse>,
      ]);

      expect(dataAccount.balance).toBe(700);
      expect(dataDebit.balance).toBe(-3600.01);
    });
  });
});
