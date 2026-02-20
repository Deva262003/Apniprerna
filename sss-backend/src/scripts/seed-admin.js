require('dotenv').config();
const mongoose = require('mongoose');
const { Admin } = require('../models');

async function seedAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Check if admin exists
    const existingAdmin = await Admin.findOne({ email: 'admin@apnipathshala.org' });

    if (existingAdmin) {
    } else {
      // Create admin
      const admin = await Admin.create({
        email: 'admin@apnipathshala.org',
        passwordHash: 'Admin@123',
        name: 'Admin',
        role: 'super_admin'
      });

    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedAdmin();
