import { RateLimitConfig, RateLimiterState } from '../../../shared/types/batch.types';
import { info, warn } from '../utils/logger';

/**
 * Token Bucket Rate Limiter
 *
 * Implements a token bucket algorithm for rate limiting API requests.
 * Each request consumes one token. Tokens refill at a constant rate.
 */
export class RateLimiter {
  private state: RateLimiterState;
  private config: RateLimitConfig;
  private refillInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = config;
    this.state = {
      tokens: config.burstSize,
      lastRefill: new Date(),
      requestQueue: []
    };

    // Start token refill timer
    this.startRefillTimer();
  }

  /**
   * Attempt to acquire a token for making a request
   * Returns true if token acquired, false if rate limit reached
   */
  async tryAcquire(): Promise<boolean> {
    if (this.state.tokens > 0) {
      this.state.tokens--;
      info('Rate limiter: Token acquired', {
        remainingTokens: this.state.tokens,
        config: this.config
      });
      return true;
    }

    warn('Rate limiter: No tokens available', {
      config: this.config,
      queueSize: this.state.requestQueue.length
    });
    return false;
  }

  /**
   * Wait for a token to become available
   * Returns when a token can be acquired
   */
  async waitForToken(): Promise<void> {
    while (this.state.tokens <= 0) {
      await this.sleep(100); // Check every 100ms
    }
    this.state.tokens--;
  }

  /**
   * Get current available tokens
   */
  getAvailableTokens(): number {
    return this.state.tokens;
  }

  /**
   * Get estimated wait time in milliseconds
   */
  getEstimatedWaitTime(): number {
    if (this.state.tokens > 0) {
      return 0;
    }

    const tokensPerSecond = this.config.requestsPerMinute / 60;
    const timeToNextToken = 1000 / tokensPerSecond;
    return Math.ceil(timeToNextToken);
  }

  /**
   * Start the token refill timer
   * Refills tokens at the configured rate
   */
  private startRefillTimer(): void {
    const refillIntervalMs = 1000; // Refill every second
    const tokensPerSecond = this.config.requestsPerMinute / 60;

    this.refillInterval = setInterval(() => {
      const tokensToAdd = Math.floor(tokensPerSecond);
      const newTokenCount = Math.min(
        this.state.tokens + tokensToAdd,
        this.config.burstSize
      );

      if (newTokenCount > this.state.tokens) {
        this.state.tokens = newTokenCount;
        this.state.lastRefill = new Date();

        info('Rate limiter: Tokens refilled', {
          tokens: this.state.tokens,
          maxTokens: this.config.burstSize
        });
      }
    }, refillIntervalMs);
  }

  /**
   * Stop the refill timer
   */
  stop(): void {
    if (this.refillInterval) {
      clearInterval(this.refillInterval);
      this.refillInterval = null;
    }
  }

  /**
   * Reset the rate limiter state
   */
  reset(): void {
    this.state = {
      tokens: this.config.burstSize,
      lastRefill: new Date(),
      requestQueue: []
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create rate limiters for different API tiers
 */
export function createRateLimiter(tier: 'free' | 'paid'): RateLimiter {
  const config: RateLimitConfig = tier === 'paid'
    ? {
        requestsPerMinute: 500,
        burstSize: 50, // Allow bursts up to 50 requests
        tier: 'paid'
      }
    : {
        requestsPerMinute: 10,
        burstSize: 5, // Allow bursts up to 5 requests
        tier: 'free'
      };

  return new RateLimiter(config);
}
