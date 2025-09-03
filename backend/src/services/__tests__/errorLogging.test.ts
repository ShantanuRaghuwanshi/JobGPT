import { ErrorLoggingService } from '../errorLogging';
import { logger } from '../../config/logger';

// Mock the logger
jest.mock('../../config/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

describe('ErrorLoggingService', () => {
    let service: ErrorLoggingService;
    const mockLogger = logger as jest.Mocked<typeof logger>;

    beforeEach(() => {
        service = ErrorLoggingService.getInstance();
        jest.clearAllMocks();
        // Clear the error buffer
        (service as any).errorBuffer = [];
    });

    describe('getInstance', () => {
        it('should return singleton instance', () => {
            const instance1 = ErrorLoggingService.getInstance();
            const instance2 = ErrorLoggingService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });

    describe('logError', () => {
        it('should log error with all details', () => {
            const error = new Error('Test error');
            const context = {
                userId: 'user-123',
                action: 'test-action',
                metadata: { key: 'value' }
            };

            service.logError(error, context);

            expect(mockLogger.error).toHaveBeenCalledWith('Application Error', {
                message: 'Test error',
                stack: error.stack,
                context,
                timestamp: expect.any(String)
            });
        });

        it('should log error without context', () => {
            const error = new Error('Test error');

            service.logError(error);

            expect(mockLogger.error).toHaveBeenCalledWith('Application Error', {
                message: 'Test error',
                stack: error.stack,
                context: undefined,
                timestamp: expect.any(String)
            });
        });

        it('should add error to buffer', () => {
            const error = new Error('Test error');
            const context = { userId: 'user-123' };

            service.logError(error, context);

            const buffer = (service as any).errorBuffer;
            expect(buffer).toHaveLength(1);
            expect(buffer[0]).toMatchObject({
                message: 'Test error',
                context,
                timestamp: expect.any(String)
            });
        });

        it('should limit buffer size to 100 entries', () => {
            // Fill buffer with 101 errors
            for (let i = 0; i < 101; i++) {
                service.logError(new Error(`Error ${i}`));
            }

            const buffer = (service as any).errorBuffer;
            expect(buffer).toHaveLength(100);
            expect(buffer[0].message).toBe('Error 1'); // First error should be removed
            expect(buffer[99].message).toBe('Error 100'); // Last error should be present
        });
    });

    describe('getRecentErrors', () => {
        it('should return recent errors within time limit', () => {
            const now = Date.now();
            const recentError = new Error('Recent error');
            const oldError = new Error('Old error');

            // Mock Date.now to control timestamps
            const originalNow = Date.now;
            Date.now = jest.fn().mockReturnValue(now);

            service.logError(recentError);

            // Set time to 2 hours ago for old error
            Date.now = jest.fn().mockReturnValue(now - 2 * 60 * 60 * 1000);
            service.logError(oldError);

            // Reset to current time
            Date.now = jest.fn().mockReturnValue(now);

            const recentErrors = service.getRecentErrors(60); // Last 60 minutes

            expect(recentErrors).toHaveLength(1);
            expect(recentErrors[0].message).toBe('Recent error');

            // Restore original Date.now
            Date.now = originalNow;
        });

        it('should return empty array when no recent errors', () => {
            const recentErrors = service.getRecentErrors(60);
            expect(recentErrors).toEqual([]);
        });
    });

    describe('clearErrorBuffer', () => {
        it('should clear all errors from buffer', () => {
            service.logError(new Error('Error 1'));
            service.logError(new Error('Error 2'));

            expect((service as any).errorBuffer).toHaveLength(2);

            service.clearErrorBuffer();

            expect((service as any).errorBuffer).toHaveLength(0);
        });
    });
});