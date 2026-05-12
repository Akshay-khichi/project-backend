const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'EduVault API',
      version: '1.0.0',
      description: 'Student resource sharing platform API - Notes, PYQs, and Categories',
    },
    servers: [
      { url: 'http://localhost:5000', description: 'Development Server' },
      { url: 'https://api.eduvault.com', description: 'Production Server' }
    ],
    tags: [
      { name: 'Auth', description: 'Authentication & user management' },
      { name: 'Categories', description: 'Branch/Semester/Subject/Unit hierarchy' },
      { name: 'Notes', description: 'Study notes with PDF uploads' },
      { name: 'PYQs', description: 'Previous Year Questions with PDF uploads' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token: `Bearer <your_token>`'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '507f1f77bcf86cd799439011' },
            name: { type: 'string', example: 'Test User' },
            email: { type: 'string', format: 'email', example: 'test@student.com' },
            role: { type: 'string', enum: ['student', 'admin'], example: 'student' },
            avatar: { type: 'string', example: 'https://ui-avatars.com/api/?name=Test+User' },
            isActive: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '69e197068b242b49bc452739' },
            name: { type: 'string', example: 'Computer Science' },
            type: { type: 'string', enum: ['branch', 'semester', 'subject', 'unit'], example: 'branch' },
            slug: { type: 'string', example: 'cse' },
            parent: { type: 'object', nullable: true },
            order: { type: 'integer', example: 1 },
            createdBy: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Note: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '69e22584846b867eb60654e7' },
            title: { type: 'string', example: 'DSA Complete Notes' },
            description: { type: 'string', example: 'Study material for Arrays' },
            branch: { type: 'string', example: '69e197068b242b49bc452739' },
            semester: { type: 'string', example: '69e197068b242b49bc45273c' },
            subject: { type: 'string', example: '69e197068b242b49bc45273e' },
            unit: { type: 'string', nullable: true, example: '69e197068b242b49bc452740' },
            fileUrl: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/dggmxbj0k/raw/upload/v123456/note.pdf' },
            filePublicId: { type: 'string', example: 'eduvault-dev/note-123' },
            fileSize: { type: 'integer', example: 249643 },
            downloadCount: { type: 'integer', example: 0 },
            uploadedBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
            tags: { type: 'array', items: { type: 'string' }, example: ['arrays', 'dsa'] },
            isDeleted: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['title', 'branch', 'semester', 'subject', 'fileUrl', 'filePublicId', 'uploadedBy']
        },
        PYQ: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '69e22584846b867eb60654e8' },
            title: { type: 'string', example: 'DSA End Semester 2023' },
            description: { type: 'string', example: 'Previous year question paper' },
            branch: { type: 'string', example: '69e197068b242b49bc452739' },
            semester: { type: 'string', example: '69e197068b242b49bc45273c' },
            subject: { type: 'string', example: '69e197068b242b49bc45273e' },
            year: { type: 'integer', example: 2023 },
            examType: { type: 'string', enum: ['mid-sem', 'end-sem', 'supplementary'], example: 'end-sem' },
            solutions: { type: 'string', format: 'uri', nullable: true },
            fileUrl: { type: 'string', format: 'uri', example: 'https://res.cloudinary.com/dggmxbj0k/raw/upload/v123456/pyq.pdf' },
            filePublicId: { type: 'string', example: 'eduvault-dev/pyq-123' },
            fileSize: { type: 'integer', example: 512000 },
            downloadCount: { type: 'integer', example: 0 },
            uploadedBy: { type: 'string', example: '507f1f77bcf86cd799439011' },
            tags: { type: 'array', items: { type: 'string' }, example: ['dsa', '2023'] },
            isDeleted: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          },
          required: ['title', 'branch', 'semester', 'subject', 'year', 'examType', 'fileUrl', 'filePublicId', 'uploadedBy']
        },
        Pagination: {
          type: 'object',
          properties: {
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 20 },
            total: { type: 'integer', example: 45 },
            pages: { type: 'integer', example: 3 }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: { type: 'string', example: 'Invalid or expired token' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object' },
            message: { type: 'string', example: 'Operation successful' }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);