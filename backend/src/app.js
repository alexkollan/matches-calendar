import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import sportsRoutes from './routes/sports.js';
import calendarRoutes from './routes/calendar.js';
import authRoutes from './routes/auth.js';
import syncRoutes from './routes/sync.js';
import legacyRoutes from './routes/legacy.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { apiRateLimit } from './middleware/rateLimit.js';

// Import services
import googleCalendarService from './services/calendar/google.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Debug environment variables
console.log('Environment variables loaded:');
console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET');
console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET');
console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI ? 'SET' : 'NOT SET');

// Initialize Express app
const app = express();

// Trust proxy for accurate IP addresses behind reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Allow external resources
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-eval'", "'unsafe-inline'"], // Allow inline scripts and eval
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      baseUri: ["'self'"], // Fixed: was baseSrc, should be baseUri
      fontSrc: ["'self'", "https:", "data:"],
      formAction: ["'self'"],
      frameAncestors: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  originAgentCluster: true
}));

// CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:3000', // Next.js default
      'http://localhost:5173', // Vite default
      'http://localhost:5174', // Vite alternative port
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth middleware for Google tokens
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In a real app, you'd validate the JWT token here
    // For now, we'll assume the token contains Google credentials
    try {
      // This is a simplified approach - in production you'd decrypt/validate the JWT
      const tokenData = authHeader.substring(7); // Remove 'Bearer '
      
      // You might store tokens differently - this is just an example
      if (tokenData && tokenData !== 'null' && tokenData !== 'undefined') {
        req.googleTokens = JSON.parse(Buffer.from(tokenData, 'base64').toString());
      }
    } catch (error) {
      // Invalid token format - continue without tokens
      logger.debug('Invalid token format in Authorization header');
    }
  }
  
  next();
});

// Apply rate limiting to API routes
app.use('/api/', apiRateLimit);

// Health check endpoint (before other routes)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/sports', sportsRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api', legacyRoutes); // Legacy routes for backward compatibility

// API root endpoint
app.get('/api', (req, res) => {
  res.json({
    message: 'Sports Matches Calendar API',
    version: '1.0.0',
    endpoints: {
      sports: '/api/sports',
      calendar: '/api/calendar',
      auth: '/api/auth',
      sync: '/api/sync'
    },
    documentation: 'https://github.com/alexkollan/matches-calendar',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize Google Calendar service
    await googleCalendarService.initialize();
    
    logger.info('All services initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    return false;
  }
};

// Graceful shutdown handler
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}, shutting down gracefully`);
  
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Start server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, async () => {
  logger.info(`Backend server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  
  // Initialize services after server starts
  const servicesInitialized = await initializeServices();
  
  if (!servicesInitialized) {
    logger.error('Some services failed to initialize - server may not function properly');
  } else {
    logger.info('🚀 Backend fully operational');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Handle graceful shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

export default app;
