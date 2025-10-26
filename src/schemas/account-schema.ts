import { z } from 'zod';
import { Direction } from '../enums/direction-enum';

/**
 * Schema for creating a new account
 */
export const createAccountSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().optional(),
  balance: z.number().optional().default(0),
  direction: z.enum(Direction),
});

/**
 * TypeScript type inferred from the schema
 */
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

/**
 * Schema for account response
 */
export const accountResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  balance: z.number(),
  direction: z.enum(Direction),
});

export type AccountResponse = z.infer<typeof accountResponseSchema>;
