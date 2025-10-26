import { z } from 'zod';
import { Direction } from '../enums/direction-enum';

/**
 * Schema for a transaction entry
 */
export const transactionEntrySchema = z.object({
  id: z.uuid().optional(),
  account_id: z.uuid(),
  amount: z.number().positive(),
  direction: z.enum(Direction),
});

export type TransactionEntryInput = z.infer<typeof transactionEntrySchema>;

/**
 * Schema for creating a new transaction
 * Note: Double-entry bookkeeping requires minimum 2 entries
 */
export const createTransactionSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().optional(),
  entries: z.array(transactionEntrySchema).min(2, {
    message:
      'A transaction must have at least 2 entries (double-entry principle)',
  }),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

/**
 * Schema for transaction entry response
 */
export const transactionEntryResponseSchema = z.object({
  id: z.uuid(),
  account_id: z.uuid(),
  amount: z.number(),
  direction: z.enum(Direction),
});

export type TransactionEntryResponse = z.infer<
  typeof transactionEntryResponseSchema
>;

/**
 * Schema for transaction response
 */
export const transactionResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  entries: z.array(transactionEntryResponseSchema),
});

export type TransactionResponse = z.infer<typeof transactionResponseSchema>;
