const User = require('../models/User');
const { HttpError, COOKIE_NAME, verifyToken } = require('../utils');

function extractToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// Resolves a JWT to a lean user object (shared by HTTP middleware and the Socket.io handshake).
async function userFromToken(token) {
  if (!token) throw new HttpError(401, 'Authentication required');
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw new HttpError(401, 'Invalid or expired token');
  }
  const user = await User.findById(payload.sub).select('name email role color').lean();
  if (!user) throw new HttpError(401, 'User no longer exists');
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role, color: user.color };
}

async function authenticate(req, _res, next) {
  req.user = await userFromToken(extractToken(req));
  next();
}

const authorize = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) throw new HttpError(403, `Requires role: ${roles.join(' or ')}`);
  next();
};

module.exports = { authenticate, authorize, userFromToken };
