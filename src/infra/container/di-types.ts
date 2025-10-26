/**
 * Dependency injection type identifiers
 */
export const TYPES = {
  // Repositories
  AccountsRepository: Symbol.for('AccountsRepository'),
  TransactionsRepository: Symbol.for('TransactionsRepository'),

  // Services
  AccountsService: Symbol.for('AccountsService'),
  TransactionsService: Symbol.for('TransactionsService'),
};
