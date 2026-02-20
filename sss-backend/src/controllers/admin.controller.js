const { Admin, Center } = require('../models');

const roleHierarchy = ['viewer', 'pod_admin', 'admin', 'super_admin'];

const canManageRole = (actorRole, targetRole) => {
  return roleHierarchy.indexOf(actorRole) > roleHierarchy.indexOf(targetRole);
};

exports.getAdmins = async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.admin.role === 'pod_admin') {
      filter.center = req.admin.center;
    }
    const admins = await Admin.find(filter).select('-passwordHash');
    res.status(200).json({ success: true, data: admins });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id).select('-passwordHash');
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }
    if (req.admin.role === 'pod_admin' && admin.center?.toString() !== req.admin.center.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createAdmin = async (req, res) => {
  try {
    const { email, password, name, role, center, phone } = req.body;

    // Basic input validation (kept lightweight here; login uses express-validator)
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }
    // Keep format consistent with /auth/admin/login (which requires a valid email)
    const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailLooksValid) {
      return res.status(400).json({ success: false, message: 'Valid email is required' });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Password is required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const phoneStr = String(phone || '').trim();
    if (!phoneStr) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!/^\d{10}$/.test(phoneStr)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
    }

    if (req.admin.role === 'viewer') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!canManageRole(req.admin.role, role)) {
      return res.status(403).json({ success: false, message: 'Insufficient role permissions' });
    }

    if (req.admin.role === 'pod_admin') {
      if (role !== 'viewer') {
        return res.status(403).json({ success: false, message: 'pod_admin can only create viewers' });
      }
      if (center !== req.admin.center.toString()) {
        return res.status(403).json({ success: false, message: 'Invalid center' });
      }
    }

    if (center) {
      const centerDoc = await Center.findById(center);
      if (!centerDoc) {
        return res.status(400).json({ success: false, message: 'Center not found' });
      }
    }

    const admin = await Admin.create({
      email,
      passwordHash: password,
      name,
      role,
      center: center || null,
      phone: phoneStr
    });

    const created = await Admin.findById(admin._id).select('-passwordHash');
    res.status(201).json({ success: true, data: created });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }
    if (error?.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (req.admin.role === 'viewer') {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (!canManageRole(req.admin.role, admin.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient role permissions' });
    }

    if (req.admin.role === 'pod_admin' && admin.center?.toString() !== req.admin.center.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, phone, isActive } = req.body;
    if (name !== undefined) admin.name = name;
    if (phone !== undefined) {
      const phoneStr = String(phone || '').trim();
      if (!phoneStr) {
        return res.status(400).json({ success: false, message: 'Phone number is required' });
      }
      if (!/^\d{10}$/.test(phoneStr)) {
        return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
      }
      admin.phone = phoneStr;
    }
    if (isActive !== undefined) admin.isActive = isActive;

    await admin.save();
    const updated = await Admin.findById(admin._id).select('-passwordHash');
    res.status(200).json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    if (!canManageRole(req.admin.role, admin.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient role permissions' });
    }

    admin.isActive = false;
    await admin.save();

    res.status(200).json({ success: true, message: 'Admin deactivated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
