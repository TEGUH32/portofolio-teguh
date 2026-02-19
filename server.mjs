import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import nodemailer from 'nodemailer';
import winston from 'winston';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

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
// IN-MEMORY DATABASE
// =====================================================

// Users collection
const users = new Map();
const usersByEmail = new Map();
const usersByUsername = new Map();

// Projects collection
const projects = new Map();

// Articles collection
const articles = new Map();
const articlesBySlug = new Map();

// Messages collection
const messages = new Map();

// Chat history collection
const chatSessions = new Map();

// Analytics collection
const analytics = [];

// =====================================================
// INITIAL SAMPLE DATA
// =====================================================

async function initializeSampleData() {
  logger.info('📦 Initializing sample data...');

  // Create admin user
  const adminId = uuidv4();
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  
  const adminUser = {
    id: adminId,
    username: 'admin',
    email: 'admin@teguh.dev',
    password: hashedPassword,
    role: 'admin',
    profilePicture: 'https://ui-avatars.com/api/?name=Admin&background=0D9489&color=fff&size=128',
    bio: 'Administrator and Full-Stack Developer',
    socialLinks: {
      github: 'https://github.com/teguh',
      linkedin: 'https://linkedin.com/in/teguh',
      twitter: 'https://twitter.com/teguh',
      instagram: 'https://instagram.com/teguh'
    },
    createdAt: new Date(),
    lastLogin: null
  };

  users.set(adminId, adminUser);
  usersByEmail.set(adminUser.email, adminId);
  usersByUsername.set(adminUser.username, adminId);

  // Create sample user
  const userId = uuidv4();
  const userPassword = await bcrypt.hash('User123!', 10);
  
  const sampleUser = {
    id: userId,
    username: 'johndoe',
    email: 'john@example.com',
    password: userPassword,
    role: 'user',
    profilePicture: 'https://ui-avatars.com/api/?name=John+Doe&background=random&color=fff&size=128',
    bio: 'Web Developer & AI Enthusiast',
    socialLinks: {
      github: 'https://github.com/johndoe',
      linkedin: 'https://linkedin.com/in/johndoe',
      twitter: 'https://twitter.com/johndoe',
      instagram: 'https://instagram.com/johndoe'
    },
    createdAt: new Date(),
    lastLogin: null
  };

  users.set(userId, sampleUser);
  usersByEmail.set(sampleUser.email, userId);
  usersByUsername.set(sampleUser.username, userId);

  // Create sample projects
  const sampleProjects = [
    {
      id: uuidv4(),
      title: 'AI-Powered Dashboard',
      description: 'Interactive dashboard with AI insights and real-time analytics',
      longDescription: 'A comprehensive dashboard that uses machine learning to provide business insights, predict trends, and automate reporting.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800',
      images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800'],
      technologies: ['React', 'TensorFlow.js', 'Node.js', 'MongoDB'],
      category: 'web',
      liveUrl: 'https://ai-dashboard.demo.com',
      githubUrl: 'https://github.com/teguh/ai-dashboard',
      featured: true,
      views: 1234,
      likes: 89,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: uuidv4(),
      title: 'Smart Automation Bot',
      description: 'Telegram bot for task automation and reminders',
      longDescription: 'An intelligent bot that helps users automate daily tasks, set reminders, and integrate with various APIs.',
      image: 'https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800',
      images: ['https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=800'],
      technologies: ['Python', 'Telegraf', 'Redis', 'Docker'],
      category: 'automation',
      liveUrl: 'https://t.me/smartauto_bot',
      githubUrl: 'https://github.com/teguh/auto-bot',
      featured: true,
      views: 2341,
      likes: 156,
      createdAt: new Date('2024-02-20'),
      updatedAt: new Date('2024-02-20')
    },
    {
      id: uuidv4(),
      title: 'E-Commerce Platform',
      description: 'Modern e-commerce with AI product recommendations',
      longDescription: 'Full-featured e-commerce platform with personalized product recommendations based on user behavior.',
      image: 'https://images.unsplash.com/photo-1557821552-17105176677c?w=800',
      images: ['https://images.unsplash.com/photo-1557821552-17105176677c?w=800'],
      technologies: ['Next.js', 'Stripe', 'PostgreSQL', 'Prisma'],
      category: 'web',
      liveUrl: 'https://ecommerce.demo.com',
      githubUrl: 'https://github.com/teguh/ecommerce',
      featured: true,
      views: 3456,
      likes: 234,
      createdAt: new Date('2024-03-10'),
      updatedAt: new Date('2024-03-10')
    }
  ];

  sampleProjects.forEach(project => {
    projects.set(project.id, project);
  });

  // Create sample articles
  const sampleArticles = [
    {
      id: uuidv4(),
      title: 'Getting Started with AI in Web Development',
      slug: 'getting-started-with-ai-in-web-development',
      excerpt: 'Learn how to integrate AI and machine learning into your web applications',
      content: `# Getting Started with AI in Web Development\n\nArtificial Intelligence is revolutionizing web development. In this article, we'll explore how you can integrate AI capabilities into your web applications.`,
      coverImage: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800',
      author: adminId,
      tags: ['AI', 'Web Development', 'Machine Learning'],
      category: 'AI',
      readTime: 8,
      views: 567,
      likes: 45,
      comments: [],
      published: true,
      createdAt: new Date('2024-04-01'),
      updatedAt: new Date('2024-04-01')
    },
    {
      id: uuidv4(),
      title: 'Building Scalable Node.js Applications',
      slug: 'building-scalable-nodejs-applications',
      excerpt: 'Best practices for building production-ready Node.js applications',
      content: `# Building Scalable Node.js Applications\n\nWhen building Node.js applications for production, scalability should be a primary concern.`,
      coverImage: 'https://images.unsplash.com/photo-1516259762381-22954d7d3ad2?w=800',
      author: adminId,
      tags: ['Node.js', 'Backend', 'Scalability'],
      category: 'Backend',
      readTime: 12,
      views: 890,
      likes: 67,
      comments: [],
      published: true,
      createdAt: new Date('2024-03-15'),
      updatedAt: new Date('2024-03-15')
    }
  ];

  sampleArticles.forEach(article => {
    articles.set(article.id, article);
    articlesBySlug.set(article.slug, article.id);
  });

  logger.info(`✅ Sample data initialized:
    - Users: ${users.size}
    - Projects: ${projects.size}
    - Articles: ${articles.size}
  `);
}

