# Aves - Visual Spanish Bird Learning Platform

🦅 **An inductive learning platform for Spanish ornithological vocabulary acquisition through interactive photography**

Aves leverages **visual-spatial memory** and **contextual discovery** to teach Spanish bird terminology through an engaging, image-based interface. Built with modern web technologies and following **SPARC methodology** for each core feature.

## ✨ Core Features

### 🎯 **Image Annotation System**
- Canvas-based high-performance rendering
- Interactive bounding box annotations
- Hover and click detection with coordinate mapping
- Support for anatomical, color, and behavioral annotations

### 📚 **Progressive Vocabulary Disclosure**
- **5-level disclosure system**: Hidden → Hover → Click → Etymology → Examples
- Session-based progress tracking
- Visual feedback for discovered terms
- Contextual learning without cognitive overload

### 🎮 **Task-Based Exercises**
- **Visual Discrimination**: Match images to Spanish terms
- **Contextual Fill**: Complete sentences with correct vocabulary
- Real-time feedback and progress tracking
- Difficulty scaling based on term complexity

### 🦜 **Species Browser**
- Taxonomic hierarchy navigation (Order → Family → Genus → Species)
- Multi-faceted filtering (habitat, size, color, behavior)
- Rich species profiles with distribution maps
- Conservation status indicators

### 📷 **Image Sourcing Pipeline**
- Unsplash API integration with rate limiting
- Intelligent prompt generation for missing species
- Fallback image strategies
- Attribution and licensing compliance

## 🛠️ Technology Stack

### **Frontend Architecture**
- **React 18** with TypeScript for type-safe component development
- **Vite** for lightning-fast HMR and optimized builds
- **Canvas API** for performant annotation rendering
- **React Router v6** for declarative routing
- **Tailwind CSS** for utility-first styling

### **Backend Infrastructure**
- **Node.js + Express** REST API
- **PostgreSQL** with optimized indexing strategies
- **Session-based authentication** (no user accounts required)
- **Rate limiting** and API compliance management

### **Development Practices**
- **SPARC Methodology** for feature development
- **TypeScript** throughout the stack
- **Barrel exports** for clean module organization
- **Git flow** with feature branches and regular commits

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Unsplash API key (optional, for image sourcing)

### Installation

```bash
# Clone the repository
git clone https://github.com/bjpl/aves.git
cd aves

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aves

# API Keys
UNSPLASH_ACCESS_KEY=your_unsplash_key

# Server
PORT=3000
NODE_ENV=development
```

## 📁 Project Structure

```
aves/
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   │   ├── annotation/    # Canvas annotation system
│   │   │   ├── exercises/     # Learning exercises
│   │   │   ├── species/       # Species browser
│   │   │   └── vocabulary/    # Disclosure system
│   │   ├── pages/             # Route-level components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API and external services
│   │   ├── utils/             # Helper functions
│   │   ├── types/             # TypeScript definitions
│   │   └── constants/         # App-wide constants
│   └── public/                # Static assets
├── backend/                    # Express API
│   ├── src/
│   │   ├── routes/           # API endpoints
│   │   ├── controllers/      # Route handlers
│   │   ├── services/         # Business logic
│   │   └── middleware/       # Express middleware
│   └── tests/                # API tests
├── shared/                    # Shared code
│   └── types/                # Shared TypeScript types
├── database/                  # Database schema
│   ├── schemas/              # SQL schema files
│   └── migrations/           # Migration scripts
└── docs/                     # Documentation
    ├── sparc/               # SPARC methodology docs
    └── api/                 # API documentation
```

## 🔧 Development

### Available Scripts

```bash
# Frontend
npm run dev:frontend      # Start frontend dev server
npm run build:frontend    # Build for production
npm run preview          # Preview production build

# Backend
npm run dev:backend      # Start backend with nodemon
npm run build:backend    # Compile TypeScript
npm run start           # Start production server

# Database
npm run db:migrate      # Run pending migrations
npm run db:seed        # Seed sample data
npm run db:reset       # Reset database

# Testing
npm run test           # Run all tests
npm run test:unit      # Unit tests only
npm run test:e2e       # E2E tests only

# Code Quality
npm run lint          # Run ESLint
npm run format        # Format with Prettier
npm run typecheck     # TypeScript type checking
```

### API Documentation

The API follows RESTful conventions. Full documentation available in [`docs/api/`](docs/api/).

#### Key Endpoints

```typescript
// Annotations
GET    /api/annotations          // List all annotations
POST   /api/annotations          // Create new annotation
GET    /api/annotations/:id      // Get specific annotation
PUT    /api/annotations/:id      // Update annotation
DELETE /api/annotations/:id      // Delete annotation

// Vocabulary
GET    /api/vocabulary/progress  // Get user progress
POST   /api/vocabulary/interact  // Record interaction
GET    /api/vocabulary/terms     // List vocabulary terms

// Exercises
GET    /api/exercises            // List available exercises
POST   /api/exercises/submit     // Submit exercise answer
GET    /api/exercises/progress   // Get exercise progress

// Species
GET    /api/species              // Browse species
GET    /api/species/:id          // Get species details
GET    /api/species/search       // Search species

// Images
GET    /api/images/search        // Search Unsplash
GET    /api/images/:id           // Get image details
POST   /api/images/cache         // Cache image locally
```

## 🎯 SPARC Methodology

Each feature undergoes a complete SPARC cycle:

### **S**pecification
Define clear requirements, constraints, and success criteria

### **P**seudocode
Design algorithms and logic flow before implementation

### **A**rchitecture
Plan technical design, component structure, and data flow

### **R**efinement
Optimize performance, enhance UX, and address edge cases

### **C**ompletion
Ensure testing coverage, documentation, and deployment readiness

## 📊 Learning Principles

### **Inductive Learning Approach**
- Discovery-based rather than instruction-based
- Visual context precedes linguistic labels
- Progressive complexity from concrete to abstract

### **Cognitive Load Management**
- Chunked information presentation
- Just-in-time vocabulary disclosure
- Spaced practice opportunities

### **Multi-Modal Reinforcement**
- Visual (images and annotations)
- Textual (Spanish and English terms)
- Interactive (exercises and exploration)
- Contextual (sentences and usage examples)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Follow SPARC methodology for new features
4. Commit changes (`git commit -m 'Add AmazingFeature'`)
5. Push to branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request

## 📈 Roadmap

- [ ] Mobile responsive design
- [ ] Offline mode with service workers
- [ ] Audio pronunciations
- [ ] Social features (leaderboards, sharing)
- [ ] Advanced analytics dashboard
- [ ] Multi-language support
- [ ] AR bird identification mode
- [ ] API for third-party integrations

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Unsplash** for providing high-quality bird photography
- **Cornell Lab of Ornithology** for taxonomic data
- **SPARC Methodology** for structured development approach
- **Open source community** for the amazing tools and libraries

---

**Built with 🧡 for language learners and bird enthusiasts**

[Demo](https://aves-demo.example.com) | [Documentation](docs/) | [Issues](https://github.com/bjpl/aves/issues)