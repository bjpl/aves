# SPARC Development: Species Browser

## 📋 SPECIFICATION

### Purpose
Create an intuitive species browser that organizes birds by taxonomic classification, habitat, and visual characteristics, enabling learners to explore and discover Spanish bird vocabulary systematically.

### Requirements
1. **Functional Requirements**
   - Browse by taxonomic order (family, genus, species)
   - Filter by habitat (forest, wetland, coastal, urban)
   - Filter by size (small, medium, large)
   - Filter by primary color
   - Search by Spanish or English name
   - Grid and list view options
   - Species detail pages with all annotations

2. **Non-Functional Requirements**
   - Fast filtering (<100ms response)
   - Responsive grid layout
   - Lazy loading for images
   - Accessible navigation

### Organization Structure
- **Taxonomic**: Order → Family → Species
- **Habitat-based**: Environment type groupings
- **Visual**: Color and size categories
- **Alphabetical**: A-Z listing

## 🔤 PSEUDOCODE

```
CLASS SpeciesBrowser:
    species = Array<Species>
    filters = {
        order: null,
        family: null,
        habitat: null,
        size: null,
        color: null,
        searchTerm: ""
    }
    viewMode = "grid" | "list"

    FUNCTION loadSpecies():
        species = fetchFromDatabase()
        taxonomicTree = buildTaxonomicTree(species)
        RETURN species

    FUNCTION buildTaxonomicTree(species):
        tree = {}
        FOR EACH bird IN species:
            IF NOT tree[bird.order]:
                tree[bird.order] = {}
            IF NOT tree[bird.order][bird.family]:
                tree[bird.order][bird.family] = []
            tree[bird.order][bird.family].push(bird)
        RETURN tree

    FUNCTION applyFilters(species, filters):
        filtered = species

        IF filters.searchTerm:
            filtered = filtered.filter(s =>
                s.spanishName.includes(filters.searchTerm) OR
                s.englishName.includes(filters.searchTerm)
            )

        IF filters.order:
            filtered = filtered.filter(s => s.order == filters.order)

        IF filters.family:
            filtered = filtered.filter(s => s.family == filters.family)

        IF filters.habitat:
            filtered = filtered.filter(s => s.habitats.includes(filters.habitat))

        IF filters.size:
            filtered = filtered.filter(s => s.size == filters.size)

        IF filters.color:
            filtered = filtered.filter(s => s.primaryColors.includes(filters.color))

        RETURN filtered

    FUNCTION getSpeciesStats(species):
        RETURN {
            totalSpecies: species.length,
            byOrder: groupBy(species, 'order'),
            byHabitat: groupBy(species, 'habitat'),
            annotationsCount: sum(species.map(s => s.annotations.length))
        }
```

## 🏗️ ARCHITECTURE

### Component Structure
```
SpeciesBrowser/
├── components/
│   ├── SpeciesBrowser.tsx         # Main container
│   ├── SpeciesGrid.tsx           # Grid view layout
│   ├── SpeciesList.tsx           # List view layout
│   ├── SpeciesCard.tsx           # Individual species card
│   ├── SpeciesFilters.tsx        # Filter sidebar
│   ├── TaxonomicTree.tsx         # Hierarchical browser
│   └── SpeciesDetail.tsx         # Detail view page
├── hooks/
│   ├── useSpecies.ts              # Species data management
│   └── useFilters.ts              # Filter state management
├── services/
│   └── speciesAPI.ts              # Backend communication
└── types/
    └── species.types.ts           # TypeScript definitions
```

### Data Model
```sql
-- Species information
CREATE TABLE species (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scientific_name VARCHAR(200) UNIQUE NOT NULL,
    spanish_name VARCHAR(200) NOT NULL,
    english_name VARCHAR(200) NOT NULL,
    order_name VARCHAR(100) NOT NULL,
    family_name VARCHAR(100) NOT NULL,
    genus VARCHAR(100) NOT NULL,
    size_category VARCHAR(20) CHECK (size_category IN ('small', 'medium', 'large')),
    primary_colors TEXT[], -- Array of main colors
    habitats TEXT[], -- Array of habitat types
    conservation_status VARCHAR(20),
    description_spanish TEXT,
    description_english TEXT,
    fun_fact TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Species images mapping
CREATE TABLE species_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    species_id UUID REFERENCES species(id) ON DELETE CASCADE,
    image_id UUID REFERENCES images(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for filtering
CREATE INDEX idx_species_order ON species(order_name);
CREATE INDEX idx_species_family ON species(family_name);
CREATE INDEX idx_species_size ON species(size_category);
CREATE INDEX idx_species_spanish ON species(spanish_name);
CREATE INDEX idx_species_english ON species(english_name);
```

## 🔧 REFINEMENT

### Optimization Strategies
1. **Performance**
   - Virtual scrolling for large lists
   - Image lazy loading with intersection observer
   - Filter debouncing for search
   - Client-side filtering for instant response

2. **User Experience**
   - Sticky filters sidebar
   - Clear active filter indicators
   - Quick filter reset button
   - Breadcrumb navigation for taxonomy

3. **Visual Design**
   - Card hover effects showing key facts
   - Color-coded conservation status
   - Habitat icons for quick identification
   - Smooth transitions between views

## ✅ COMPLETION

### Testing Strategy
- Unit tests for filter logic
- Component tests for user interactions
- Performance tests for large datasets
- Visual regression tests for layouts

### Success Metrics
- Filter response time
- Species discovery rate
- Navigation path efficiency
- Mobile usability score

### Deployment Checklist
- [ ] All filter combinations working
- [ ] Search functionality accurate
- [ ] Grid/list views responsive
- [ ] Images loading efficiently
- [ ] Navigation breadcrumbs functional