const express = require('express');
const passport = require('passport');
const authController = require('../controllers/auth.controller');
const { isAuthenticated } = require('../middleware/auth.middleware');

const router = express.Router();

// =============================================================================
// GOOGLE OAUTH 2.0 ROUTES
// =============================================================================

// Initiate Google OAuth flow
// GET /api/v1/auth/google
router.get('/google', authController.googleLogin);

// Google OAuth callback handler
// GET /api/v1/auth/google/callback
router.get('/google/callback', authController.googleCallback);

// =============================================================================
// TOKEN MANAGEMENT ROUTES
// =============================================================================

// Refresh access token using refresh token cookie
// POST /api/v1/auth/refresh
router.post('/refresh', authController.refreshToken);

// Logout user and clear refresh token cookie
// POST /api/v1/auth/logout - Requires authentication
router.post('/logout', isAuthenticated, authController.logout);

// =============================================================================
// USER PROFILE ROUTES
// =============================================================================

// Get current authenticated user profile
// GET /api/v1/auth/me - Requires authentication
router.get('/me', isAuthenticated, authController.getProfile);

// =============================================================================
// DEVELOPMENT ONLY ROUTES (REMOVE BEFORE PRODUCTION)
// =============================================================================

// Test login endpoint for bypassing Google OAuth during development
// POST /api/v1/auth/test-login
// Request body: { "email": "test@student.com", "role": "student" }
// Response: { success: true, accessToken: "...", user: {...} }
router.post('/test-login', (req, res) => {
  const { email, role } = req.body;
  
  if (!email) {
    return res.status(400).json({ 
      success: false, 
      error: 'Email is required' 
    });
  }

  const { generateTokens } = require('../services/jwt.service');
 const testUserId = '507f1f77bcf86cd799439011'; // Valid 24-char hex ObjectId format
  const userRole = role === 'admin' ? 'admin' : 'student';
  
  const { accessToken, refreshToken } = generateTokens(testUserId, userRole);
  
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  res.json({ 
    success: true, 
    accessToken, 
    user: { 
      id: testUserId,
      email, 
      name: 'Test User', 
      role: userRole,
      avatar: 'https://ui-avatars.com/api/?name=Test+User'
    } 
  });
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================

module.exports = router;