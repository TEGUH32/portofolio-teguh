import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import nodemailer from 'nodemailer';
import winston from 'winston';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =====================================================
// CONFIGURATION
// =====================================================

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Simple in-memory cache (instead of Redis)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 menit

// Cloudinary config
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  logger.info('✅ Cloudinary configured');
} else {
  logger.warn('⚠️ Cloudinary credentials missing, file uploads will be saved locally only');
}

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// Email transporter
let transporter;
try {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    logger.info('✅ Email transporter configured');
  } else {
    logger.warn('⚠️ Email credentials missing, emails will be logged only');
    transporter = null;
  }
} catch (error) {
  logger.error('❌ Email transporter error:', error.message);
  transporter = null;
}

// =====================================================
// MONGODB SCHEMAS
// =====================================================

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profilePicture: { type: String, default: '' },
  bio: { type: String, default: '' },
  socialLinks: {
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// Project Schema
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  longDescription: { type: String, default: '' },
  image: { type: String, default: '' },
  images: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
  category: { type: String, enum: ['web', 'mobile', 'ai', 'automation'], default: 'web' },
  liveUrl: { type: String, default: '' },
  githubUrl: { type: String, default: '' },
  featured: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Article Schema
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  excerpt: { type: String, required: true },
  content: { type: String, required: true },
  coverImage: { type: String, default: '' },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: { type: [String], default: [] },
  category: { type: String, default: 'general' },
  readTime: { type: Number, default: 5 },
  views: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  comments: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  published: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Message Schema
const messageSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  read: { type: Boolean, default: false },
  replied: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Chat History Schema
const chatHistorySchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
  page: { type: String, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  referrer: { type: String, default: 'direct' },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Create models
const User = mongoose.model('User', userSchema);
const Project = mongoose.model('Project', projectSchema);
const Article = mongoose.model('Article', articleSchema);
const Message = mongoose.model('Message', messageSchema);
const ChatHistory = mongoose.model('ChatHistory', chatHistorySchema);
const Analytics = mongoose.model('Analytics', analyticsSchema);

// =====================================================
// MIDDLEWARE
// =====================================================

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// CORS options
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : ['http://localhost:3000', 'http://localhost:5500', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Admin middleware
const isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Analytics middleware
const trackAnalytics = async (req, res, next) => {
  // Skip untuk static files
  if (req.path.startsWith('/uploads/') || req.path.includes('.')) {
    return next();
  }
  
  try {
    const analytics = new Analytics({
      page: req.path,
      ip: req.ip || req.socket.remoteAddress || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'unknown',
      referrer: req.headers['referer'] || 'direct'
    });
    
    // Jangan blocking request
    analytics.save().catch(err => 
      logger.error('Analytics save error:', err)
    );
  } catch (error) {
    logger.error('Analytics error:', error);
  }
  next();
};

// =====================================================
// MIDDLEWARE USAGE
// =====================================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use(trackAnalytics);

// Apply rate limiting to API routes
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// =====================================================
// DATABASE CONNECTION
// =====================================================

async function connectToMongoDB() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    
    if (!mongoUri) {
      throw new Error('MONGODB_URI tidak ditemukan di file .env');
    }

    logger.info('🔄 Menghubungkan ke MongoDB Atlas...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    logger.info('✅ Connected to MongoDB Atlas');
    
    // Create indexes
    await createIndexes();
    
    // Create admin user if not exists
    await createAdminUser();
    
    // Create sample data if empty
    await createSampleData();
    
  } catch (error) {
    logger.error('❌ MongoDB connection error:', error.message);
    logger.error('💡 Tips: Periksa MONGODB_URI di file .env');
    process.exit(1);
  }
}

async function createIndexes() {
  try {
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ username: 1 }, { unique: true });
    await Project.collection.createIndex({ category: 1 });
    await Project.collection.createIndex({ featured: 1 });
    await Project.collection.createIndex({ createdAt: -1 });
    await Article.collection.createIndex({ slug: 1 }, { unique: true });
    await Article.collection.createIndex({ tags: 1 });
    await Article.collection.createIndex({ createdAt: -1 });
    await ChatHistory.collection.createIndex({ sessionId: 1 });
    await ChatHistory.collection.createIndex({ updatedAt: -1 });
    await Analytics.collection.createIndex({ timestamp: -1 });
    await Analytics.collection.createIndex({ page: 1 });
    
    logger.info('✅ Database indexes created');
  } catch (error) {
    logger.error('Error creating indexes:', error.message);
  }
}

