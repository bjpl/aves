/**
 * Cost Estimation and Token Usage Optimization
 * Tracks API costs and optimizes token usage for Claude Vision API
 */

import { info } from './logger';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  imageTokens: number;
  totalTokens: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  imageCost: number;
  totalCost: number;
  currency: string;
}

export interface ModelPricing {
  inputTokenPrice: number; // per 1M tokens
  outputTokenPrice: number; // per 1M tokens
  imageTokenPrice: number; // per image (estimated)
}

// Claude Sonnet 4.5 pricing (as of 2025)
const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-sonnet-4-5-20250929': {
    inputTokenPrice: 3.00, // $3 per 1M input tokens
    outputTokenPrice: 15.00, // $15 per 1M output tokens
    imageTokenPrice: 0.0048 // ~4.8¢ per image (1.6k tokens @ $3/1M)
  },
  'claude-3-5-sonnet-20241022': {
    inputTokenPrice: 3.00,
    outputTokenPrice: 15.00,
    imageTokenPrice: 0.0048
  },
  'claude-3-opus-20240229': {
    inputTokenPrice: 15.00,
    outputTokenPrice: 75.00,
    imageTokenPrice: 0.024
  },
  'claude-3-sonnet-20240229': {
    inputTokenPrice: 3.00,
    outputTokenPrice: 15.00,
    imageTokenPrice: 0.0048
  },
  'claude-3-haiku-20240307': {
    inputTokenPrice: 0.25,
    outputTokenPrice: 1.25,
    imageTokenPrice: 0.0004
  }
};

export class CostEstimator {
  private model: string;
  private pricing: ModelPricing;
  private totalUsage: TokenUsage;
  private totalCost: CostBreakdown;

  constructor(model: string = 'claude-sonnet-4-5-20250929') {
    this.model = model;
    this.pricing = MODEL_PRICING[model] || MODEL_PRICING['claude-sonnet-4-5-20250929'];
    this.totalUsage = {
      inputTokens: 0,
      outputTokens: 0,
      imageTokens: 0,
      totalTokens: 0
    };
    this.totalCost = {
      inputCost: 0,
      outputCost: 0,
      imageCost: 0,
      totalCost: 0,
      currency: 'USD'
    };
  }

  /**
   * Estimate cost for a single annotation request
   */
  estimateAnnotationCost(
    promptLength: number,
    expectedOutputTokens: number = 1000,
    includeImage: boolean = true
  ): CostBreakdown {
    // Rough estimation: 4 chars ≈ 1 token
    const inputTokens = Math.ceil(promptLength / 4);
    const outputTokens = expectedOutputTokens;
    const imageTokens = includeImage ? 1600 : 0; // Typical image token count

    return this.calculateCost({
      inputTokens,
      outputTokens,
      imageTokens,
      totalTokens: inputTokens + outputTokens + imageTokens
    });
  }

  /**
   * Estimate cost for batch processing
   */
  estimateBatchCost(
    batchSize: number,
    promptLength: number,
    expectedOutputTokens: number = 1000
  ): CostBreakdown {
    const singleCost = this.estimateAnnotationCost(promptLength, expectedOutputTokens, true);

    return {
      inputCost: singleCost.inputCost * batchSize,
      outputCost: singleCost.outputCost * batchSize,
      imageCost: singleCost.imageCost * batchSize,
      totalCost: singleCost.totalCost * batchSize,
      currency: 'USD'
    };
  }

  /**
   * Calculate actual cost from token usage
   */
  calculateCost(usage: TokenUsage): CostBreakdown {
    const inputCost = (usage.inputTokens / 1_000_000) * this.pricing.inputTokenPrice;
    const outputCost = (usage.outputTokens / 1_000_000) * this.pricing.outputTokenPrice;
    const imageCost = (usage.imageTokens / 1_000_000) * this.pricing.inputTokenPrice;

    return {
      inputCost,
      outputCost,
      imageCost,
      totalCost: inputCost + outputCost + imageCost,
      currency: 'USD'
    };
  }

  /**
   * Track actual usage and cost
   */
  trackUsage(usage: TokenUsage): void {
    this.totalUsage.inputTokens += usage.inputTokens;
    this.totalUsage.outputTokens += usage.outputTokens;
    this.totalUsage.imageTokens += usage.imageTokens;
    this.totalUsage.totalTokens += usage.totalTokens;

    const cost = this.calculateCost(usage);
    this.totalCost.inputCost += cost.inputCost;
    this.totalCost.outputCost += cost.outputCost;
    this.totalCost.imageCost += cost.imageCost;
    this.totalCost.totalCost += cost.totalCost;
  }

  /**
   * Get total usage and cost
   */
  getTotalUsage(): { usage: TokenUsage; cost: CostBreakdown } {
    return {
      usage: { ...this.totalUsage },
      cost: { ...this.totalCost }
    };
  }

  /**
   * Reset tracking
   */
  reset(): void {
    this.totalUsage = {
      inputTokens: 0,
      outputTokens: 0,
      imageTokens: 0,
      totalTokens: 0
    };
    this.totalCost = {
      inputCost: 0,
      outputCost: 0,
      imageCost: 0,
      totalCost: 0,
      currency: 'USD'
    };
  }

  /**
   * Format cost for display
   */
  formatCost(cost: number): string {
    if (cost < 0.01) {
      return `$${(cost * 100).toFixed(4)}¢`;
    }
    return `$${cost.toFixed(4)}`;
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationTips(): string[] {
    const tips: string[] = [];

    if (this.totalUsage.outputTokens > this.totalUsage.inputTokens * 2) {
      tips.push('Consider reducing max_tokens to optimize output costs');
    }

    if (this.model.includes('opus')) {
      tips.push('Consider using Sonnet or Haiku for 80-95% cost reduction');
    }

    if (this.totalUsage.totalTokens > 100000) {
      tips.push('Use prompt caching for repeated prompts to reduce costs by 90%');
    }

    return tips;
  }

  /**
   * Log cost summary
   */
  logSummary(): void {
    const { usage, cost } = this.getTotalUsage();

    info('Cost Estimation Summary', {
      model: this.model,
      usage: {
        input: `${usage.inputTokens.toLocaleString()} tokens`,
        output: `${usage.outputTokens.toLocaleString()} tokens`,
        images: `${usage.imageTokens.toLocaleString()} tokens`,
        total: `${usage.totalTokens.toLocaleString()} tokens`
      },
      cost: {
        input: this.formatCost(cost.inputCost),
        output: this.formatCost(cost.outputCost),
        images: this.formatCost(cost.imageCost),
        total: this.formatCost(cost.totalCost)
      },
      optimizationTips: this.getOptimizationTips()
    });
  }
}
