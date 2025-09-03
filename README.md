# Job Application Automation Platform

A comprehensive platform that automates job discovery, application processes, and pipeline management for tech/IT job seekers.

## Features

- 🔍 **Automated Job Discovery**: Web scraping from top tech/IT company career websites
- 🤖 **AI-Powered Resume Parsing**: Support for OpenAI, Claude, Gemini, and Ollama
- 📝 **Automated Applications**: Auto-fill job applications using your profile data
- 📊 **Visual Pipeline Management**: Drag-and-drop interface for tracking applications
- 📄 **Document Generation**: AI-powered cover letter creation
- 🔐 **Secure Authentication**: JWT-based user authentication and data protection

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- React DnD for drag-and-drop
- React Query for state management
- React Router for navigation

### Backend
- Node.js with Express.js
- TypeScript for type safety
- PostgreSQL for data storage
- Redis for caching and job queues
- JWT for authentication
- Puppeteer for web scraping
- Bull for background job processing

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for databases)
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd job-application-automation-platform
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Start databases**
   ```bash
   npm run db:up
   ```

4. **Set up environment variables**
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   
   # Frontend
   cp frontend/.env.example frontend/.env
   ```

5. **Start development servers**
   ```bash
   npm run dev
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- API Health Check: http://localhost:5000/api/health

### Optional Development Tools

Start additional tools for database management:
```bash
npm run tools:up
```

This provides:
- pgAdmin (PostgreSQL GUI): http://localhost:8080
- Redis Commander: http://localhost:8081

## Project Structure

```
job-application-automation-platform/
├── backend/                 # Node.js/Express backend
│   ├── src/
│   │   ├── server.ts       # Main server file
│   │   ├── types/          # TypeScript type definitions
│   │   └── test/           # Test setup
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.tsx         # Main app component
│   │   ├── main.tsx        # Entry point
│   │   ├── index.css       # Global styles
│   │   └── test/           # Test setup
│   ├── package.json
│   ├── vite.config.ts
│   └── tailwind.config.js
├── database/
│   └── init.sql            # Database schema
├── docker-compose.yml      # Database services
└── package.json            # Root package.json
```

## Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend in development mode
- `npm run build` - Build both frontend and backend for production
- `npm run test` - Run tests for both frontend and backend
- `npm run db:up` - Start PostgreSQL and Redis containers
- `npm run db:down` - Stop database containers
- `npm run db:reset` - Reset databases (removes all data)

### Backend
- `npm run dev` - Start backend in development mode with hot reload
- `npm run build` - Build backend for production
- `npm run start` - Start production backend
- `npm test` - Run backend tests

### Frontend
- `npm run dev` - Start frontend development server
- `npm run build` - Build frontend for production
- `npm run preview` - Preview production build
- `npm test` - Run frontend tests

## Environment Configuration

### Backend (.env)
```env
# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/job_automation

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# LLM APIs (optional)
OPENAI_API_KEY=your-openai-api-key
CLAUDE_API_KEY=your-claude-api-key
GEMINI_API_KEY=your-gemini-api-key
OLLAMA_ENDPOINT=http://localhost:11434
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_NODE_ENV=development
```

## Database Schema

The application uses PostgreSQL with the following main tables:
- `users` - User accounts and authentication
- `user_profiles` - User profile information and preferences
- `jobs` - Job postings from crawled websites
- `applications` - Job applications and their status
- `status_changes` - Application status history
- `llm_configs` - User-specific LLM configurations

## Development Workflow

1. **Start databases**: `npm run db:up`
2. **Start development**: `npm run dev`
3. **Make changes** to frontend or backend code
4. **Run tests**: `npm run test`
5. **Build for production**: `npm run build`

## Testing

The project includes comprehensive testing setup:
- **Backend**: Jest with TypeScript support
- **Frontend**: Vitest with React Testing Library
- **Integration**: Supertest for API testing
- **E2E**: Playwright (to be added in later tasks)

Run tests:
```bash
# All tests
npm run test

# Backend only
npm run test:backend

# Frontend only
npm run test:frontend
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details