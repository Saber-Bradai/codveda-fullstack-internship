const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { HttpError, COOKIE_NAME, signToken, cookieOptions, validate } = require('../utils');
const { authenticate } = require('../middleware/auth');
const schemas = require('../schemas');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

const COLORS = ['#5b8cff', '#f97316', '#10b981', '#e11d48', '#8b5cf6', '#0ea5e9', '#eab308', '#14b8a6'];

function sendAuth(res, user, status = 200) {
  const token = signToken(user);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.status(status).json({ user, token });
}

router.post('/register', limiter, validate(schemas.register), async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw new HttpError(409, 'Email is already registered');
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  sendAuth(res, await User.create({ ...req.body, color }), 201);
});

router.post('/login', limiter, validate(schemas.login), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.comparePassword(req.body.password))) throw new HttpError(401, 'Invalid email or password');
  sendAuth(res, user);
});

router.post('/logout', (_req, res) => {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts).json({ message: 'Logged out' });
});

router.get('/me', authenticate, async (req, res) => {
  res.json({ user: await User.findById(req.user.id) });
});

module.exports = router;