// Initialize sample data
await initializeSampleData();

// =====================================================
// MULTER CONFIG FOR FILE UPLOADS
// =====================================================

// Pastikan folder uploads ada
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
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

// =====================================================
// EMAIL TRANSPORTER
// =====================================================

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
// MIDDLEWARE
// =====================================================

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
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
const trackAnalytics = (req, res, next) => {
  if (req.path.startsWith('/api/') || req.path.includes('.')) {
    return next();
  }
  
  try {
    analytics.push({
      id: uuidv4(),
      page: req.path,
      ip: req.ip || req.socket.remoteAddress || '0.0.0.0',
      userAgent: req.headers['user-agent'] || 'unknown',
      referrer: req.headers['referer'] || 'direct',
      timestamp: new Date()
    });
    
    if (analytics.length > 1000) {
      analytics.splice(0, analytics.length - 1000);
    }
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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files
app.use('/uploads', express.static(uploadDir));

app.use(trackAnalytics);

// Apply rate limiting to API routes
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// =====================================================
// API ROUTES
// =====================================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    memory: process.memoryUsage(),
    uptime: process.uptime(),
    stats: {
      users: users.size,
      projects: projects.size,
      articles: articles.size,
      messages: messages.size,
      chatSessions: chatSessions.size,
      analytics: analytics.length
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
    
    if (usersByEmail.has(email) || usersByUsername.has(username)) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      id: userId,
      username,
      email,
      password: hashedPassword,
      role: 'user',
      profilePicture: `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&size=128`,
      bio: '',
      socialLinks: {
        github: '',
        linkedin: '',
        twitter: '',
        instagram: ''
      },
      createdAt: new Date(),
      lastLogin: null
    };
    
    users.set(userId, user);
    usersByEmail.set(email, userId);
    usersByUsername.set(username, userId);
    
    const token = jwt.sign(
      { id: userId, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user.id,
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
    
    const userId = usersByEmail.get(email);
    if (!userId) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const user = users.get(userId);
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    user.lastLogin = new Date();
    users.set(userId, user);
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
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
app.get('/api/projects', (req, res) => {
  try {
    const { category, featured, limit = 10, page = 1 } = req.query;
    
    let projectList = Array.from(projects.values());
    
    if (category) {
      projectList = projectList.filter(p => p.category === category);
    }
    if (featured === 'true') {
      projectList = projectList.filter(p => p.featured);
    }
    
    projectList.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.createdAt - a.createdAt;
    });
    
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedProjects = projectList.slice(start, start + parseInt(limit));
    
    res.json({
      projects: paginatedProjects,
      total: projectList.length,
      page: parseInt(page),
      totalPages: Math.ceil(projectList.length / parseInt(limit))
    });
  } catch (error) {
    logger.error('Get projects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const project = projects.get(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    project.views += 1;
    projects.set(project.id, project);
    
    res.json(project);
  } catch (error) {
    logger.error('Get project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/projects', authenticateToken, isAdmin, upload.array('images', 5), (req, res) => {
  try {
    const projectData = JSON.parse(req.body.data);
    const files = req.files || [];
    
    const imageUrls = files.map(file => `/uploads/${file.filename}`);
    
    const project = {
      id: uuidv4(),
      ...projectData,
      image: imageUrls[0] || projectData.image || '',
      images: imageUrls.length > 0 ? imageUrls : (projectData.images || []),
      views: 0,
      likes: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    projects.set(project.id, project);
    
    res.status(201).json(project);
  } catch (error) {
    logger.error('Create project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/projects/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const project = projects.get(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    const updatedProject = {
      ...project,
      ...req.body,
      updatedAt: new Date()
    };
    
    projects.set(req.params.id, updatedProject);
    
    res.json(updatedProject);
  } catch (error) {
    logger.error('Update project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.delete('/api/projects/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    if (!projects.has(req.params.id)) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    projects.delete(req.params.id);
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    logger.error('Delete project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/projects/:id/like', authenticateToken, (req, res) => {
  try {
    const project = projects.get(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    project.likes += 1;
    projects.set(project.id, project);
    
    res.json({ likes: project.likes });
  } catch (error) {
    logger.error('Like project error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Articles Routes
app.get('/api/articles', (req, res) => {
  try {
    const { tag, category, limit = 10, page = 1 } = req.query;
    
    let articleList = Array.from(articles.values())
      .filter(a => a.published);
    
    if (tag) {
      articleList = articleList.filter(a => a.tags.includes(tag));
    }
    if (category) {
      articleList = articleList.filter(a => a.category === category);
    }
    
    articleList.sort((a, b) => b.createdAt - a.createdAt);
    
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedArticles = articleList.slice(start, start + parseInt(limit));
    
    const articlesWithAuthor = paginatedArticles.map(article => {
      const author = users.get(article.author);
      return {
        ...article,
        author: author ? {
          id: author.id,
          username: author.username,
          profilePicture: author.profilePicture
        } : null
      };
    });
    
    res.json({
      articles: articlesWithAuthor,
      total: articleList.length,
      page: parseInt(page),
      totalPages: Math.ceil(articleList.length / parseInt(limit))
    });
  } catch (error) {
    logger.error('Get articles error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/articles/:slug', (req, res) => {
  try {
    const articleId = articlesBySlug.get(req.params.slug);
    if (!articleId) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    const article = articles.get(articleId);
    article.views += 1;
    articles.set(articleId, article);
    
    const author = users.get(article.author);
    const articleWithAuthor = {
      ...article,
      author: author ? {
        id: author.id,
        username: author.username,
        profilePicture: author.profilePicture,
        bio: author.bio
      } : null
    };
    
    res.json(articleWithAuthor);
  } catch (error) {
    logger.error('Get article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/articles', authenticateToken, isAdmin, upload.single('coverImage'), (req, res) => {
  try {
    const articleData = JSON.parse(req.body.data);
    const file = req.file;
    
    let coverImageUrl = '';
    if (file) {
      coverImageUrl = `/uploads/${file.filename}`;
    }
    
    const slug = articleData.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const wordsPerMinute = 200;
    const wordCount = articleData.content.split(/\s+/).length;
    const readTime = Math.ceil(wordCount / wordsPerMinute);
    
    const article = {
      id: uuidv4(),
      ...articleData,
      coverImage: coverImageUrl || articleData.coverImage,
      author: req.user.id,
      slug,
      readTime,
      views: 0,
      likes: 0,
      comments: [],
      published: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    articles.set(article.id, article);
    articlesBySlug.set(slug, article.id);
    
    res.status(201).json(article);
  } catch (error) {
    logger.error('Create article error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/articles/:id/comments', authenticateToken, [
  body('content').isLength({ min: 1, max: 500 }).trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const article = articles.get(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Article not found' });
    }
    
    const comment = {
      id: uuidv4(),
      user: req.user.id,
      content: req.body.content,
      createdAt: new Date()
    };
    
    article.comments.push(comment);
    articles.set(article.id, article);
    
    res.status(201).json({ message: 'Comment added successfully', comment });
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
    
    const contactMessage = {
      id: uuidv4(),
      name,
      email,
      subject,
      message,
      read: false,
      replied: false,
      createdAt: new Date()
    };
    
    messages.set(contactMessage.id, contactMessage);
    
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
    
    let chatSession = chatSessions.get(actualSessionId);
    if (!chatSession) {
      chatSession = {
        sessionId: actualSessionId,
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      chatSessions.set(actualSessionId, chatSession);
    }
    
    chatSession.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
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
        timeout: 10000
      });
      
      if (response.data?.result?.message) {
        aiResponse = response.data.result.message;
      } else if (response.data?.response) {
        aiResponse = response.data.response;
      }
    } catch (apiError) {
      logger.error('AI API error:', apiError.message);
      const fallbackResponses = [
        "Menarik! Ceritakan lebih lanjut tentang itu.",
        "Saya mengerti. Ada yang bisa saya bantu lagi?",
        "Terima kasih telah bertanya. Silakan jelaskan lebih detail.",
        "Maaf, saya sedang mengalami gangguan koneksi. Coba lagi nanti ya.",
        "Saya ingin tahu lebih banyak. Bisa beri contoh?"
      ];
      aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }
    
    chatSession.messages.push({
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date()
    });
    
    chatSession.updatedAt = new Date();
    chatSessions.set(actualSessionId, chatSession);
    
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

app.get('/api/chat/history/:sessionId', (req, res) => {
  try {
    const chatSession = chatSessions.get(req.params.sessionId);
    
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
app.get('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/user/profile', authenticateToken, upload.single('profilePicture'), (req, res) => {
  try {
    const updateData = JSON.parse(req.body.data || '{}');
    const file = req.file;
    
    const user = users.get(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (file) {
      updateData.profilePicture = `/uploads/${file.filename}`;
    }
    
    const updatedUser = {
      ...user,
      ...updateData,
      socialLinks: {
        ...user.socialLinks,
        ...(updateData.socialLinks || {})
      }
    };
    
    users.set(req.user.id, updatedUser);
    
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin Routes
app.get('/api/admin/messages', authenticateToken, isAdmin, (req, res) => {
  try {
    const { read, limit = 20, page = 1 } = req.query;
    
    let messageList = Array.from(messages.values());
    
    if (read === 'true') {
      messageList = messageList.filter(m => m.read);
    } else if (read === 'false') {
      messageList = messageList.filter(m => !m.read);
    }
    
    messageList.sort((a, b) => b.createdAt - a.createdAt);
    
    const start = (parseInt(page) - 1) * parseInt(limit);
    const paginatedMessages = messageList.slice(start, start + parseInt(limit));
    
    res.json({
      messages: paginatedMessages,
      total: messageList.length,
      page: parseInt(page),
      totalPages: Math.ceil(messageList.length / parseInt(limit))
    });
  } catch (error) {
    logger.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.put('/api/admin/messages/:id/read', authenticateToken, isAdmin, (req, res) => {
  try {
    const message = messages.get(req.params.id);
    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }
    
    message.read = true;
    messages.set(req.params.id, message);
    
    res.json(message);
  } catch (error) {
    logger.error('Mark message read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

app.get('/api/admin/analytics', authenticateToken, isAdmin, (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let filteredAnalytics = [...analytics];
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredAnalytics = analytics.filter(a => 
        a.timestamp >= start && a.timestamp <= end
      );
    }
    
    const pageViews = {};
    filteredAnalytics.forEach(a => {
      pageViews[a.page] = (pageViews[a.page] || 0) + 1;
    });
    
    const pageViewsArray = Object.entries(pageViews)
      .map(([page, count]) => ({ _id: page, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    
    const dailyVisits = {};
    filteredAnalytics.forEach(a => {
      const date = a.timestamp.toISOString().split('T')[0];
      dailyVisits[date] = (dailyVisits[date] || 0) + 1;
    });
    
    const dailyVisitsArray = Object.entries(dailyVisits)
      .map(([date, count]) => ({ _id: date, count }))
      .sort((a, b) => a._id.localeCompare(b._id))
      .slice(0, 30);
    
    const uniqueIPs = new Set(filteredAnalytics.map(a => a.ip));
    
    res.json({
      pageViews: pageViewsArray,
      dailyVisits: dailyVisitsArray,
      uniqueVisitors: uniqueIPs.size,
      totalVisits: filteredAnalytics.length
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
    socket.emit('joined', { room, message: `Joined room: ${room}` });
  });
  
  socket.on('chat message', async (data) => {
    try {
      const room = data.room || 'general';
      const message = data.message;
      
      if (!message || message.trim().length === 0) return;
      
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

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
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
  logger.info(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
  logger.info(`📤 Uploads directory: ${uploadDir}`);
  logger.info(`📊 Stats:
    - Users: ${users.size}
    - Projects: ${projects.size}
    - Articles: ${articles.size}
    - Messages: ${messages.size}
  `);
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
    
    users.clear();
    usersByEmail.clear();
    usersByUsername.clear();
    projects.clear();
    articles.clear();
    articlesBySlug.clear();
    messages.clear();
    chatSessions.clear();
    analytics.length = 0;
    
    logger.info('All in-memory data cleared');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}

export default app;
