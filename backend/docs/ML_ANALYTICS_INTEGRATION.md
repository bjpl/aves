# ML Analytics Dashboard Integration

## Overview

Comprehensive ML optimization analytics system integrated into the AVES platform, providing real-time visibility into pattern learning, vocabulary balance, and quality improvements.

## Backend Implementation

### API Endpoints Created (`src/routes/ml-analytics.routes.ts`)

#### 1. GET `/api/ml/analytics/overview`
**Purpose**: Comprehensive ML optimization overview

**Response**:
```json
{
  "patternLearning": {
    "totalPatterns": 15,
    "speciesTracked": 6,
    "topFeatures": [...],
    "learningActive": true
  },
  "datasetMetrics": {
    "totalAnnotations": 56,
    "totalImages": 16,
    "avgConfidence": 0.94,
    "confidenceTrend": "+3.5",
    "annotationsPerImage": "3.5"
  },
  "qualityMetrics": {
    "recentAvgConfidence": 0.95,
    "historicalAvgConfidence": 0.92,
    "improvement": "+3.3%"
  }
}
```

#### 2. GET `/api/ml/analytics/vocabulary-balance`
**Purpose**: Vocabulary coverage and gap analysis

**Response**:
```json
{
  "features": [
    {
      "name": "beak",
      "count": 12,
      "avgConfidence": 0.94,
      "percentage": 21.4
    }
  ],
  "totalFeatures": 15,
  "targetVocabulary": 31,
  "coverage": "48.4",
  "topGaps": ["crown", "nape", "tail tip", ...]
}
```

#### 3. GET `/api/ml/analytics/pattern-learning`
**Purpose**: Detailed pattern learning metrics

**Response**:
```json
{
  "overview": {
    "totalPatterns": 15,
    "speciesTracked": 6
  },
  "topPatterns": [
    {
      "feature": "beak",
      "observations": 12,
      "confidence": 0.96,
      "reliability": "high"
    }
  ],
  "speciesInsights": [...],
  "learningStatus": "active"
}
```

#### 4. GET `/api/ml/analytics/quality-trends`
**Purpose**: Quality improvement trends over time

**Response**:
```json
{
  "trends": [
    {
      "period": "2025-W3",
      "avgConfidence": 0.92,
      "annotationCount": 28
    }
  ],
  "summary": {
    "improvement": "3.3",
    "currentQuality": 0.95,
    "totalWeeks": 4
  }
}
```

#### 5. GET `/api/ml/analytics/performance-metrics`
**Purpose**: ML pipeline performance metrics

**Response**:
```json
{
  "pipeline": {
    "batchSize": 10,
    "concurrency": 4,
    "totalDuration": 248410,
    "averageTaskDuration": 52412,
    "throughput": 0.068,
    "successRate": 100,
    "p50Duration": 52729,
    "p95Duration": 60495,
    "p99Duration": 60495
  },
  "improvements": {
    "totalImprovements": 5,
    "averageImprovement": 15.3,
    "criticalGapsResolved": 2
  },
  "status": {
    "lastRun": "2025-11-17T06:24:08.408Z",
    "pipelineStatus": "active"
  }
}
```

## Frontend Implementation

### React Hooks (`frontend/src/hooks/useMLAnalytics.ts`)

Created typed hooks for each ML analytics endpoint:

- `useMLOverview()` - Overall ML optimization status
- `useVocabularyBalance()` - Vocabulary coverage analysis
- `usePatternLearning()` - Pattern learning insights
- `useQualityTrends()` - Quality improvement trends
- `usePerformanceMetrics()` - Pipeline performance data

**Features**:
- TypeScript interfaces for all responses
- React Query integration with caching
- 2-5 minute stale times for efficiency
- Automatic retry logic
- Error handling with logging

### ML Analytics Dashboard Component (`frontend/src/components/admin/MLAnalyticsDashboard.tsx`)

Comprehensive dashboard displaying:

1. **Overview Cards**
   - Learned Patterns count
   - Quality Improvement percentage
   - Vocabulary Coverage percentage
   - Pipeline Throughput

2. **Pattern Learning Section**
   - Top learned patterns with reliability badges
   - Observation counts
   - Confidence scores

3. **Vocabulary Balance**
   - Top vocabulary gaps
   - Missing features highlighted
   - Coverage percentage

4. **Quality Trends**
   - Current quality score
   - Historical improvement tracking
   - Weekly trend data

5. **Performance Metrics**
   - P50, P95, P99 latency
   - Success rate
   - Concurrency level
   - Last run timestamp

6. **Species Insights**
   - Per-species annotation counts
   - Feature coverage
   - Recommended features for each species

## Integration with Existing System

### Backend Integration

Added ML analytics routes to `src/index.ts`:

