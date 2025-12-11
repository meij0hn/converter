/**
 * Conditional Logger - Only logs in development mode
 * Use this instead of console.log to prevent sensitive data exposure in production
 */

const isDev = process.env.NODE_ENV === 'development';

export const logger = {
    /**
     * Log messages only in development mode
     */
    log: (...args: unknown[]) => {
        if (isDev) {
            console.log(...args);
        }
    },

    /**
     * Log debug messages only in development mode
     */
    debug: (...args: unknown[]) => {
        if (isDev) {
            console.debug(...args);
        }
    },

    /**
     * Log info messages only in development mode
     */
    info: (...args: unknown[]) => {
        if (isDev) {
            console.info(...args);
        }
    },

    /**
     * Log warnings only in development mode
     */
    warn: (...args: unknown[]) => {
        if (isDev) {
            console.warn(...args);
        }
    },

    /**
     * Always log errors (important for debugging in production)
     */
    error: (...args: unknown[]) => {
        console.error(...args);
    },
};

export default logger;
