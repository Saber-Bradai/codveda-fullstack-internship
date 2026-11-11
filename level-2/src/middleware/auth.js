const User = require('../models/User');
const HttpError = require('../utils/HttpError');
const { COOKIE_NAME, verifyToken } = require('../utils/tokens');

// Reads the JWT from the HTTP-only cookie, or from "Authorization: Bearer <token>" (for Postman/mobile clients).
function extractToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// Requires a valid token; attaches req.user.
async function authenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) throw new HttpError(401, 'Authentication required');
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  // Re-load the user so deleted users / changed roles take effect immediately.
  const user = await User.findById(payload.sub).lean();
  if (!user) throw new HttpError(401, 'User no longer exists');
  req.user = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  next();
}

// Role-based access control: authorize('admin')
const authorize = (...roles) => (req, _res, next) => {
  if (!req.user) throw new HttpError(401, 'Authentication required');
  if (!roles.includes(req.user.role)) throw new HttpError(403, `Requires role: ${roles.join(' or ')}`);
  next();
};

module.exports = { authenticate, authorize };
