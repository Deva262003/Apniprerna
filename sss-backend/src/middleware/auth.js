const jwt = require('jsonwebtoken');
const { Admin, Session, Student, Parent } = require('../models');

// Protect admin routes - verify JWT token
const protectAdmin = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Backward-compatible token kind check.
      // New tokens should include kind: 'admin'; parent tokens include kind: 'parent'.
      if (decoded.kind && decoded.kind !== 'admin') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized'
        });
      }

      const admin = await Admin.findById(decoded.id).select('-passwordHash');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found'
        });
      }

      if (!admin.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      req.admin = admin;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Protect student/extension routes - verify session token
const protectStudent = async (req, res, next) => {
  try {
    const sessionToken = req.headers['x-session-token'];

    if (!sessionToken) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no session token'
      });
    }

    const session = await Session.findOne({
      sessionToken,
      status: 'active',
      expiresAt: { $gt: new Date() }
    }).populate({
      path: 'student',
      select: '-pinHash',
      populate: { path: 'center', select: 'name code' }
    });

    if (!session) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid'
      });
    }

    if (!session.student.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Student account is deactivated'
      });
    }

    req.session = session;
    req.student = session.student;
    next();
  } catch (error) {
    next(error);
  }
};

// Protect parent routes - verify JWT token
const protectParent = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.kind !== 'parent') {
        return res.status(401).json({
          success: false,
          message: 'Not authorized'
        });
      }

      const parent = await Parent.findById(decoded.id).select('-passwordHash');
      if (!parent) {
        return res.status(401).json({
          success: false,
          message: 'Parent not found'
        });
      }

      if (!parent.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Account is deactivated'
        });
      }

      req.parent = parent;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, token invalid'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Role-based access control
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    if (!roles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: `Role ${req.admin.role} is not authorized to access this route`
      });
    }

    next();
  };
};

// Center-specific access (admin can only access their assigned center)
const centerAccess = async (req, res, next) => {
  try {
    if (req.admin.role === 'super_admin') {
      // Super admin has access to all centers
      return next();
    }

    const centerId = req.params.centerId || req.body.center || req.query.centerId;

    if (centerId && req.admin.center && req.admin.center.toString() !== centerId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this center'
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  protectAdmin,
  protectStudent,
  protectParent,
  authorize,
  centerAccess
};
