# Aves - Visual Spanish Bird Learning Platform

An AI-powered inductive learning platform for Spanish ornithological vocabulary acquisition through interactive photography.

## Table of Contents
- [Overview](#overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Development](#development)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## Overview

Aves leverages visual-spatial memory, AI-powered annotations, and contextual discovery to teach Spanish bird terminology through an engaging, image-based interface. Built with modern web technologies and following SPARC methodology for systematic feature development.

The platform combines GPT-4 Vision API for automatic bird feature detection with an interactive canvas-based annotation system, progressive vocabulary disclosure, and AI-powered exercise generation to create a comprehensive language learning experience.

**Version**: 0.1.0
**Status**: ACTIVE - Phase 3 Week 1 Complete

## Live Demo

**Deployed Application:** [View Live Demo](https://bjpl.github.io/aves/)

This project demonstrates AI-powered educational software combining GPT-4 Vision API with interactive canvas-based learning interfaces. The implementation showcases integration of modern web technologies, AI APIs, and evidence-based language acquisition techniques.

## Technical Overview

**Key Technologies:**
- GPT-4 Vision API for automatic feature detection and annotation generation
- React with TypeScript for type-safe component architecture
- Canvas API for high-performance interactive rendering
- PostgreSQL 14+ with RESTful backend architecture
- React Query for efficient state management and caching
- Zustand for client-side state persistence
- Vite for modern build tooling

**Implementation Highlights:**
- AI-powered image annotation with intelligent caching (95%+ hit rate)
- Interactive bounding box system with coordinate mapping
- Progressive vocabulary disclosure (5-level system: Hidden to Examples)
- Adaptive exercise generation based on user performance
- Session-based progress tracking with real-time feedback
- Responsive design supporting mobile and desktop

## Features

### AI-Powered Vision Annotations
- GPT-4 Vision API integration for automatic bird feature detection
- Intelligent annotation generation for anatomy, colors, and behavior
- Caching system to minimize API costs
- Batch processing for multiple images
- Automatic Spanish terminology mapping

### Interactive Image Annotation System
- Canvas-based high-performance rendering
- Interactive bounding box annotations
- Hover and click detection with coordinate mapping
- Support for anatomical, color, and behavioral annotations
- Responsive design with mobile support

### Progressive Vocabulary Disclosure
- 5-level disclosure system: Hidden, Hover, Click, Etymology, Examples
- Session-based progress tracking with React Query
- Visual feedback for discovered terms
- Contextual learning without cognitive overload
- Client-side state persistence with Zustand

### AI-Powered Exercise Generation
- GPT-4-based intelligent exercise creation
- Multiple exercise types: Visual Discrimination, Contextual Fill, Term Matching, Translation Practice
- Adaptive difficulty based on user performance
- Real-time feedback and progress tracking
- User context integration for personalized learning
- Exercise caching system with 95%+ hit rate

### Species Browser
- Taxonomic hierarchy navigation
- Multi-faceted filtering by habitat, size, color, and behavior
- Rich species profiles with distribution maps
- Conservation status indicators
- Client-side CMS for content management

## Exploring the Code

The project demonstrates modern full-stack architecture with workspace-based monorepo:

```
aves/
├── frontend/                       # React application
│   ├── src/
│   │   ├── components/            # Interactive UI components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── services/              # API integration layer
│   │   └── types/                 # TypeScript definitions
│   └── e2e/                       # Playwright E2E tests
├── backend/                        # Express API server
│   ├── src/
│   │   ├── routes/                # RESTful API endpoints
│   │   ├── services/              # Business logic layer
│   │   ├── middleware/            # Express middleware
│   │   └── database/              # Database utilities
├── shared/                         # Shared TypeScript types
└── docs/                           # API documentation
```

**Architecture Highlights:**
- Workspace-based monorepo with npm workspaces
- Type-safe shared contracts between frontend and backend
- AI service layer with intelligent caching strategy
- Progressive enhancement for offline capability
- Comprehensive test coverage (unit, integration, E2E)

**For Technical Review:**

Those interested in the implementation details can explore:
- `/frontend/src` for React components and AI integration
- `/backend/src` for API architecture and GPT-4 Vision integration
- `/docs/api` for comprehensive API documentation
- Test suites demonstrating TDD practices

<details>
<summary>Local Development Setup (Optional)</summary>

**Prerequisites:**
- Node.js 18+ and npm 9+
- PostgreSQL 14+ (for backend development)
- OpenAI API key (for AI features)

**Setup:**
```bash
# Clone repository
git clone https://github.com/bjpl/aves.git
cd aves

# Install all dependencies
npm install

# Configure environment
cd backend && cp .env.example .env
cd ../frontend && cp .env.example .env
# Edit .env files with your configuration

# Run database migrations
cd ../backend && npm run migrate

# Start development servers
cd .. && npm run dev
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
```

**Available Scripts:**
```bash
npm run dev              # Run both frontend + backend
npm run build            # Build both workspaces
npm run test             # Run tests in both workspaces
```

</details>

## Project Structure

```
aves/
├── frontend/                       # React application
│   ├── src/
│   │   ├── components/            # React components
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── services/              # API clients
│   │   ├── utils/                 # Helper functions
│   │   └── types/                 # TypeScript definitions
│   └── e2e/                       # Playwright E2E tests
├── backend/                        # Express API server
│   ├── src/
│   │   ├── routes/                # API endpoints
│   │   ├── services/              # Business logic
│   │   ├── middleware/            # Express middleware
│   │   └── database/              # Database utilities
├── shared/                         # Shared TypeScript types
├── docs/                           # Documentation
└── database/                       # Database schema files
```

## Development

### Available Scripts

#### Root Workspace
```bash
npm run dev              # Run both frontend + backend
npm run build            # Build both workspaces
npm run test             # Run tests in both workspaces
npm run lint             # Lint both workspaces
```

#### Frontend
```bash
npm run dev              # Start Vite dev server
npm run build            # Build for production
npm run test             # Run Vitest unit tests
npm run test:e2e         # Run Playwright E2E tests
npm run deploy           # Deploy to GitHub Pages
```

#### Backend
```bash
npm run dev              # Start server with hot reload
npm run build            # Compile TypeScript
npm run test             # Run Jest tests
npm run migrate          # Run database migrations
```

## API Documentation

The API follows RESTful conventions. Full documentation available in the docs/api/ directory.

### Key Endpoints

#### AI-Powered Endpoints
```
POST   /api/ai/annotations/generate      # Generate annotations with GPT-4 Vision
POST   /api/ai/exercises/generate        # Generate exercises with GPT-4
GET    /api/ai/annotations/:speciesId    # Get AI-generated annotations
```

#### Core Endpoints
```
GET    /api/annotations                  # List all annotations
POST   /api/annotations                  # Create new annotation
GET    /api/vocabulary/progress          # Get user progress
POST   /api/exercises/session/start      # Start exercise session
```

## Contributing

Contributions are welcome. Please read the Contributing Guide for details on the code of conduct and the process for submitting pull requests.

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Follow SPARC methodology for new features
4. Commit changes with meaningful messages
5. Push to branch
6. Open a Pull Request

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
