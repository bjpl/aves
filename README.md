# Aves - Visual Spanish Bird Learning Platform

A web-based application for Spanish vocabulary acquisition through ornithological photography, employing an inductive pedagogical approach.

## 🎯 Core Features

Each feature is developed using SPARC methodology:

1. **Image Annotation System** - Bounding box annotations for anatomical and behavioral identification
2. **Vocabulary Disclosure System** - Progressive vocabulary reveal through hover/tap interactions
3. **Task-Based Exercises** - Visual discrimination, behavioral matching, and contextual sentence construction
4. **Species Browser** - Taxonomic organization with filtering and search
5. **Image Sourcing Pipeline** - Unsplash API integration with Midjourney prompt generation

## 🏗️ Architecture

- **Frontend**: React with Canvas/SVG for annotations
- **Backend**: Node.js/Express REST API
- **Database**: PostgreSQL for structured data
- **Image Annotation**: Annotorious library
- **Styling**: Nature-inspired aesthetics with Tailwind CSS

## 📁 Project Structure

```
aves/
├── frontend/          # React application
├── backend/           # Node.js API server
├── database/          # PostgreSQL schemas and migrations
├── docs/             # SPARC documentation for each feature
│   └── sparc/        # Feature-specific SPARC cycles
├── shared/           # Shared types and utilities
└── tests/            # Test suites
```

## 🚀 Development Process

Each feature follows SPARC methodology:
- **S**pecification: Define requirements and constraints
- **P**seudocode: Algorithm design and logic flow
- **A**rchitecture: Technical design and component structure
- **R**efinement: Optimization and enhancement
- **C**ompletion: Testing, documentation, and deployment

## 📝 License

MIT