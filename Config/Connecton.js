const mongoose = require('mongoose');

async function connectDB(uri) {
    const mongoUri = uri || process.env.URI;
    if (!mongoUri) {
        console.error('connectDB: MONGODB URI not provided (process.env.URI)');
        throw new Error('Missing MongoDB URI');
    }

    mongoose.connection.on('connected', () => console.log('Mongoose connected'));
    mongoose.connection.on('error', (err) => console.error('Mongoose connection error:', err));
    mongoose.connection.on('disconnected', () => console.warn('Mongoose disconnected'));

    try {
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('connectDB: connected to MongoDB');
    } catch (err) {
        console.error('connectDB: connection failed:', err.message);
        throw err;
    }
}

module.exports = connectDB;