const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const { isAuthenticated } = require('../middleware/auth.middleware');
const fs = require('fs');
const upload = require('../middleware/upload.middleware');
const cloudinary = require('../config/cloudinary');
const { checkPremiumAccess } = require('../middleware/premium.middleware');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

/**
 * @openapi
 * /api/v1/notes/upload:
 *   post:
 *     summary: Upload PDF and create a new note
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               branch:
 *                 type: string
 *               semester:
 *                 type: string
 *               subject:
 *                 type: string
 *               unit:
 *                 type: string
 *               tags:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.post('/upload', isAuthenticated, upload.single('file'), async (req, res) => {
  let tempFilePath = null;
  
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'PDF file is required' });
    }

    tempFilePath = req.file.path;
    console.log(' Uploading to Cloudinary from:', tempFilePath);

    const cloudinaryResult = await cloudinary.uploader.upload(tempFilePath, {
      folder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'eduvault-dev',
      resource_type: 'raw',
      public_id: `note-${Date.now()}-${Math.round(Math.random() * 1E9)}`
    });

    console.log(' Cloudinary URL:', cloudinaryResult.secure_url);

    const { title, description, branch, semester, subject, unit, tags } = req.body;
    
    if (!title || !branch || !semester || !subject) {
      await cloudinary.uploader.destroy(cloudinaryResult.public_id, { resource_type: 'raw' });
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }

    let parsedTags = [];
    try { parsedTags = tags ? JSON.parse(tags) : []; } catch (e) { parsedTags = []; }

    const note = await Note.create({
      title,
      description: description || '',
      branch,
      semester,
      subject,
      unit: unit || null,
      fileUrl: cloudinaryResult.secure_url,
      filePublicId: cloudinaryResult.public_id,
      fileSize: req.file.size,
      uploadedBy: req.user.userId,
      tags: parsedTags
    });

    if (tempFilePath && fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }

    res.status(201).json({ success: true,  note });
  } catch (err) {
    console.error(' Upload Failed:', err.message);
    if (tempFilePath && fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch (e) {}
    }
    res.status(500).json({ success: false, error: `Upload failed: ${err.message}` });
  }
});

/**
 * @openapi
 * /api/v1/notes:
 *   get:
 *     summary: Get all notes with filtering and pagination
 *     tags: [Notes]
 *     parameters:
 *       - in: query
 *         name: branch
 *         schema:
 *           type: string
 *         description: Filter by branch category ID
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter by semester category ID
 *       - in: query
 *         name: subject
 *         schema:
 *           type: string
 *         description: Filter by subject category ID
 *       - in: query
 *         name: unit
 *         schema:
 *           type: string
 *         description: Filter by unit category ID
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search in title and tags
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of notes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/', async (req, res) => {
  try {
    const { branch, semester, subject, unit, page = 1, limit = 20, search } = req.query;
    
    const query = { isDeleted: false };
    if (branch) query.branch = branch;
    if (semester) query.semester = semester;
    if (subject) query.subject = subject;
    if (unit) query.unit = unit;
    if (search) query.$text = { $search: search };
    
    const notes = await Note.find(query)
      .select('-__v')
      .populate('branch', 'name slug')
      .populate('semester', 'name slug')
      .populate('subject', 'name slug')
      .populate('unit', 'name slug')
      .populate('uploadedBy', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Note.countDocuments(query);
    
    res.json({
      success: true,
       notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    console.error('Note fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @openapi
 * /api/v1/notes/{id}:
 *   get:
 *     summary: Get a single note by ID
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Note ID
 *     responses:
 *       200:
 *         description: Note found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Note not found
 */
router.get('/:id', async (req, res) => {
  try {
    const note = await Note.findById(req.params.id)
      .select('-__v')
      .populate('branch', 'name slug')
      .populate('semester', 'name slug')
      .populate('subject', 'name slug')
      .populate('unit', 'name slug')
      .populate('uploadedBy', 'name avatar');
    
    if (!note || note.isDeleted) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    
    res.json({ success: true,  note });
  } catch (err) {
    console.error('Note fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// =============================================================================
// PROTECTED ROUTES
// =============================================================================

/**
 * @openapi
 * /api/v1/notes:
 *   post:
 *     summary: Create a new note (with manual fileUrl)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - branch
 *               - semester
 *               - subject
 *               - fileUrl
 *               - filePublicId
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               branch:
 *                 type: string
 *               semester:
 *                 type: string
 *               subject:
 *                 type: string
 *               unit:
 *                 type: string
 *               fileUrl:
 *                 type: string
 *               filePublicId:
 *                 type: string
 *               fileSize:
 *                 type: integer
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Note created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const { title, description, branch, semester, subject, unit, fileUrl, filePublicId, fileSize, tags } = req.body;
    
    if (!title || !branch || !semester || !subject || !fileUrl || !filePublicId) {
      return res.status(400).json({ success: false, error: 'Required fields missing' });
    }
    
    const note = await Note.create({
      title,
      description,
      branch,
      semester,
      subject,
      unit: unit || null,
      fileUrl,
      filePublicId,
      fileSize: fileSize || null,
      uploadedBy: req.user.userId,
      tags: tags || []
    });
    
    res.status(201).json({ success: true,  note });
  } catch (err) {
    console.error('Note create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @openapi
 * /api/v1/notes/{id}:
 *   put:
 *     summary: Update a note (owner or admin only)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               unit:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Note updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Note not found
 */
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || note.isDeleted) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.uploadedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    const { title, description, unit, tags } = req.body;
    note.title = title || note.title;
    note.description = description !== undefined ? description : note.description;
    note.unit = unit !== undefined ? unit : note.unit;
    note.tags = tags || note.tags;
    
    await note.save();
    res.json({ success: true,  note });
  } catch (err) {
    console.error('Note update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @openapi
 * /api/v1/notes/{id}:
 *   delete:
 *     summary: Soft delete a note (owner or admin only)
 *     tags: [Notes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Note deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Note not found
 */
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);
    if (!note || note.isDeleted) {
      return res.status(404).json({ success: false, error: 'Note not found' });
    }
    if (note.uploadedBy.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }
    
    note.isDeleted = true;
    await note.save();
    res.json({ success: true, message: 'Note deleted' });
  } catch (err) {
    console.error('Note delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * @openapi
 * /api/v1/notes/{id}/download:
 *   post:
 *     summary: Increment download count for a note
 *     tags: [Notes]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Download count incremented
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
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