const mongoose = require('mongoose');

const uri = process.env.URI 

async function main() {
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const db = mongoose.connection;
  const collName = 'ys_store_users';
  const coll = db.collection(collName);
  console.log('Connected to', uri);

  const indexes = await coll.indexes();
  const emailIndex = indexes.find(idx => idx.key && idx.key.Email === 1);
  if (emailIndex) {
    console.log('Existing Email index found:', emailIndex.name);
    try {
      await coll.dropIndex(emailIndex.name);
      console.log('Dropped index', emailIndex.name);
    } catch (err) {
      console.error('Failed to drop index:', err.message || err);
    }
  } else {
    console.log('No existing Email index found.');
  }

  // Find documents with Email null or missing and give them a unique placeholder
  const cursor = coll.find({ $or: [{ Email: null }, { Email: { $exists: false } }] });
  let updated = 0;
  while (await cursor.hasNext()) {
    const doc = await cursor.next();
    const newEmail = `__deleted_${doc._id}@invalid.local`;
    await coll.updateOne({ _id: doc._id }, { $set: { Email: newEmail } });
    updated++;
  }
  console.log('Updated', updated, 'documents with placeholder Emails');

  // Create partial unique index
  try {
    await coll.createIndex(
      { Email: 1 },
      { unique: true, partialFilterExpression: { Email: { $exists: true, $ne: null } } }
    );
    console.log('Created partial unique index on Email');
  } catch (err) {
    console.error('Failed to create partial index:', err.message || err);
  }

  await mongoose.disconnect();
  console.log('Done. Disconnected.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
