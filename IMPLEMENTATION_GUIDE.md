# Sports Calendar - Full-Stack Application

## 🎯 Project Overview

A complete full-stack application that automatically fetches sports events from multiple sources and syncs them to Google Calendar. Built with Node.js/Express backend, React frontend, and Google Calendar API integration.

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Modular scrapers** for 24Media and Gazzetta sports data
- **Google Calendar service** with OAuth authentication
- **RESTful API** with proper error handling and validation
- **Rate limiting** and **logging** for production readiness
- **Automated aggregation** with deduplication and metadata extraction

### Frontend (React/Vite)
- **Modern React** with hooks and context API
- **IndexedDB** for local data persistence
- **Web Workers** for background synchronization
- **Responsive design** with mobile-first approach
- **Real-time sync status** and comprehensive error handling

### Data Flow
```
[Sports Sources] → [Scrapers] → [Aggregator] → [API] → [Frontend] → [Google Calendar]
      ↓                                              ↓
  [Backend Cache]                                [IndexedDB]
```

## 📁 Project Structure

```
matches-calendar/
├── backend/
│   ├── package.json              # Backend dependencies
│   ├── .env.example             # Environment variables template
│   ├── src/
│   │   ├── app.js              # Main Express application
│   │   ├── utils/
│   │   │   ├── logger.js       # Winston logging setup
│   │   │   └── validators.js   # Joi validation schemas
│   │   ├── middleware/
│   │   │   ├── errorHandler.js # Global error handling
│   │   │   └── rateLimit.js    # API rate limiting
│   │   ├── services/
│   │   │   ├── scrapers/
│   │   │   │   ├── BaseScraper.js     # Abstract scraper class
│   │   │   │   ├── Media24Scraper.js  # 24Media implementation
│   │   │   │   ├── GazzettaScraper.js # Gazzetta implementation
│   │   │   │   └── index.js           # Scraper aggregator
│   │   │   └── calendar/
│   │   │       └── google.js   # Google Calendar service
│   │   └── routes/
│   │       ├── sports.js       # Sports data endpoints
│   │       ├── calendar.js     # Calendar operations
│   │       ├── auth.js         # Authentication flow
│   │       └── sync.js         # Sync management
│   └── logs/                   # Application logs
├── frontend/
│   ├── package.json           # Frontend dependencies
│   ├── src/
│   │   ├── App.jsx           # Main application component
│   │   ├── App.css           # Application styles
│   │   ├── contexts/
│   │   │   └── AppContext.jsx # Global state management
│   │   ├── hooks/
│   │   │   ├── useAuth.js    # Authentication hook
│   │   │   ├── useEvents.js  # Events data hook
│   │   │   └── useSync.js    # Sync operations hook
│   │   ├── services/
│   │   │   ├── db.js         # IndexedDB service
│   │   │   ├── api.js        # Backend API client
│   │   │   └── sync.js       # Sync orchestrator
│   │   ├── workers/
│   │   │   └── syncWorker.js # Background sync worker
│   │   ├── components/
│   │   │   ├── Layout.jsx    # App layout
│   │   │   ├── Sidebar.jsx   # Navigation sidebar
│   │   │   ├── Header.jsx    # Page header
│   │   │   └── ToastContainer.jsx # Notifications
│   │   └── pages/
│   │       ├── EventsPage.jsx    # Events listing
│   │       ├── CalendarPage.jsx  # Calendar view
│   │       ├── SyncPage.jsx      # Sync management
│   │       ├── SettingsPage.jsx  # App settings
│   │       └── AuthPage.jsx      # Authentication
│   └── public/               # Static assets
└── shared/
    └── types.js             # Shared data models
```

## 🚀 Setup Instructions

### 1. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file:
```env
# Server Configuration
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Google Calendar API
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback

# Security
JWT_SECRET=your_jwt_secret_key

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

Start backend:
```bash
npm start
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

### 3. Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3001/auth/google/callback`
6. Copy Client ID and Secret to backend `.env`

## 🔧 Development Guide

### Backend Development

#### Adding New Sports Sources
1. Create new scraper in `backend/src/services/scrapers/`
2. Extend `BaseScraper` class
3. Implement required methods:
   - `scrapeEvents()`
   - `validateEvent()`
   - `normalizeEvent()`
4. Register in `index.js` aggregator

#### API Endpoints
- `GET /api/sports/events` - Fetch all events
- `GET /api/sports/metadata` - Get teams/leagues/sports
- `POST /api/calendar/events` - Create calendar events
- `POST /api/sync/execute` - Manual sync
- `GET /api/auth/google` - Start OAuth flow

### Frontend Development

#### State Management
- **AppContext**: Global application state
- **useAuth**: Authentication state and actions
- **useEvents**: Events data and operations
- **useSync**: Sync status and controls

#### Adding New Pages
1. Create component in `src/pages/`
2. Add route in `App.jsx`
3. Update navigation in `Sidebar.jsx`
4. Add any required styles to `App.css`

#### Data Persistence
- **IndexedDB**: Local storage via Dexie
- **Automatic caching**: Events, preferences, tokens
- **Sync history**: Track all sync operations

## 📊 Features

### Core Functionality
- ✅ **Multi-source scraping** (24Media, Gazzetta)
- ✅ **Google Calendar integration** with OAuth
- ✅ **Real-time synchronization** with background workers
- ✅ **Local data persistence** with IndexedDB
- ✅ **Comprehensive filtering** by teams, leagues, sports
- ✅ **Responsive design** for all devices

