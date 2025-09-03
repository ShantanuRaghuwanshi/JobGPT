import { logger } from '../config/logger';

export interface ErrorLogEntry {
    id: string;
    timestamp: string;
    level: 'error' | 'warn' | 'info';
    message: string;
    stack?: string;
    context?: {
        userId?: string;
        url?: string;
        method?: string;
        ip?: string;
        userAgent?: string;
        requestId?: string;
    };
    metadata?: Record<string, any>;
}

export class ErrorLoggingService {
    private static instance: ErrorLoggingService;
    private errorBuffer: ErrorLogEntry[] = [];
    private maxBufferSize = 1000;

    private constructor() { }

    public static getInstance(): ErrorLoggingService {
        if (!ErrorLoggingService.instance) {
            ErrorLoggingService.instance = new ErrorLoggingService();
        }
        return ErrorLoggingService.instance;
    }

    public logError(error: Error, context?: ErrorLogEntry['context'], metadata?: Record<string, any>): void {
        const errorEntry: ErrorLogEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            level: 'error',
            message: error.message,
            stack: error.stack,
            context,
            metadata
        };

        // Log to winston logger
        logger.error('Application error', errorEntry);

        // Add to buffer for potential batch processing
        this.addToBuffer(errorEntry);

        // In production, you might want to send to external monitoring service
        if (process.env.NODE_ENV === 'production') {
            this.sendToMonitoringService(errorEntry);
        }
    }

    public logWarning(message: string, context?: ErrorLogEntry['context'], metadata?: Record<string, any>): void {
        const warningEntry: ErrorLogEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            level: 'warn',
            message,
            context,
            metadata
        };

        logger.warn('Application warning', warningEntry);
        this.addToBuffer(warningEntry);
    }

    public logInfo(message: string, context?: ErrorLogEntry['context'], metadata?: Record<string, any>): void {
        const infoEntry: ErrorLogEntry = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            level: 'info',
            message,
            context,
            metadata
        };

        logger.info('Application info', infoEntry);
        this.addToBuffer(infoEntry);
    }

    public getRecentErrors(limit: number = 50): ErrorLogEntry[] {
        return this.errorBuffer
            .filter(entry => entry.level === 'error')
            .slice(-limit)
            .reverse();
    }

    public getErrorStats(): {
        totalErrors: number;
        errorsLast24h: number;
        errorsLastHour: number;
        topErrorMessages: Array<{ message: string; count: number }>;
    } {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

        const errors = this.errorBuffer.filter(entry => entry.level === 'error');
        const errorsLast24h = errors.filter(entry => new Date(entry.timestamp) > last24h);
        const errorsLastHour = errors.filter(entry => new Date(entry.timestamp) > lastHour);

        // Count error messages
        const messageCounts = new Map<string, number>();
        errors.forEach(error => {
            const count = messageCounts.get(error.message) || 0;
            messageCounts.set(error.message, count + 1);
        });

        const topErrorMessages = Array.from(messageCounts.entries())
            .map(([message, count]) => ({ message, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);

        return {
            totalErrors: errors.length,
            errorsLast24h: errorsLast24h.length,
            errorsLastHour: errorsLastHour.length,
            topErrorMessages
        };
    }

    private addToBuffer(entry: ErrorLogEntry): void {
        this.errorBuffer.push(entry);

        // Keep buffer size manageable
        if (this.errorBuffer.length > this.maxBufferSize) {
            this.errorBuffer = this.errorBuffer.slice(-this.maxBufferSize);
        }
    }

    private generateId(): string {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    private async sendToMonitoringService(errorEntry: ErrorLogEntry): Promise<void> {
        try {
            // Example: Send to external monitoring service like Sentry, DataDog, etc.
            // await fetch('https://monitoring-service.com/api/errors', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(errorEntry)
            // });

            // For now, just log that we would send it
            logger.debug('Would send error to monitoring service', { errorId: errorEntry.id });
        } catch (error) {
            // Don't let monitoring errors crash the application
            logger.error('Failed to send error to monitoring service', { error: error.message });
        }
    }

    // Method to clear old logs (could be called by a cron job)
    public clearOldLogs(olderThanDays: number = 30): void {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const initialLength = this.errorBuffer.length;
        this.errorBuffer = this.errorBuffer.filter(
            entry => new Date(entry.timestamp) > cutoffDate
        );

        const removedCount = initialLength - this.errorBuffer.length;
        if (removedCount > 0) {
            logger.info(`Cleared ${removedCount} old log entries`);
        }
    }
}

// Export singleton instance
export const errorLogger = ErrorLoggingService.getInstance();