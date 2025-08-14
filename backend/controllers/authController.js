
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const Admin = require('../models/admin');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerAdmin = async (req, res) => {
    const { name, email, password, role } = req.body;
    try {
        const adminExists = await Admin.findOne({ email });
        if (adminExists) return res.status(400).json({ message: 'Admin already exists' });

        const admin = await Admin.create({ name, email, password, role });
        res.status(201).json({ id: admin.id, name: admin.name, email: admin.email, token: generateToken(admin.id), role: admin.role });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const loginAdmin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const admin = await Admin.findOne({ email, status: 1  });
        if (admin && (await bcrypt.compare(password, admin.password))) {
            res.json({ id: admin.id, name: admin.name, email: admin.email, token: generateToken(admin.id), role: admin.role });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getadmin = async (req, res) => {
    try {
      const admin = await Admin.findById(req.admin.id);
      if (!admin) {
        return res.status(404).json({ message: 'Admin not found' });
      }
  
      res.status(200).json({
        name: admin.name,
        email: admin.email,
        password: admin.password,
        notification: admin.notification,
        role: admin.role
      });
    } catch (error) {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };

  const getAdmins = async (req, res) => {
      try {
          const admin = await Admin.find({ status: 1 });
          res.json(admin);
      } catch (error) {
          res.status(500).json({ message: error.message });
      }
  };
  

const updateAdmin = async (req, res) => {
  try {
    const me = await Admin.findById(req.admin.id);
    if (!me) return res.status(404).json({ message: 'Admin not found' });

    const { id, email, password, notification, role, status } = req.body;
    const isSuper = me.role === 'super';
    const targetId = (isSuper && id) ? id : me.id;
    if (!isSuper && id && id !== me.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const target = await Admin.findById(targetId);
    if (!target) return res.status(404).json({ message: 'Target admin not found' });

    if (status === 0 && targetId === me.id) {
      return res.status(400).json({ message: 'Cannot delete yourself' });
    }

    if ((status === 0 || (role && role !== 'super')) && target.role === 'super') {
      const superCount = await Admin.countDocuments({ role: 'super', status: 1 });
      if (superCount <= 1) {
        return res.status(400).json({ message: 'At least one super admin is required' });
      }
    }
    if (typeof email !== 'undefined' && targetId === me.id) {
      target.email = email; 
    }
    if (password) target.password = password;
    if (typeof notification !== 'undefined') target.notification = Boolean(notification);

    if (isSuper) {
      if (typeof role !== 'undefined') target.role = role;
      if (typeof status !== 'undefined') target.status = status;
    } else {
      target.status = target.status ?? 1;
      target.role   = target.role   ?? 'admin';
    }

    const updated = await target.save();
    const payload = {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
      notification: updated.notification,
      role: updated.role,
    };
    if (targetId === me.id) {
      return res.json({ ...payload, token: jwt.sign({ id: updated.id }, process.env.JWT_SECRET, { expiresIn: '30d' }) });
    }
    return res.json(payload);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerAdmin, loginAdmin, getadmin, updateAdmin, getAdmins };