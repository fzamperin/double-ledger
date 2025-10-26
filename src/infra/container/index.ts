import { Container } from 'inversify';
import { TYPES } from './di-types';
import { AccountsRepository } from '../../repositories/accounts-repository';
import { TransactionsRepository } from '../../repositories/transactions-repository';
import { AccountsService } from '../../services/accounts-service';
import { TransactionsService } from '../../services/transactions-service';
import type { IAccountsRepository } from '../../interfaces/accounts-repository-interface';
import type { IAccountsService } from '../../interfaces/accounts-service-interface';
import type { ITransactionsRepository } from '../../interfaces/transactions-repository-interface';
import type { ITransactionsService } from '../../interfaces/transactions-service-interface';

// Create the IoC container
const container = new Container();

// Bind repositories
container
  .bind<IAccountsRepository>(TYPES.AccountsRepository)
  .to(AccountsRepository);
container
  .bind<ITransactionsRepository>(TYPES.TransactionsRepository)
  .to(TransactionsRepository);

// Bind services
container.bind<IAccountsService>(TYPES.AccountsService).to(AccountsService);
container
  .bind<ITransactionsService>(TYPES.TransactionsService)
  .to(TransactionsService);

export { container };
