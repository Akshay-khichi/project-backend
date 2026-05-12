require('dotenv').config({ path: './.env' });
const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(` Server running on http://localhost:${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
};

startServer();