async function createAdminUser() {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      await User.create({
        username: 'admin',
        email: 'admin@teguh.dev',
        password: hashedPassword,
        role: 'admin',
        profilePicture: '',
        bio: 'Administrator of Teguh Portfolio',
        socialLinks: {
          github: 'https://github.com/teguh',
          linkedin: 'https://linkedin.com/in/teguh',
          twitter: 'https://twitter.com/teguh',
          instagram: 'https://instagram.com/teguh'
        }
      });
      logger.info('✅ Admin user created');
      logger.info('📧 Email: admin@teguh.dev');
      logger.info('🔑 Password: Admin123!');
    } else {
      logger.info('✅ Admin user already exists');
    }
  } catch (error) {
    logger.error('Error creating admin user:', error.message);
  }
}

async function createSampleData() {
  try {
    const projectCount = await Project.countDocuments();
    const articleCount = await Article.countDocuments();
    
    if (projectCount === 0) {
      logger.info('📦 Creating sample projects...');
      
      const sampleProjects = [
        {
          title: 'AI-Powered Dashboard',
          description: 'Interactive dashboard with AI insights and real-time analytics',
          longDescription: 'A comprehensive dashboard that uses machine learning to provide business insights, predict trends, and automate reporting.',
          technologies: ['React', 'TensorFlow.js', 'Node.js', 'MongoDB'],
          category: 'web',
          featured: true,
          image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
          githubUrl: 'https://github.com/teguh/ai-dashboard',
          liveUrl: 'https://ai-dashboard.demo.com',
          views: 1234,
          likes: 89
        },
        {
          title: 'Smart Automation Bot',
          description: 'Telegram bot for task automation and reminders',
          longDescription: 'A intelligent bot that helps users automate daily tasks, set reminders, and integrate with various APIs.',
          technologies: ['Python', 'Telegram API', 'Redis', 'Docker'],
          category: 'automation',
          featured: true,
          image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800',
          githubUrl: 'https://github.com/teguh/auto-bot',
          liveUrl: 'https://t.me/smartauto_bot',
          views: 2341,
          likes: 156
        },
        {
          title: 'E-Commerce Platform',
          description: 'Modern e-commerce with AI product recommendations',
          longDescription: 'Full-featured e-commerce platform with personalized product recommendations based on user behavior.',
          technologies: ['Next.js', 'Stripe', 'PostgreSQL', 'Redis'],
          category: 'web',
          featured: true,
          image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800',
          githubUrl: 'https://github.com/teguh/ecommerce',
          liveUrl: 'https://ecommerce.demo.com',
          views: 3456,
          likes: 234
        }
      ];
      
      await Project.insertMany(sampleProjects);
      logger.info(`✅ Created ${sampleProjects.length} sample projects`);
    }
    
    if (articleCount === 0) {
      logger.info('📦 Creating sample articles...');
      
      const admin = await User.findOne({ role: 'admin' });
      
      const sampleArticles = [
        {
          title: 'Getting Started with AI in Web Development',
          slug: 'getting-started-with-ai-in-web-development',
          excerpt: 'Learn how to integrate AI and machine learning into your web applications',
          content: 'Artificial Intelligence is revolutionizing web development...',
          coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
          author: admin._id,
          tags: ['AI', 'Web Development', 'Machine Learning'],
          category: 'AI',
          readTime: 8,
          views: 567,
          likes: 45
        },
        {
          title: 'Building Scalable Node.js Applications',
          slug: 'building-scalable-nodejs-applications',
          excerpt: 'Best practices for building production-ready Node.js applications',
          content: 'When building Node.js applications for production...',
          coverImage: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800',
          author: admin._id,
          tags: ['Node.js', 'Backend', 'Scalability'],
          category: 'Backend',
          readTime: 12,
          views: 890,
          likes: 67
        }
      ];
      
      await Article.insertMany(sampleArticles);
      logger.info(`✅ Created ${sampleArticles.length} sample articles`);
    }
  } catch (error) {
    logger.error('Error creating sample data:', error.message);
  }
}

// Connect to MongoDB
await connectToMongoDB();

