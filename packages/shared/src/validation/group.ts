import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name is too long'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code'),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color')
    .nullable()
    .optional(),
})

export const updateGroupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Group name is too long').optional(),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a valid hex color')
    .nullable()
    .optional(),
  archived: z.boolean().optional(),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>
