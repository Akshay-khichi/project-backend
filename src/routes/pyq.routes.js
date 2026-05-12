const express = require('express');
const router = express.Router();
const PYQ = require('../models/PYQ');
const { isAuthenticated } = require('../middleware/auth.middleware');
const { checkPremiumAccess } = require('../middleware/premium.middleware');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

// Get PYQs with filtering, search, and pagination
router.get('/', async (req, res) => {
  try {
    const { branch, semester, subject, year, examType, page = 1, limit = 20, search } = req.query;
    
    const query = { isDeleted: false };
    if (branch) query.branch = branch;
    if (semester) query.semester = semester;
    if (subject) query.subject = subject;
    if (year) query.year = parseInt(year);
    if (examType) query.examType = examType;
    if (search) query.$text = { $search: search };
    
    const pyqs = await PYQ.find(query)
      .select('-__v')
      .populate('branch', 'name slug')
      .populate('semester', 'name slug')
      .populate('subject', 'name slug')
      .populate('uploadedBy', 'name avatar')
      .sort({ year: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await PYQ.countDocuments(query);
    
    res.json({
      success: true,
       pyqs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('PYQ fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get single PYQ by ID
router.get('/:id', async (req, res) => {
  try {
    const pyq = await PYQ.findById(req.params.id)
      .select('-__v')
      .populate('branch', 'name slug')
      .populate('semester', 'name slug')
      .populate('subject', 'name slug')
      .populate('uploadedBy', 'name avatar');
    
    if (!pyq || pyq.isDeleted) {
      return res.status(404).json({ success: false, error: 'PYQ not found' });
    }
    
    res.json({ success: true,  pyq });
  } catch (err) {
    console.error('PYQ fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// =============================================================================
// PROTECTED ROUTES
// =============================================================================

// Create new PYQ
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { title, description, branch, semester, subject, year, examType, solutions, fileUrl, filePublicId, fileSize, tags } = req.body;
    
    if (!title || !branch || !semester || !subject || !year || !examType || !fileUrl || !filePublicId) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }
    
    const validExamTypes = ['mid-sem', 'end-sem', 'supplementary'];
    if (!validExamTypes.includes(examType)) {
      return res.status(400).json({ success: false, error: 'Invalid exam type' });
    }
    
    const pyq = await PYQ.create({
      title,
      description,
      branch,
      semester,
      subject,
      year: parseInt(year),
      examType,
      solutions: solutions || null,
      fileUrl,
      filePublicId,
      fileSize: fileSize || null,
      uploadedBy: req.user.userId,
      tags: tags || []
    });
    
    res.status(201).json({ success: true,  pyq });
  } catch (err) {
    console.error('PYQ create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update PYQ (owner or admin)
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const pyq = await PYQ.findById(req.params.id);
    if (!pyq || pyq.isDeleted) {
      return res.status(404).json({ success: false, error: 'PYQ not found' });
    }
    if (pyq.uploadedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    const { title, description, solutions, tags } = req.body;
    pyq.title = title || pyq.title;
    pyq.description = description !== undefined ? description : pyq.description;
    pyq.solutions = solutions !== undefined ? solutions : pyq.solutions;
    pyq.tags = tags || pyq.tags;
    
    await pyq.save();
    res.json({ success: true,  pyq });
  } catch (err) {
    console.error('PYQ update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Soft delete PYQ (owner or admin)
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const pyq = await PYQ.findById(req.params.id);
    if (!pyq || pyq.isDeleted) {
      return res.status(404).json({ success: false, error: 'PYQ not found' });
    }
    if (pyq.uploadedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    pyq.isDeleted = true;
    await pyq.save();
    res.json({ success: true, message: 'PYQ deleted' });
  } catch (err) {
    console.error('PYQ delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Increment download count
router.get('/:id/download', isAuthenticated, checkPremiumAccess, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id); // or PYQ
    note.downloadCount += 1;
    await note.save();
    res.json({ success: true, downloadUrl: note.fileUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Download failed' });
  }
});

module.exports = router;