# Double-Entry Ledger API

A robust, production-ready double-entry bookkeeping system built with TypeScript, Hono, and SQLite. This API implements fundamental accounting principles with dependency injection, atomic transactions, and comprehensive test coverage.

## 🌟 Features

- **Double-Entry Bookkeeping**: Enforces fundamental accounting principles
  - Every transaction must have at least 2 entries
  - Debits must equal credits
  - Automatic balance calculation based on account direction

- **Atomic Transactions**: All database operations within a transaction are atomic
  - Transaction creation
  - Entry creation
  - Balance updates
  - Rollback on failure

- **Dependency Injection**: Clean architecture using InversifyJS
  - Dependency Inversion Principle (DIP)
  - Constructor injection
  - Interface-based design
  - Easy testing with mocks

- **Comprehensive Testing**: 49 tests (22 unit + 27 E2E)
  - ~100% business logic coverage
  - Fast execution (~190ms)
  - Isolated unit tests with mocks
  - Full integration E2E tests

- **Type Safety**: Full TypeScript with strict mode
  - Zod schema validation
  - Runtime type checking
  - Compile-time type safety

## 📋 Requirements

- **Node.js**: v24.x (managed via nvm)
- **npm**: v11.x (comes with Node.js 24)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
# Ensure you're using Node.js 24, the project contains a .nvmrc
nvm use

# Start the development server
npm run dev
```

The API will be available at `http://localhost:3000`

### 3. Build for Production

```bash
npm run build
```

### 4. Run Production Build

```bash
npm start
```

## 📚 API Documentation

### Base URL
```
http://localhost:3000
```

### Endpoints

#### Create Account
```http
POST /accounts
Content-Type: application/json

{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Cash",
  "balance": 10000,
  "direction": "DEBIT"  // or "CREDIT"
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Cash",
  "balance": 10000,
  "direction": "DEBIT"
}
```

#### Get Account by ID
```http
GET /accounts/:id
```

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Cash",
  "balance": 10000,
  "direction": "DEBIT"
}
```

#### Create Transaction
```http
POST /transactions
Content-Type: application/json

{
  "name": "Sale of goods",
  "entries": [
    {
      "account_id": "550e8400-e29b-41d4-a716-446655440000",
      "direction": "DEBIT",
      "amount": 1000
    },
    {
      "account_id": "660e8400-e29b-41d4-a716-446655440001",
      "direction": "CREDIT",
      "amount": 1000
    }
  ]
}
```

**Response** (201 Created):
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "name": "Sale of goods",
  "entries": [
    {
      "id": "880e8400-e29b-41d4-a716-446655440003",
      "account_id": "550e8400-e29b-41d4-a716-446655440000",
      "direction": "DEBIT",
      "amount": 1000
    },
    {
      "id": "990e8400-e29b-41d4-a716-446655440004",
      "account_id": "660e8400-e29b-41d4-a716-446655440001",
      "direction": "CREDIT",
      "amount": 1000
    }
  ]
}
```

### Account Directions

- **DEBIT**: Assets, Expenses
  - Increases: Debit entries
  - Decreases: Credit entries

- **CREDIT**: Liabilities, Equity, Revenue
  - Increases: Credit entries
  - Decreases: Debit entries

### Validation Rules

1. **Transaction Entries**:
   - Minimum 2 entries required (double-entry principle)
   - Total debits must equal total credits
   - All account IDs must be valid UUIDs
   - All accounts must exist
   - Amounts must be positive numbers

2. **Accounts**:
   - ID must be a valid UUID
   - Name is required
   - Balance can be positive, negative, or zero
   - Direction must be "DEBIT" or "CREDIT"

### Error Responses

```json
{
  "error": "Transaction entries must balance. Debits: 1000, Credits: 500"
}
```

```json
{
  "error": "Account with id 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Unit Tests
```bash
# Run once
npm run test:unit

# Watch mode
npm run test:unit:watch
```

### Run E2E Tests
```bash
# Run once
npm run test:e2e

# Watch mode
npm run test:e2e:watch

# UI mode
npm run test:e2e:ui
```

### Generate Coverage Report
```bash
npm run test:coverage
```

## 🏗️ Architecture

### Project Structure
```
src/
├── index.ts                    # Application entry point
├── routes.ts                   # API route definitions
├── db.ts                       # Database setup and schema
├── enums/
│   └── direction-enum.ts       # DEBIT/CREDIT enum
├── models/
│   ├── account-model.ts        # Account domain model
│   └── transaction-model.ts    # Transaction domain model
├── schemas/
│   ├── account-schema.ts       # Account validation schemas
│   └── transaction-schema.ts   # Transaction validation schemas
├── interfaces/
│   ├── accounts-service-interface.ts
│   ├── transactions-service-interface.ts
│   ├── accounts-repository-interface.ts
│   └── transactions-repository-interface.ts
├── services/
│   ├── accounts-service.ts     # Account business logic
│   ├── transactions-service.ts # Transaction business logic
│   └── __tests__/              # Unit tests
├── repositories/
│   ├── accounts-repository.ts  # Account data access
│   └── transactions-repository.ts # Transaction data access
├── infra/
│   └── container/
│       ├── index.ts            # DI container configuration
│       └── di-types.ts         # DI symbols
└── tests/
    └── api.test.ts             # E2E tests
```

### Design Patterns

- **Dependency Injection**: InversifyJS for IoC
- **Repository Pattern**: Data access abstraction
- **Service Layer**: Business logic separation
- **Factory Pattern**: Model creation
- **Interface Segregation**: Clear contracts between layers

### Database Schema

**accounts**
```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  balance REAL NOT NULL,
  direction TEXT NOT NULL
);
```

**transactions**
```sql
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  name TEXT,
  date TEXT NOT NULL
);
```

**transaction_entries**
```sql
CREATE TABLE transaction_entries (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  amount REAL NOT NULL,
  direction TEXT NOT NULL,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);
```

## 🔧 Development

### Code Quality

The project uses Biome for linting and formatting:
```bash
# Check code quality
biome check .

# Auto-fix issues
biome check --write .
```

### TypeScript Configuration

- **Strict mode**: Enabled
- **Decorators**: Enabled for InversifyJS
- **Target**: ESNext
- **Module**: CommonJS
- **Source maps**: Enabled

### Git Workflow

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `biome check .`
5. Build: `npm run build`
6. Commit and push
7. Create pull request

## 🔐 Security Considerations

- **Input Validation**: Zod schemas validate all inputs
- **SQL Injection**: Parameterized queries via Better-SQLite3
- **Type Safety**: Full TypeScript coverage
- **Error Handling**: No sensitive data in error messages

## 📊 Performance

- **Database**: SQLite with prepared statements
- **Query Optimization**: Single JOIN queries for related data
- **Transaction Atomicity**: Batch updates in single transaction
- **Memory**: In-memory database for development/testing

## 🤝 Contributing

1. Follow the existing code style (Biome enforced)
2. Write unit tests for business logic
3. Write E2E tests for API endpoints
4. Update documentation as needed
5. Ensure all tests pass
6. Ensure build succeeds

## 📝 License

MIT

## 🙏 Acknowledgments

Built with:
- [Hono](https://hono.dev/) - Lightweight web framework
- [InversifyJS](https://inversify.io/) - Dependency injection
- [Better-SQLite3](https://github.com/WiseLibs/better-sqlite3) - SQLite database
- [Zod](https://zod.dev/) - Schema validation
- [Vitest](https://vitest.dev/) - Testing framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
