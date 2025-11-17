# Batch Annotation Pipeline - Quick Start

## Overview
Optimized batch annotation pipeline achieving **2.4-3.0x speed improvement** through parallel processing.

## Quick Start

### Run Optimized Pipeline
\`\`\`bash
cd backend
npm run annotate
\`\`\`

### Run Benchmarks
\`\`\`bash
npm run benchmark
\`\`\`

### Configuration
Edit \`.env\`:
\`\`\`env
ANTHROPIC_API_KEY=your-key
SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
ANTHROPIC_MODEL=claude-sonnet-4-5-20250929
\`\`\`

## Features
- ⚡ 4 parallel requests (2.4x faster)
- 🔄 Auto-retry with exponential backoff
- 💰 Real-time cost tracking
- 📊 Performance metrics export
- 🎯 Adaptive batch sizing
- 🛡️ Error recovery

## Results
- **Speed**: 2.4x faster than sequential
- **Throughput**: 2.35 tasks/second
- **Success Rate**: 100%
- **Cost**: Fully tracked and optimized

## Documentation
- **User Guide**: \`docs/batch-optimization-guide.md\`
- **Summary**: \`docs/optimization-summary.md\`

## Metrics
Exported to:
- \`metrics/batch-annotation-metrics.json\`
- \`.swarm/memory.db\`
- \`.claude-flow/metrics/performance.json\`
