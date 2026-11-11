const jwt = require('jsonwebtoken');
const env = require('./config/env');

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    if (details) this.details = details;
  }
}

const COOKIE_NAME = 'tf_token';

const signToken = (user) => jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
const verifyToken = (token) => jwt.verify(token, env.jwtSecret);

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.isProd,
  // 'none' lets the cookie work when frontend and backend are deployed on different domains (requires HTTPS)
  sameSite: env.isProd ? 'none' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,
  path: '/',
});

// Turns zod issues into { field: message }
function zodDetails(error) {
  const details = {};
  for (const issue of error.issues) details[issue.path.join('.') || '_'] ??= issue.message;
  return details;
}

const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source] ?? {});
  if (!result.success) throw new HttpError(422, 'Validation failed', zodDetails(result.error));
  if (source === 'query') req.validatedQuery = result.data;
  else req[source] = result.data;
  next();
};

module.exports = { HttpError, COOKIE_NAME, signToken, verifyToken, cookieOptions, zodDetails, validate };
