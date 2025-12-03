const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change_me';

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer')
    return res.status(401).json({ error: 'Invalid token format' });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize(roles = []) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (roles.length === 0 || roles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Forbidden' });
  };
}

module.exports = { authenticate, authorize };
