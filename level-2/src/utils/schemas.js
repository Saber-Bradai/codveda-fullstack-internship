// Request validation schemas (zod). Mongoose schemas validate again at the DB layer.
const { z } = require('zod');

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Must be a valid id');
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters') // bcrypt limit
  .regex(/[A-Za-z]/, 'Password must contain a letter')
  .regex(/\d/, 'Password must contain a number');

const register = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
  email: z.string().trim().toLowerCase().email('Email is invalid'),
  password,
});

const login = z.object({
  email: z.string().trim().toLowerCase().email('Email is invalid'),
  password: z.string().min(1, 'Password is required'),
});

const roleUpdate = z.object({ role: z.enum(['user', 'admin']) });

const category = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(200).optional(),
});

const productBase = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(1000).optional(),
  price: z.coerce.number().min(0, 'Price must be >= 0'),
  stock: z.coerce.number().int('Stock must be an integer').min(0).optional(),
  category: objectId,
});
const productCreate = productBase;
const productUpdate = productBase.partial().refine((o) => Object.keys(o).length > 0, 'Provide at least one field');

const productQuery = z.object({
  search: z.string().trim().optional(),
  category: objectId.optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['price', '-price', 'name', '-name', 'createdAt', '-createdAt', '-ratingAvg']).default('-createdAt'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const review = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

module.exports = { objectId, register, login, roleUpdate, category, productCreate, productUpdate, productQuery, review };
