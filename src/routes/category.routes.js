const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const { isAuthenticated, isAdmin } = require('../middleware/auth.middleware');

// =============================================================================
// PUBLIC ROUTES
// =============================================================================

// Get all categories (optional filter by type)
// GET /api/v1/categories?type=branch
router.get('/', async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};
    
    const categories = await Category.find(query)
      .select('-__v')
      .populate('parent', 'name slug type')
      .sort({ order: 1, createdAt: -1 });
    
    res.json({ success: true,  categories });
  } catch (err) {
    console.error('Category fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Get categories by specific type
// GET /api/v1/categories/branch
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['branch', 'semester', 'subject', 'unit'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid category type' });
    }
    
    const categories = await Category.find({ type })
      .select('name slug parent order')
      .sort({ order: 1 });
    
    res.json({ success: true,  categories });
  } catch (err) {
    console.error('Category type fetch error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// =============================================================================
// ADMIN ROUTES (PROTECTED)
// =============================================================================

// Create new category
// POST /api/v1/categories
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, type, slug, parent, order } = req.body;
    
    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Name and type are required' });
    }
    
    const validTypes = ['branch', 'semester', 'subject', 'unit'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ success: false, error: 'Invalid category type' });
    }
    
    const categorySlug = slug || name.toLowerCase().replace(/\s+/g, '-');
    
    const existing = await Category.findOne({ slug: categorySlug });
    if (existing) {
      return res.status(400).json({ success: false, error: 'Slug already exists' });
    }
    
    const category = await Category.create({
      name,
      type,
      slug: categorySlug,
      parent: parent || null,
      order: order || 0,
      createdBy: req.user.userId
    });
    
    res.status(201).json({ success: true,  category });
  } catch (err) {
    console.error('Category create error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Update category
// PUT /api/v1/categories/:id
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, parent, order } = req.body;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    if (slug && slug !== category.slug) {
      const existing = await Category.findOne({ slug });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Slug already exists' });
      }
    }
    
    category.name = name || category.name;
    category.slug = slug || category.slug;
    category.parent = parent !== undefined ? parent : category.parent;
    category.order = order !== undefined ? order : category.order;
    
    await category.save();
    
    res.json({ success: true,  category });
  } catch (err) {
    console.error('Category update error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Delete category (only if no content linked)
// DELETE /api/v1/categories/:id
router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found' });
    }
    
    // Check if any notes or PYQs reference this category
    const Note = require('../models/Note');
    const PYQ = require('../models/PYQ');
    
    const linkedNotes = await Note.countDocuments({ 
      $or: [{ branch: id }, { semester: id }, { subject: id }, { unit: id }] 
    });
    
    const linkedPYQs = await PYQ.countDocuments({ 
      $or: [{ branch: id }, { semester: id }, { subject: id }] 
    });
    
    if (linkedNotes > 0 || linkedPYQs > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete category with linked content' 
      });
    }
    
    await Category.findByIdAndDelete(id);
    
    res.json({ success: true, message: 'Category deleted' });
  } catch (err) {
    console.error('Category delete error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// =============================================================================
// EXPORT ROUTER
// =============================================================================

module.exports = router;