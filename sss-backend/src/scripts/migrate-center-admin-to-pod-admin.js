require('dotenv').config();
const mongoose = require('mongoose');
const { Admin } = require('../models');

async function run() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const result = await Admin.updateMany(
    { role: 'center_admin' },
    { $set: { role: 'pod_admin' } }
  );

  const modified = result.modifiedCount ?? result.nModified ?? 0;
  const matched = result.matchedCount ?? result.n ?? 0;

  console.info(`Matched: ${matched}`);
  console.info(`Modified: ${modified}`);

  await mongoose.disconnect();
}

run()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
