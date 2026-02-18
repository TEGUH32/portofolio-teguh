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
      format: winston.format.simple()
    })
  ]
});

// Redis client
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
await redisClient.connect();

// Queue for background jobs
const emailQueue = new Queue('email', process.env.REDIS_URL);

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
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
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// =====================================================
// MONGODB SCHEMAS
// =====================================================

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profilePicture: { type: String },
  bio: { type: String },
  socialLinks: {
    github: String,
    linkedin: String,
    twitter: String,
    instagram: String
  },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

// Project Schema
const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  longDescription: { type: String },
  image: { type: String },
  images: [String],
  technologies: [String],
  category: { type: String, enum: ['web', 'mobile', 'ai', 'automation'] },
  liveUrl: String,
  githubUrl: String,
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
  coverImage: { type: String },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  tags: [String],
  category: String,
  readTime: Number,
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
  sessionId: { type: String, required: true },
  messages: [{
    role: { type: String, enum: ['user', 'assistant'] },
    content: String,
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Analytics Schema
const analyticsSchema = new mongoose.Schema({
  page: String,
  ip: String,
  userAgent: String,
  referrer: String,
  timestamp: { type: Date, default: Date.now }
});

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
  message: 'Too many requests from this IP, please try again later.'
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later.'
});

// CORS options
const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:5500'],
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// Analytics middleware
const trackAnalytics = async (req, res, next) => {
  try {
    const analytics = new Analytics({
      page: req.path,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'] || 'direct'
    });
    await analytics.save();
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

try {
  await mongoose.connect(process.env.MONGODB_URI);
  logger.info('Connected to MongoDB');
  
  // Create admin user if not exists
  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    await User.create({
      username: 'admin',
      email: 'admin@teguh.dev',
      password: hashedPassword,
      role: 'admin'
    });
    logger.info('Admin user created');
  }
} catch (error) {
  logger.error('MongoDB connection error:', error);
  process.exit(1);
}

// =====================================================
// QUEUE PROCESSORS
// =====================================================

emailQueue.process(async (job) => {
  const { to, subject, html } = job.data;
  
  try {
    await transporter.sendMail({
      from: `"Muhammad Teguh Marwin" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    });
    logger.info(`Email sent to ${to}`);
  } catch (error) {
    logger.error('Email sending failed:', error);
    throw error;
  }
});

// =====================================================
// API ROUTES
// =====================================================

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
        role: user.role
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
    
    // Cache in Redis
    await redisClient.setEx(`projects:${JSON.stringify(req.query)}`, 3600, JSON.stringify(projects));
    
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
    const files = req.files;
    
    // Upload images to Cloudinary
    const imageUrls = [];
    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'projects',
        transformation: [
          { width: 1200, height: 630, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      imageUrls.push(result.secure_url);
      // Delete temp file
      fs.unlinkSync(file.path);
    }
    
    const project = new Project({
      ...projectData,
      image: imageUrls[0] || '',
      images: imageUrls
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
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'articles',
        transformation: [
          { width: 1200, height: 630, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      coverImageUrl = result.secure_url;
      fs.unlinkSync(file.path);
    }
    
    const article = new Article({
      ...articleData,
      coverImage: coverImageUrl,
      author: req.user.id,
      slug: articleData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
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
    
    // Send email notification
    await emailQueue.add({
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
    await emailQueue.add({
      to: email,
      subject: 'Thank you for contacting Muhammad Teguh Marwin',
      html: `
        <h3>Thank you for reaching out!</h3>
        <p>Dear ${name},</p>
        <p>Thank you for contacting me. I have received your message and will get back to you as soon as possible.</p>
        <p>Best regards,<br>Muhammad Teguh Marwin</p>
      `
    });
    
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
    const userIp = req.ip;
    
    // Get or create session
    let chatSession = await ChatHistory.findOne({ sessionId });
    if (!chatSession) {
      chatSession = new ChatHistory({
        sessionId: sessionId || userIp,
        messages: []
      });
    }
    
    // Save user message
    chatSession.messages.push({
      role: 'user',
      content: message
    });
    
    // Call AI API
    const response = await axios.get(`${process.env.ANABOT_API_URL}`, {
      params: {
        prompt: message,
        search_enabled: false,
        thinking_enabled: false,
        imageUrl: '',
        apikey: process.env.API_KEY
      }
    });
    
    let aiResponse = '';
    if (response.data?.result?.message) {
      aiResponse = response.data.result.message;
    } else if (response.data?.response) {
      aiResponse = response.data.response;
    } else {
      aiResponse = 'Maaf, terjadi kesalahan. Coba lagi nanti.';
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
      message: 'Maaf, layanan AI sedang bermasalah. Silakan coba lagi nanti.' 
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
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'profiles',
        transformation: [
          { width: 400, height: 400, crop: 'fill' },
          { quality: 'auto' }
        ]
      });
      updateData.profilePicture = result.secure_url;
      fs.unlinkSync(file.path);
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
    
    const pageViews = await Analytics.aggregate([
      { $match: query },
      { $group: { _id: '$page', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    const dailyVisits = await Analytics.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
    
    const uniqueVisitors = await Analytics.aggregate([
      { $match: query },
      { $group: { _id: '$ip' } },
      { $count: 'total' }
    ]);
    
    res.json({
      pageViews,
      dailyVisits,
      uniqueVisitors: uniqueVisitors[0]?.total || 0,
      totalVisits: await Analytics.countDocuments(query)
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
  logger.info(`New socket connection: ${socket.id}`);
  
  socket.on('join', (data) => {
    socket.join(data.room);
    logger.info(`Socket ${socket.id} joined room ${data.room}`);
  });
  
  socket.on('chat message', async (data) => {
    try {
      // Process message
      const response = await axios.get(`${process.env.ANABOT_API_URL}`, {
        params: {
          prompt: data.message,
          apikey: process.env.API_KEY
        }
      });
      
      const aiResponse = response.data?.result?.message || response.data?.response || 'Maaf, terjadi kesalahan.';
      
      io.to(data.room).emit('chat response', {
        user: data.user,
        message: data.message,
        response: aiResponse,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Socket chat error:', error);
      io.to(data.room).emit('chat response', {
        error: 'Maaf, terjadi kesalahan pada server.'
      });
    }
  });
  
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// =====================================================
// STATIC FILES AND FRONTEND ROUTE
// =====================================================

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.mjs'));
});

// =====================================================
// ERROR HANDLING MIDDLEWARE
// =====================================================

app.use((err, req, res, next) => {
  logger.error(err.stack);
  
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: 'File upload error: ' + err.message });
  }
  
  res.status(500).json({ message: 'Something went wrong!' });
});

// =====================================================
// START SERVER
// =====================================================

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, closing gracefully');
  httpServer.close(() => {
    mongoose.connection.close();
    redisClient.quit();
    process.exit(0);
  });
});

export default app;