// =====================================================
// API ROUTES
// =====================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    }
  });
});

// Auth Routes
app.post('/api/auth/register', [
  body('username').isLength({ min: 3 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { username, email, password } = req.body;
    
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      email,
      password: hashedPassword
    });
    
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Projects Routes
app.get('/api/projects', async (req, res) => {
  try {
    const { category, featured, limit = 10, page = 1 } = req.query;
    const query = {};
    
    if (category) query.category = category;
    if (featured === 'true') query.featured = true;
    
    const projects = await Project.find(query)
      .sort({ featured: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Project.countDocuments(query);
    
    res.json({
      projects,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/projects/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    project.views += 1;
    await project.save();
    
    res.json(project);
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/projects', authenticateToken, isAdmin, upload.array('images', 5), async (req, res) => {
  try {
    const projectData = JSON.parse(req.body.data);
    const files = req.files || [];
    
    // Upload images to Cloudinary (jika dikonfigurasi)
    const imageUrls = [];
    for (const file of files) {
      try {
        if (cloudinary.config().cloud_name) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'projects',
            transformation: [
              { width: 1200, height: 630, crop: 'fill' },
              { quality: 'auto' }
            ]
          });
          imageUrls.push(result.secure_url);
        } else {
          // Simpan lokal jika cloudinary tidak dikonfigurasi
          const fileUrl = `/uploads/${file.filename}`;
          imageUrls.push(fileUrl);
        }
        // Delete temp file
        fs.unlinkSync(file.path);
      } catch (uploadError) {
        logger.error('Upload error:', uploadError);
      }
    }
    
    const project = new Project({
      ...projectData,
      image: imageUrls[0] || projectData.image || '',
      images: imageUrls.length > 0 ? imageUrls : (projectData.images || [])
    });
    
    await project.save();
    
    res.status(201).json(project);
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/projects/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/projects/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/projects/:id/like', authenticateToken, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    project.likes += 1;
    await project.save();
    
    res.json({ likes: project.likes });
  } catch (error) {
    logger.error('Like project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Articles Routes
app.get('/api/articles', async (req, res) => {
  try {
    const { tag, category, limit = 10, page = 1 } = req.query;
    const query = { published: true };
    
    if (tag) query.tags = tag;
    if (category) query.category = category;
    
    const articles = await Article.find(query)
      .populate('author', 'username profilePicture')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Article.countDocuments(query);
    
    res.json({
      articles,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    logger.error('Get articles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/articles/:slug', async (req, res) => {
  try {
    const article = await Article.findOne({ slug: req.params.slug })
      .populate('author', 'username profilePicture bio');
    
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    article.views += 1;
    await article.save();
    
    res.json(article);
  } catch (error) {
    logger.error('Get article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/articles', authenticateToken, isAdmin, upload.single('coverImage'), async (req, res) => {
  try {
    const articleData = JSON.parse(req.body.data);
    const file = req.file;
    
    let coverImageUrl = '';
    if (file) {
      try {
        if (cloudinary.config().cloud_name) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'articles',
            transformation: [
              { width: 1200, height: 630, crop: 'fill' },
              { quality: 'auto' }
            ]
          });
          coverImageUrl = result.secure_url;
        } else {
          coverImageUrl = `/uploads/${file.filename}`;
        }
        fs.unlinkSync(file.path);
      } catch (uploadError) {
        logger.error('Upload error:', uploadError);
      }
    }
    
    const slug = articleData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const article = new Article({
      ...articleData,
      coverImage: coverImageUrl || articleData.coverImage,
      author: req.user.id,
      slug
    });
    
    // Calculate read time
    const wordsPerMinute = 200;
    const wordCount = article.content.split(/\s+/).length;
    article.readTime = Math.ceil(wordCount / wordsPerMinute);
    
    await article.save();
    
    res.status(201).json(article);
  } catch (error) {
    logger.error('Create article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/articles/:id/comments', authenticateToken, [
  body('content').isLength({ min: 1, max: 500 }).trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const article = await Article.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    article.comments.push({
      user: req.user.id,
      content: req.body.content
    });
    
    await article.save();
    
    res.status(201).json({ message: 'Comment added successfully' });
  } catch (error) {
    logger.error('Add comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Contact Routes
app.post('/api/contact', [
  body('name').isLength({ min: 2 }).trim().escape(),
  body('email').isEmail().normalizeEmail(),
  body('subject').isLength({ min: 3 }).trim().escape(),
  body('message').isLength({ min: 10 }).trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { name, email, subject, message } = req.body;
    
    const contactMessage = new Message({
      name,
      email,
      subject,
      message
    });
    
    await contactMessage.save();
    
    // Kirim email notifikasi (jika transporter dikonfigurasi)
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"Muhammad Teguh Marwin" <${process.env.EMAIL_USER}>`,
          to: process.env.EMAIL_USER,
          subject: `New Contact Form: ${subject}`,
          html: `
            <h3>New Contact Message</h3>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          `
        });
        
        // Send auto-reply
        await transporter.sendMail({
          from: `"Muhammad Teguh Marwin" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Thank you for contacting Muhammad Teguh Marwin',
          html: `
            <h3>Thank you for reaching out!</h3>
            <p>Dear ${name},</p>
            <p>Thank you for contacting me. I have received your message and will get back to you as soon as possible.</p>
            <p>Best regards,<br>Muhammad Teguh Marwin</p>
          `
        });
      } catch (emailError) {
        logger.error('Email sending failed:', emailError.message);
      }
    } else {
      logger.info('Email would be sent:', { to: email, subject });
    }
    
    res.status(201).json({ message: 'Message sent successfully' });
  } catch (error) {
    logger.error('Contact form error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Chat Routes
app.post('/api/chat', [
  body('message').isLength({ min: 1 }).trim().escape()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { message, sessionId } = req.body;
    const userIp = req.ip || req.socket.remoteAddress;
    const actualSessionId = sessionId || userIp;
    
    // Get or create session
    let chatSession = await ChatHistory.findOne({ sessionId: actualSessionId });
    if (!chatSession) {
      chatSession = new ChatHistory({
        sessionId: actualSessionId,
        messages: []
      });
    }
    
    // Save user message
    chatSession.messages.push({
      role: 'user',
      content: message
    });
    
    // Call AI API
    let aiResponse = 'Maaf, layanan AI sedang bermasalah. Silakan coba lagi nanti.';
    
    try {
      const response = await axios.get(process.env.ANABOT_API_URL, {
        params: {
          prompt: message,
          search_enabled: false,
          thinking_enabled: false,
          imageUrl: '',
          apikey: process.env.API_KEY
        },
        timeout: 10000 // 10 seconds timeout
      });
      
      if (response.data?.result?.message) {
        aiResponse = response.data.result.message;
      } else if (response.data?.response) {
        aiResponse = response.data.response;
      }
    } catch (apiError) {
      logger.error('AI API error:', apiError.message);
      // Fallback responses
      const fallbackResponses = [
        "Menarik! Ceritakan lebih lanjut.",
        "Saya mengerti. Ada yang bisa saya bantu lagi?",
        "Terima kasih telah bertanya. Silakan jelaskan lebih detail.",
        "Hmm, saya perlu memikirkan itu. Bisa Anda jelaskan ulang?",
        "Maaf, saya sedang mengalami gangguan koneksi. Coba lagi nanti ya."
      ];
      aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
    
    // Save AI response
    chatSession.messages.push({
      role: 'assistant',
      content: aiResponse
    });
    
    chatSession.updatedAt = new Date();
    await chatSession.save();
    
    res.json({
      message: aiResponse,
      sessionId: chatSession.sessionId
    });
  } catch (error) {
    logger.error('Chat API error:', error);
    res.status(500).json({ 
      message: 'Maaf, layanan chat sedang bermasalah. Silakan coba lagi nanti.' 
    });
  }
});

app.get('/api/chat/history/:sessionId', async (req, res) => {
  try {
    const chatSession = await ChatHistory.findOne({ 
      sessionId: req.params.sessionId 
    });
    
    if (!chatSession) {
      return res.json({ messages: [] });
    }
    
    res.json({ messages: chatSession.messages });
  } catch (error) {
    logger.error('Get chat history error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// User Profile Routes
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/user/profile', authenticateToken, upload.single('profilePicture'), async (req, res) => {
  try {
    const updateData = JSON.parse(req.body.data || '{}');
    const file = req.file;
    
    if (file) {
      try {
        if (cloudinary.config().cloud_name) {
          const result = await cloudinary.uploader.upload(file.path, {
            folder: 'profiles',
            transformation: [
              { width: 400, height: 400, crop: 'fill' },
              { quality: 'auto' }
            ]
          });
          updateData.profilePicture = result.secure_url;
        } else {
          updateData.profilePicture = `/uploads/${file.filename}`;
        }
        fs.unlinkSync(file.path);
      } catch (uploadError) {
        logger.error('Upload error:', uploadError);
      }
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { ...updateData },
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Routes
app.get('/api/admin/messages', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { read, limit = 20, page = 1 } = req.query;
    const query = {};
    
    if (read === 'true') query.read = true;
    if (read === 'false') query.read = false;
    
    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));
    
    const total = await Message.countDocuments(query);
    
    res.json({
      messages,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/messages/:id/read', authenticateToken, isAdmin, async (req, res) => {
  try {
    const message = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    res.json(message);
  } catch (error) {
    logger.error('Mark message read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/analytics', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};
    
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const [pageViews, dailyVisits, uniqueVisitors, totalVisits] = await Promise.all([
      Analytics.aggregate([
        { $match: query },
        { $group: { _id: '$page', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 }
      ]),
      Analytics.aggregate([
        { $match: query },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } },
        { $limit: 30 }
      ]),
      Analytics.aggregate([
        { $match: query },
        { $group: { _id: '$ip' } },
        { $count: 'total' }
      ]),
      Analytics.countDocuments(query)
    ]);
    
    res.json({
      pageViews,
      dailyVisits,
      uniqueVisitors: uniqueVisitors[0]?.total || 0,
      totalVisits
    });
  } catch (error) {
    logger.error('Get analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =====================================================
// SOCKET.IO CONNECTIONS
// =====================================================

io.on('connection', (socket) => {
  logger.info(`🟢 New socket connection: ${socket.id}`);
  
  socket.on('join', (data) => {
    const room = data.room || 'general';
    socket.join(room);
    logger.info(`Socket ${socket.id} joined room ${room}`);
    
    socket.emit('joined', { room, message: `Joined room: ${room}` });
  });
  
  socket.on('chat message', async (data) => {
    try {
      const room = data.room || 'general';
      const message = data.message;
      
      if (!message || message.trim().length === 0) {
        return;
      }
      
      // Process message with AI
      let aiResponse = 'Maaf, terjadi kesalahan.';
      
      try {
        const response = await axios.get(process.env.ANABOT_API_URL, {
          params: {
            prompt: message,
            apikey: process.env.API_KEY
          },
          timeout: 5000
        });
        
        aiResponse = response.data?.result?.message || 
                    response.data?.response || 
                    'Maaf, tidak bisa memproses pesan Anda.';
      } catch (apiError) {
        logger.error('Socket AI API error:', apiError.message);
        const fallbackResponses = [
          "Saya sedang belajar. Ceritakan lebih lanjut!",
          "Menarik! Bisa dijelaskan lebih detail?",
          "Hmm, saya perlu waktu untuk memikirkan itu.",
          "Terima kasih atas masukannya!",
          "Maaf, saya sedang gangguan. Coba lagi nanti ya."
        ];
        aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }
      
      io.to(room).emit('chat response', {
        user: data.user || 'Anonymous',
        message: message,
        response: aiResponse,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      logger.error('Socket chat error:', error);
      socket.emit('chat response', {
        error: 'Maaf, terjadi kesalahan pada server.'
      });
    }
  });
  
  socket.on('typing', (data) => {
    socket.to(data.room || 'general').emit('typing', {
      user: data.user || 'Someone',
      isTyping: data.isTyping
    });
  });
  
  socket.on('disconnect', () => {
    logger.info(`🔴 Socket disconnected: ${socket.id}`);
  });
});

// =====================================================
// STATIC FILES AND FRONTEND ROUTE
// =====================================================

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ message: 'API endpoint not found' });
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.mjs'));
});

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err.stack);
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'File too large. Max size: 5MB' });
    }
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on http://localhost:${PORT}`);
  logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`💾 MongoDB: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing gracefully...');
  gracefulShutdown();
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, closing gracefully...');
  gracefulShutdown();
});

async function gracefulShutdown() {
  try {
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });
    
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

export default app;