### User Experience
- ✅ **Intuitive navigation** with sidebar and breadcrumbs
- ✅ **Real-time sync status** and progress indicators
- ✅ **Toast notifications** for user feedback
- ✅ **Calendar preview** before syncing
- ✅ **Detailed sync history** and error tracking

### Technical Features
- ✅ **Production-ready** with logging and error handling
- ✅ **Rate limiting** and request validation
- ✅ **Modular architecture** for easy extension
- ✅ **Background processing** with Web Workers
- ✅ **Optimistic updates** for better UX

## 🔄 Sync Process

### Automatic Sync
1. **Background Worker** runs every configurable interval
2. **Fetches events** from all enabled sources
3. **Deduplicates** and validates data
4. **Compares** with existing calendar events
5. **Syncs changes** to Google Calendar
6. **Updates local cache** and sync history

### Manual Sync
1. **Preview changes** before applying
2. **Selective sync** of specific events
3. **Batch operations** for efficiency
4. **Real-time progress** updates
5. **Detailed result** reporting

## 🎨 UI/UX Design

### Design System
- **Modern minimalist** design with clean typography
- **Blue and gray** color palette for professional look
- **Consistent spacing** and component sizing
- **Smooth animations** and transitions
- **Accessible** with proper contrast and keyboard navigation

### Responsive Breakpoints
- **Desktop**: Full sidebar and multi-column layouts
- **Tablet**: Collapsible sidebar and responsive grids
- **Mobile**: Stack layout with touch-friendly controls

## 🧪 Testing & Quality

### Backend Testing
```bash
cd backend
npm test
npm run test:coverage
```

### Frontend Testing
```bash
cd frontend
npm test
npm run test:coverage
```

### Code Quality
- **ESLint** for code style enforcement
- **Prettier** for consistent formatting
- **JSDoc** comments for documentation
- **Error boundaries** for graceful failure handling

## 🚀 Deployment

### Backend Deployment
1. Set production environment variables
2. Configure logging and monitoring
3. Set up reverse proxy (nginx)
4. Enable HTTPS with SSL certificates
5. Configure auto-scaling if needed

### Frontend Deployment
1. Build production bundle: `npm run build`
2. Deploy to CDN or static hosting
3. Configure domain and SSL
4. Set up analytics and monitoring

### Environment Variables (Production)
```env
NODE_ENV=production
PORT=443
CORS_ORIGIN=https://yourdomain.com
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
LOG_LEVEL=warn
```

## 📈 Monitoring & Analytics

### Backend Monitoring
- **Winston logging** with different levels
- **Error tracking** with stack traces
- **Performance metrics** and response times
- **API usage** statistics

### Frontend Analytics
- **User interaction** tracking
- **Sync success rates** monitoring
- **Error frequency** and types
- **Feature usage** statistics

## 🔐 Security

### Authentication & Authorization
- **OAuth 2.0** with Google for secure authentication
- **JWT tokens** for session management
- **CORS** protection for API access
- **Input validation** and sanitization

### Data Protection
- **No sensitive data** stored in frontend
- **Encrypted token** storage
- **Rate limiting** to prevent abuse
- **HTTPS only** in production

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Code review and merge

### Code Standards
- Follow existing code style
- Add tests for new features
- Update documentation
- Use meaningful commit messages

## 📖 API Documentation

### Authentication Endpoints
- `GET /auth/google` - Initiate OAuth flow
- `POST /auth/callback` - Handle OAuth callback
- `POST /auth/refresh` - Refresh access token
- `POST /auth/signout` - Sign out user
- `GET /auth/status` - Check auth status

### Sports Data Endpoints
- `GET /api/sports/events` - Get all events with filtering
- `GET /api/sports/metadata` - Get teams, leagues, sports data
- `POST /api/sports/refresh` - Force refresh from sources

### Calendar Endpoints
- `GET /api/calendar/events` - Get synced calendar events
- `POST /api/calendar/events` - Create calendar events
- `PUT /api/calendar/events/:id` - Update calendar event
- `DELETE /api/calendar/events/:id` - Delete calendar event
- `POST /api/calendar/batch` - Batch calendar operations

### Sync Endpoints
- `POST /api/sync/execute` - Execute manual sync
- `GET /api/sync/status` - Get sync status
- `GET /api/sync/history` - Get sync history
- `POST /api/sync/preview` - Preview sync changes

## 💡 Future Enhancements

### Planned Features
- [ ] **Email notifications** for important matches
- [ ] **Mobile app** with React Native
- [ ] **Social sharing** of favorite events
- [ ] **Advanced analytics** dashboard
- [ ] **Multi-language** support
- [ ] **Dark mode** theme option

### Technical Improvements
- [ ] **Redis caching** for better performance
- [ ] **GraphQL API** for flexible queries
- [ ] **Real-time updates** with WebSockets
- [ ] **Progressive Web App** features
- [ ] **Automated testing** with CI/CD
- [ ] **Performance monitoring** with APM tools

## 📞 Support

### Getting Help
- Check existing issues on GitHub
- Review documentation and setup guide
- Contact development team for specific questions

### Reporting Issues
- Use GitHub issues template
- Include reproduction steps
- Provide environment details
- Add relevant logs and screenshots

---

*Built with ❤️ for sports fans who want to never miss their favorite matches!*
