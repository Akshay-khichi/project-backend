const passport = require('passport');
const { generateTokens, verifyToken } = require('../services/jwt.service');
const User = require('../models/User');

exports.googleLogin = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleCallback = (req, res, next) => {
  passport.authenticate('google', { session: false }, (err, user, info) => {
    console.log('OAuth Callback - Error:', err);
    console.log('OAuth Callback - User:', user);
    console.log('OAuth Callback - Info:', info);
    
    if (err || !user) {
      console.error('Authentication failed:', err || 'No user returned');
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    try {
      const { accessToken, refreshToken } = generateTokens(user.id, user.role);

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
      });

      res.redirect(`${process.env.CLIENT_URL}/dashboard?accessToken=${accessToken}`);
    } catch (error) {
      console.error('Token generation failed:', error);
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }
  })(req, res, next);
};

exports.refreshToken = async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ success: false, error: 'Refresh token missing' });
  }

  const decoded = verifyToken(refreshToken, process.env.JWT_REFRESH_SECRET);
  if (!decoded) {
    return res.status(401).json({ success: false, error: 'Invalid refresh token' });
  }

  const user = await User.findById(decoded.userId).select('role');
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, error: 'User not found or inactive' });
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user.id, user.role);

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ success: true, accessToken });
};

exports.logout = (req, res) => {
  res.clearCookie('refreshToken');
  res.json({ success: true, message: 'Logged out successfully' });
};

exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-__v');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};