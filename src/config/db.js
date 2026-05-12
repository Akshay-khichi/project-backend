const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 20,
      minPoolSize: 5,
    });
    console.log(' MongoDB connected');
    
    mongoose.connection.on('error', (err) => console.error(' MongoDB error:', err));
    mongoose.connection.on('disconnected', () => console.warn(' MongoDB disconnected'));
  } catch (err) {
    console.error(' MongoDB connection failed:', err);
    process.exit(1);
  }
};

module.exports = { connectDB };