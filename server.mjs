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
import redis from 'redis';
import Queue from 'bull';
import winston from 'winston';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { EventEmitter } from 'events';

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

// =====================================================
// REDIS CLOUD CONNECTION dengan ERROR HANDLING
// =====================================================

let redisClient;
let emailQueue;

async function initializeRedis() {
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      logger.warn('⚠️ REDIS_URL tidak ditemukan di file .env, menggunakan in-memory fallback');
      return createFallbackServices();
    }

    logger.info('🔄 Menghubungkan ke Redis Cloud...');
    
    // Parse URL untuk log host
    try {
      const url = new URL(redisUrl);
      logger.info(`📍 Host: ${url.hostname}:${url.port || 6379}`);
    } catch (e) {
      logger.warn('⚠️ Invalid Redis URL format');
    }

    redisClient = redis.createClient({
      url: redisUrl,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            logger.error('Too many retries to Redis Cloud, switching to fallback');
            return new Error('Too many retries');
          }
          const delay = Math.min(retries * 100, 3000);
          logger.info(`Reconnecting to Redis in ${delay}ms... (attempt ${retries}/5)`);
          return delay;
        },
        connectTimeout: 5000, // 5 seconds
        keepAlive: 3000
      }
    });

    redisClient.on('connect', () => {
      logger.info('✅ Connected to Redis Cloud');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis Cloud ready to use');
    });

    redisClient.on('error', (err) => {
      logger.error('❌ Redis Cloud Error:', err.message);
    });

    redisClient.on('end', () => {
      logger.warn('⚠️ Redis Cloud connection ended');
    });

    // Set timeout untuk koneksi
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Redis connection timeout')), 5000)
    );

    await Promise.race([connectPromise, timeoutPromise]);
    
    // Test connection
    await redisClient.ping();
    logger.info('🏓 Redis PING successful');

    // Initialize queue with Redis
    emailQueue = new Queue('email', redisUrl, {
      redis: {
        url: redisUrl,
        connectTimeout: 5000
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000
        }
      }
    });

    logger.info('✅ Bull queue initialized with Redis Cloud');
    return { redisClient, emailQueue };

  } catch (error) {
    logger.error('❌ Gagal connect ke Redis Cloud:', error.message);
    logger.info('⚠️ Menggunakan in-memory fallback...');
    return createFallbackServices();
  }
}

function createFallbackServices() {
  // Fallback: in-memory cache
  redisClient = null;
  
  // Fallback: in-memory queue menggunakan EventEmitter
  const memoryQueue = new EventEmitter();
  
  // Simulasi method queue
  memoryQueue.add = async (data) => {
    logger.info('📨 In-memory queue job added (fallback)');
    // Process job in next tick
    process.nextTick(() => {
      if (memoryQueue.process) {
        memoryQueue.process({ data });
      }
    });
    return { id: Date.now(), data };
  };
  
  memoryQueue.process = async (job) => {
    logger.info('⚙️ Processing in-memory job:', job.data);
    // Simulate processing
    return { success: true };
  };
  
  emailQueue = memoryQueue;
  
  logger.info('✅ In-memory fallback services initialized');
  return { redisClient, emailQueue };
}

// In-memory cache fallback
const memoryCache = new Map();
const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

// Cache helper functions
async function getCache(key) {
  if (redisClient && redisClient.isReady) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error(`Redis get error for key ${key}:`, error.message);
      return getMemoryCache(key);
    }
  } else {
    return getMemoryCache(key);
  }
}

function getMemoryCache(key) {
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value;
  }
  memoryCache.delete(key);
  return null;
}

async function setCache(key, value, ttl = 3600) {
  if (redisClient && redisClient.isReady) {
    try {
      await redisClient.setEx(key, ttl, value);
    } catch (error) {
      logger.error(`Redis set error for key ${key}:`, error.message);
      setMemoryCache(key, value);
    }
  } else {
    setMemoryCache(key, value);
  }
}

function setMemoryCache(key, value) {
  memoryCache.set(key, {
    value,
    timestamp: Date.now()
  });
  
  // Auto cleanup after TTL
  setTimeout(() => {
    memoryCache.delete(key);
  }, CACHE_TTL);
}

// Initialize Redis
const { redisClient: redisClientInstance, emailQueue: emailQueueInstance } = await initializeRedis();
redisClient = redisClientInstance;
emailQueue = emailQueueInstance;

// Cloudinary config
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  logger.info('✅ Cloudinary configured');
} else {
  logger.warn('⚠️ Cloudinary credentials missing, file uploads will be limited');
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
  profilePicture: { type: String, default: 'https://res.cloudinary.com/demo/image/upload/v1/default-profile.png' },
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
        profilePicture: 'https://res.cloudinary.com/demo/image/upload/v1/default-profile.png',
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
// QUEUE PROCESSORS
// =====================================================

if (emailQueue && emailQueue.process) {
  emailQueue.process(async (job) => {
    const { to, subject, html } = job.data;
    
    if (!transporter) {
      logger.warn('⚠️ Email transporter not configured, logging email instead');
      logger.info('📧 Email would be sent:', { to, subject });
      return { success: true, simulated: true };
    }
    
    try {
      await transporter.sendMail({
        from: `"Muhammad Teguh Marwin" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
      });
      logger.info(`✅ Email sent to ${to}`);
      return { success: true };
    } catch (error) {
      logger.error('❌ Email sending failed:', error.message);
      throw error;
    }
  });
}

// =====================================================
// API ROUTES
// =====================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      redis: redisClient?.isReady ? 'connected' : (redisClient ? 'connecting' : 'fallback'),
      queue: emailQueue ? 'initialized' : 'fallback'
    }
  });
});

// ... (sisa kode API routes sama seperti sebelumnya, mulai dari Auth Routes sampai akhir)

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
  logger.info(`📦 Redis: ${redisClient?.isReady ? 'Connected' : (redisClient ? 'Connecting' : 'Fallback')}`);
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
    
    if (redisClient && redisClient.isReady) {
      await redisClient.quit();
      logger.info('Redis connection closed');
    }
    
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

export default app;