```typescript
import mlAnalyticsRouter from './routes/ml-analytics.routes';
// ...
app.use('/api', mlAnalyticsRouter);
```

### PatternLearner Integration

ML analytics endpoints leverage the existing PatternLearner service:

- `patternLearner.getAnalytics()` - Get learning statistics
- `patternLearner.getRecommendedFeatures(species)` - Species-specific recommendations
- Cross-session memory persistence via Claude-flow

### Database Integration

Queries leverage existing Supabase tables:
- `annotations` - Annotation data with confidence scores
- `images` - Image metadata
- `species` - Species information

## ML Optimization Pipeline Integration

The analytics dashboard tracks metrics from:

1. **ML-Optimized Pipeline** (`scripts/ml-optimized-pipeline.ts`)
   - Vocabulary gap analysis
   - ML-guided species selection
   - Smart Unsplash curation
   - Pattern learning during annotation

2. **Performance Tracker** (`src/utils/performance-tracker.ts`)
   - P50/P95/P99 latency
   - Throughput metrics
   - Success rates

3. **Cost Estimator** (`src/utils/cost-estimator.ts`)
   - Token usage tracking
   - Cost projections

4. **Annotation Validator** (`src/services/AnnotationValidator.ts`)
   - Quality validation
   - Duplicate detection

## Usage Examples

### Accessing ML Analytics Dashboard

1. Navigate to admin panel
2. Click "ML Analytics" tab
3. View real-time ML optimization metrics

### API Usage

```bash
# Get ML overview
curl http://localhost:3001/api/ml/analytics/overview

# Get vocabulary balance
curl http://localhost:3001/api/ml/analytics/vocabulary-balance

# Get pattern learning insights
curl http://localhost:3001/api/ml/analytics/pattern-learning

# Get quality trends
curl http://localhost:3001/api/ml/analytics/quality-trends

# Get performance metrics
curl http://localhost:3001/api/ml/analytics/performance-metrics
```

### Frontend Component Usage

```tsx
import { MLAnalyticsDashboard } from '../components/admin/MLAnalyticsDashboard';

function AdminDashboard() {
  return (
    <div>
      <h1>ML Optimization</h1>
      <MLAnalyticsDashboard />
    </div>
  );
}
```

## Key Metrics Tracked

### Pattern Learning
- Total patterns learned
- Species tracked
- Top features by confidence
- Learning status (initializing/learning/active)

### Vocabulary Balance
- Total unique features
- Target vocabulary coverage
- Top vocabulary gaps
- Feature distribution

### Quality Improvements
- Recent vs historical confidence
- Improvement percentage
- Weekly quality trends
- Annotation count growth

### Performance
- Latency percentiles (P50, P95, P99)
- Throughput (images/second)
- Success rate
- Concurrency level
- Batch processing metrics

## Future Enhancements

1. **Real-time Updates**
   - WebSocket integration for live metrics
   - Auto-refresh dashboard

2. **Advanced Visualizations**
   - Charts for quality trends
   - Heatmaps for vocabulary coverage
   - Timeline for pattern learning progress

3. **Export Functionality**
   - CSV export for analytics
   - PDF reports generation
   - Email alerts for threshold breaches

4. **Comparative Analysis**
   - Before/after ML optimization comparisons
   - Species-to-species performance analysis
   - Time-series trend analysis

## Troubleshooting

### Backend Issues

**Problem**: ML analytics endpoint returns empty data
**Solution**: Run ML-optimized pipeline first to generate patterns

```bash
npx tsx scripts/ml-optimized-pipeline.ts
```

**Problem**: Pattern learning shows 0 patterns
**Solution**: PatternLearner needs initialization time (2-3 seconds)

### Frontend Issues

**Problem**: Dashboard shows loading indefinitely
**Solution**: Check backend is running and endpoints are accessible

```bash
curl http://localhost:3001/api/ml/analytics/overview
```

**Problem**: Missing data in dashboard
**Solution**: Ensure sufficient annotations exist in database

## Related Files

### Backend
- `/src/routes/ml-analytics.routes.ts` - ML analytics API endpoints
- `/src/services/PatternLearner.ts` - Pattern learning service
- `/src/utils/performance-tracker.ts` - Performance metrics
- `/scripts/ml-optimized-pipeline.ts` - ML optimization pipeline

### Frontend
- `/frontend/src/hooks/useMLAnalytics.ts` - React Query hooks
- `/frontend/src/components/admin/MLAnalyticsDashboard.tsx` - Dashboard component
- `/frontend/src/hooks/useAnnotationAnalytics.ts` - Existing analytics hooks

## Conclusion

The ML Analytics Dashboard provides comprehensive visibility into the ML optimization systems, enabling data-driven decisions about training data curation, vocabulary balance, and quality improvements. All metrics are accessible via REST API and visualized in a user-friendly dashboard.
