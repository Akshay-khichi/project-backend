const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const passport = require('./config/passport');
const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const noteRoutes = require('./routes/note.routes');
const pyqRoutes = require('./routes/pyq.routes');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger'); // <-- Swagger spec import
const paymentRoutes = require('./routes/payment.routes');

const app = express();

// =============================================================================
// SECURITY & PARSING MIDDLEWARE (PRD §6.3)
// =============================================================================

app.use(helmet());

app.use(cors({ 
  origin: process.env.CLIENT_URL || 'http://localhost:5173', 
  credentials: true 
}));

app.use(express.json({ limit: '10mb' }));

app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(mongoSanitize());

// =============================================================================
// LOGGING
// =============================================================================

app.use(morgan('dev'));

// =============================================================================
// PASSPORT INITIALIZATION
// =============================================================================

app.use(passport.initialize());

// =============================================================================
// RATE LIMITING (PRD §10)
// =============================================================================

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later.' }
}));

// =============================================================================
// API ROUTES
// =============================================================================

// Authentication routes
app.use('/api/v1/auth', authRoutes);

// Category routes
app.use('/api/v1/categories', categoryRoutes);

// Note routes
app.use('/api/v1/notes', noteRoutes);

// PYQ routes
app.use('/api/v1/pyqs', pyqRoutes);

// =============================================================================
// API DOCUMENTATION (Swagger UI) <-- ADDED
// =============================================================================

// Serve Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: 'EduVault API Docs'
}));


app.use('/api/v1/payments', paymentRoutes);     // payment

// =============================================================================
// HEALTH CHECK ENDPOINT
// =============================================================================

app.get('/api/v1/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV 
  });
});

// =============================================================================
// TEMPORARY TEST ENDPOINT (REMOVE BEFORE PRODUCTION)
// =============================================================================

app.post('/api/v1/test', (req, res) => {
  console.log('[TEST] POST /api/v1/test received');
  console.log('[TEST] Body:', req.body);
  console.log('[TEST] Headers:', req.headers);
  
  res.json({ 
    success: true, 
    message: 'Backend is working', 
    received: req.body,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// GLOBAL ERROR HANDLER (MUST BE LAST)
// =============================================================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  
  res.status(statusCode).json({ 
    success: false, 
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    timestamp: new Date().toISOString()
  });
});

// =============================================================================
// EXPORT APP
// =============================================================================

module.exports = app;