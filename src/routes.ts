import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createAccountSchema } from './schemas/account-schema';
import { createTransactionSchema } from './schemas/transaction-schema';
import type { IAccountsService } from './interfaces/accounts-service-interface';
import type { ITransactionsService } from './interfaces/transactions-service-interface';
import { TYPES } from './infra/container/di-types';
import { container } from './infra/container';

// Resolve services from the IoC container
const accountsService = container.get<IAccountsService>(TYPES.AccountsService);
const transactionsService = container.get<ITransactionsService>(
  TYPES.TransactionsService,
);

const accountsApp = new Hono()
  .post(
    '/',
    zValidator('json', createAccountSchema, (result, c) => {
      if (!result.success) {
        return c.json({ error: result.error.issues }, 400);
      }
    }),
    (c) => {
      try {
        const data = c.req.valid('json');
        const account = accountsService.createAccount(data);
        return c.json(account, 201);
      } catch (error) {
        return c.json(
          { error: error instanceof Error ? error.message : 'Unknown error' },
          400,
        );
      }
    },
  )
  .get('/:id', (c) => {
    try {
      const id = c.req.param('id');
      const account = accountsService.getAccount(id);

      if (!account) {
        return c.json({ error: 'Account not found' }, 404);
      }

      return c.json(account);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        400,
      );
    }
  });

const transactionsApp = new Hono().post(
  '/',
  zValidator('json', createTransactionSchema, (result, c) => {
    if (!result.success) {
      return c.json({ error: result.error.issues }, 400);
    }
  }),
  (c) => {
    try {
      const data = c.req.valid('json');
      const response = transactionsService.createTransaction(data);
      return c.json(response, 201);
    } catch (error) {
      return c.json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        400,
      );
    }
  },
);

export const app = new Hono()
  .route('/accounts', accountsApp)
  .route('/transactions', transactionsApp);
