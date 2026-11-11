const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const HttpError = require('../utils/HttpError');
const validate = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const schemas = require('../utils/schemas');
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/tokens');

// Brute-force protection on credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: process.env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later' },
});

function sendAuth(res, user, status = 200) {
  const token = signToken(user);
  setAuthCookie(res, token);
  // Token is also returned in the body for non-browser clients (Postman, mobile).
  res.status(status).json({ user, token });
}

// POST /api/auth/register — public signups always get role "user"
router.post('/register', authLimiter, validate(schemas.register), async (req, res) => {
  if (await User.exists({ email: req.body.email })) throw new HttpError(409, 'Email is already registered');
  const user = await User.create(req.body); // password hashed in pre('save')
  sendAuth(res, user, 201);
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(schemas.login), async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  // Same message for unknown email & wrong password → no user enumeration
  if (!user || !(await user.comparePassword(req.body.password))) throw new HttpError(401, 'Invalid email or password');
  sendAuth(res, user);
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  res.json({ user: await User.findById(req.user.id) });
});

module.exports = router;
