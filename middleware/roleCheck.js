// middleware/roleCheck.js
// Higher‑order middleware to enforce required user role(s).
// Usage: app.use('/api/admin', roleCheck(['SuperAdmin']));

module.exports = function roleCheck(allowedRoles) {
  return (req, res, next) => {
    // auth middleware should have attached req.user
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthenticated' });
    }
    const userRole = req.user.role;
    // Allow exact matches OR treat any role containing "user" as a user role when 'user' is allowed
    const isAllowed = allowedRoles.some(ar => userRole && userRole.toLowerCase().includes(ar.toLowerCase()));
    if (!isAllowed) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};
