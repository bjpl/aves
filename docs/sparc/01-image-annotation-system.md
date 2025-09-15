# SPARC Development: Image Annotation System

## 📋 SPECIFICATION

### Purpose
Create an interactive image annotation system that overlays bounding boxes on bird photographs to identify anatomical features and behaviors for Spanish vocabulary learning.

### Requirements
1. **Functional Requirements**
   - Display bird images with overlayable bounding boxes
   - Support multiple annotation types (anatomical parts, behaviors, colors)
   - Enable hover/click interactions to reveal Spanish vocabulary
   - Maintain responsive design across devices
   - Store and retrieve annotations from database

2. **Non-Functional Requirements**
   - Performance: Annotations render < 100ms
   - Accessibility: Keyboard navigation support
   - Scalability: Support 1000+ annotated images
   - Browser compatibility: Chrome, Firefox, Safari, Edge

### Constraints
- Use open-source annotation library (Annotorious)
- Canvas/SVG based rendering for performance
- PostgreSQL for persistent storage
- RESTful API communication

## 🔤 PSEUDOCODE

```
FUNCTION renderAnnotatedImage(imageId):
    image = fetchImageData(imageId)
    annotations = fetchAnnotations(imageId)

    canvas = createCanvas(image.dimensions)
    drawImage(canvas, image)

    FOR EACH annotation IN annotations:
        boundingBox = createBoundingBox(annotation.coordinates)

        IF annotation.type == "anatomical":
            boundingBox.color = ANATOMICAL_COLOR
        ELSE IF annotation.type == "behavioral":
            boundingBox.color = BEHAVIORAL_COLOR

        boundingBox.onHover = FUNCTION():
            showVocabularyPopup(annotation.spanish_term, annotation.english_term)

        drawBoundingBox(canvas, boundingBox)

    RETURN canvas

FUNCTION createAnnotation(imageId, coordinates, annotationData):
    annotation = {
        imageId: imageId,
        coordinates: normalizeCoordinates(coordinates),
        type: annotationData.type,
        spanish_term: annotationData.spanish,
        english_term: annotationData.english,
        difficulty: calculateDifficulty(annotationData.spanish)
    }

    saveToDatabase(annotation)
    refreshCanvas(imageId)
    RETURN annotation
```

## 🏗️ ARCHITECTURE

### Component Structure
```
AnnotationSystem/
├── components/
│   ├── AnnotationCanvas.tsx       # Main canvas component
│   ├── BoundingBox.tsx            # Individual annotation box
│   ├── VocabularyPopup.tsx        # Hover/click vocabulary display
│   └── AnnotationToolbar.tsx      # Creation/editing tools
├── hooks/
│   ├── useAnnotations.ts          # Annotation state management
│   ├── useCanvas.ts               # Canvas operations
│   └── useImageLoader.ts          # Image loading/caching
├── services/
│   ├── annotationAPI.ts           # Backend communication
│   └── coordinateUtils.ts         # Coordinate transformations
└── types/
    └── annotation.types.ts        # TypeScript definitions
```

### Data Model
```sql
CREATE TABLE annotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_id UUID REFERENCES images(id),
    coordinates JSONB NOT NULL, -- {x, y, width, height}
    annotation_type VARCHAR(50) NOT NULL,
    spanish_term VARCHAR(100) NOT NULL,
    english_term VARCHAR(100) NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_annotations_image ON annotations(image_id);
CREATE INDEX idx_annotations_type ON annotations(annotation_type);
```

## 🔧 REFINEMENT

### Optimization Strategies
1. **Performance**
   - Implement virtual scrolling for large annotation sets
   - Use WebWorkers for coordinate calculations
   - Cache rendered annotations in IndexedDB

2. **User Experience**
   - Add smooth transitions for hover effects
   - Implement zoom/pan for detailed inspection
   - Provide annotation clustering at low zoom levels

3. **Code Quality**
   - Extract reusable annotation logic into custom hooks
   - Implement comprehensive error boundaries
   - Add performance monitoring with Web Vitals

### Enhanced Features
- Multi-select annotations for group operations
- Annotation templates for common patterns
- Export annotations as JSON/CSV
- Collaborative annotation mode

## ✅ COMPLETION

### Testing Strategy
- Unit tests for coordinate calculations
- Integration tests for API communication
- E2E tests for user interactions
- Performance benchmarks for rendering

### Documentation
- API documentation with OpenAPI/Swagger
- Component storybook for UI elements
- User guide for annotation tools
- Developer guide for extending system

### Deployment Checklist
- [ ] All tests passing
- [ ] Performance metrics meet requirements
- [ ] Accessibility audit completed
- [ ] Cross-browser testing verified
- [ ] Production build optimized
- [ ] Monitoring and logging configured