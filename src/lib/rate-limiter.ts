/**
 * Simple in-memory rate limiter
 * Limits requests per IP address within a time window
 */

interface RateLimitEntry {
    count: number;
    resetTime: number;
}

// In-memory store for rate limiting
// Note: This resets on server restart. For production with multiple instances,
// consider using Redis (e.g., @upstash/ratelimit)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
        if (now > entry.resetTime) {
            rateLimitStore.delete(key);
        }
    }
}, 60000); // Clean up every minute

export interface RateLimitConfig {
    /** Maximum number of requests allowed in the window */
    maxRequests: number;
    /** Time window in milliseconds */
    windowMs: number;
}

export interface RateLimitResult {
    success: boolean;
    remaining: number;
    resetTime: number;
    retryAfterMs?: number;
}

/**
 * Check if a request should be rate limited
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param config - Rate limit configuration
 * @returns RateLimitResult indicating if request is allowed
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const now = Date.now();
    const key = identifier;

    let entry = rateLimitStore.get(key);

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetTime) {
        entry = {
            count: 1,
            resetTime: now + config.windowMs,
        };
        rateLimitStore.set(key, entry);

        return {
            success: true,
            remaining: config.maxRequests - 1,
            resetTime: entry.resetTime,
        };
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
        return {
            success: false,
            remaining: 0,
            resetTime: entry.resetTime,
            retryAfterMs: entry.resetTime - now,
        };
    }

    // Increment count
    entry.count++;

    return {
        success: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime,
    };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
    // Check various headers for the real IP (behind proxies/load balancers)
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
        return realIP;
    }

    // Fallback to a default identifier
    return 'unknown';
}

// Pre-configured rate limits for different endpoints
export const RATE_LIMITS = {
    // Convert API: 10 requests per minute
    convert: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 1 minute
    },
    // History API: 30 requests per minute
    history: {
        maxRequests: 30,
        windowMs: 60 * 1000, // 1 minute
    },
    // Auth API: 5 requests per minute (stricter for security)
    auth: {
        maxRequests: 5,
        windowMs: 60 * 1000, // 1 minute
    },
} as const;
