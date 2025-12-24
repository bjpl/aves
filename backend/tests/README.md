# Reinforcement Learning Test Suite

Comprehensive tests for the ML-powered annotation improvement system.

## Test Structure

```
tests/
├── helpers/
│   └── mockDataGenerators.ts    # Realistic test data generation
├── services/
│   ├── PatternLearner.test.ts   # Core RL engine tests
│   └── ReinforcementLearningEngine.test.ts  # Feedback capture tests
└── routes/
    └── feedbackAnalytics.test.ts  # API integration tests
```

## Running Tests

```bash
# Run all RL tests
npm test -- tests/services/PatternLearner.test.ts

# Run specific test suite
npm test -- tests/services/PatternLearner.test.ts -t "Position Correction"

# Run with coverage
npm test -- --coverage tests/
```

## Test Coverage

### Feedback Capture (✓ Complete)
- Position correction with delta calculation
- Approval with confidence reinforcement
- Rejection with category extraction
- Concurrent feedback event handling

### Learning Tests (✓ Complete)
- Training from 10+ corrections → adjustment model
- Rejection pattern identification
- Approval reinforcement → confidence increase
- Cross-species generalization

### Neural Model Tests (✓ Complete)
- Position optimizer training
- Prediction accuracy (>70% target)
- Batch optimization
- Graceful degradation with limited data

### Integration Tests (✓ Complete)
- Approved annotations improve future generations
- Rejected patterns are avoided
- Position corrections reduce future deltas
- Learning persists across sessions

## Mock Data Examples

```typescript
// Generate single annotation
const annotation = createMockAnnotation({
  spanishTerm: 'el pico',
  confidence: 0.88
});

// Generate correction dataset
const corrections = createCorrectionBatch(10, 'el pico', 'Mallard Duck', 0.05, 0.03);

// Generate concurrent events for stress testing
const events = createConcurrentFeedbackEvents(100);
```

## Key Test Scenarios

1. **Feedback Capture**: Validates all feedback types are captured correctly
2. **Pattern Learning**: Ensures patterns are learned from sufficient samples (3+ required)
3. **Position Correction**: Tests delta calculation and aggregation
4. **Rejection Learning**: Tracks common rejection reasons
5. **Approval Reinforcement**: Boosts confidence for approved patterns
6. **Cross-Species**: Maintains separate patterns per species
7. **Concurrent Events**: Handles race conditions in feedback processing
8. **Edge Cases**: Empty batches, low confidence, invalid data

## Test Data Characteristics

- **Realistic Bounding Boxes**: Centered around typical bird feature positions
- **Confidence Variation**: 0.75-0.95 for high-quality annotations
- **Species Diversity**: 5 common species for generalization tests
- **Time Series**: 30-day datasets for trend analysis
- **Edge Cases**: Extreme corrections, invalid boxes, empty batches

## Performance Metrics

- **Pattern Learning**: 3+ samples required for pattern formation
- **Confidence Threshold**: 0.75 minimum for learning
- **Correction Weight**: 1.5x higher than initial observations
- **Approval Boost**: +0.05 confidence increase
- **Rejection Penalty**: -0.1 confidence decrease

## Continuous Improvement

Tests validate that the system:
1. Learns from expert corrections
2. Avoids repeated mistakes
3. Improves accuracy over time
4. Maintains separate models per species
5. Degrades gracefully with limited data
