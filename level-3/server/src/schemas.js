const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');

const register = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('Email is invalid'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

const login = z.object({
  email: z.string().trim().toLowerCase().email('Email is invalid'),
  password: z.string().min(1, 'Password is required'),
});

const taskBase = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(120),
  description: z.string().trim().max(2000).optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.union([z.coerce.date(), z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v)),
  assignee: z.union([objectId, z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v)),
});

const taskCreate = taskBase;
const taskUpdate = taskBase.partial().refine((o) => Object.keys(o).length > 0, 'Provide at least one field');

const taskQuery = z.object({
  search: z.string().trim().optional(),
  assignee: z.union([z.literal('me'), objectId]).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

const chatMessage = z.object({
  text: z.string().trim().min(1, 'Message is empty').max(1000, 'Message too long'),
  to: objectId.nullable().optional(),
});

const messageQuery = z.object({
  with: objectId.optional(),
  before: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

module.exports = { objectId, register, login, taskCreate, taskUpdate, taskQuery, chatMessage, messageQuery, role: z.object({ role: z.enum(['member', 'admin']) }) };
