import { z } from 'zod'
import { SPLIT_METHODS } from '../constants/split-methods'

const payerSchema = z.object({
  memberId: z.string().min(1),
  amount: z.number().positive('Payer amount must be positive'),
})

const splitSchema = z.object({
  memberId: z.string().min(1),
  amount: z.number().min(0, 'Split amount cannot be negative'),
  shares: z.number().min(0).nullable().optional(),
})

export const createExpenseSchema = z.object({
  groupId: z.string().min(1),
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long'),
  amount: z.number().positive('Amount must be greater than 0'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
  exchangeRate: z.number().positive().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  date: z.number().int().positive('Date is required'),
  splitMethod: z.enum(SPLIT_METHODS),
  payers: z.array(payerSchema).min(1, 'At least one payer is required'),
  splits: z.array(splitSchema).min(1, 'At least one split is required'),
})

export const updateExpenseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title is too long').optional(),
  amount: z.number().positive('Amount must be greater than 0').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').optional(),
  exchangeRate: z.number().positive().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  note: z.string().max(1000).nullable().optional(),
  date: z.number().int().positive('Date is required').optional(),
  splitMethod: z.enum(SPLIT_METHODS).optional(),
  payers: z.array(payerSchema).min(1, 'At least one payer is required').optional(),
  splits: z.array(splitSchema).min(1, 'At least one split is required').optional(),
})

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
