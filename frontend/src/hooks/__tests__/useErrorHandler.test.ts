import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import { useErrorHandler, withErrorHandler } from '../useErrorHandler';

describe('useErrorHandler', () => {
    it('should initialize with no error', () => {
        const { result } = renderHook(() => useErrorHandler());

        expect(result.current.error).toBeNull();
        expect(result.current.isError).toBe(false);
    });

    it('should handle API errors with structured error response', () => {
        const { result } = renderHook(() => useErrorHandler());

        const apiError = {
            response: {
                data: {
                    error: {
                        code: 'VALIDATION_ERROR',
                        message: 'Invalid input',
                        timestamp: '2023-01-01T00:00:00Z'
                    }
                }
            }
        };

        act(() => {
            result.current.handleError(apiError);
        });

        expect(result.current.error).toEqual({
            code: 'VALIDATION_ERROR',
            message: 'Invalid input',
            timestamp: '2023-01-01T00:00:00Z'
        });
        expect(result.current.isError).toBe(true);
    });

    it('should handle generic errors with message', () => {
        const { result } = renderHook(() => useErrorHandler());

        const genericError = new Error('Something went wrong');

        act(() => {
            result.current.handleError(genericError);
        });

        expect(result.current.error).toEqual({
            code: 'UNKNOWN_ERROR',
            message: 'Something went wrong',
            timestamp: expect.any(String)
        });
        expect(result.current.isError).toBe(true);
    });

    it('should handle errors without message', () => {
        const { result } = renderHook(() => useErrorHandler());

        const unknownError = {};

        act(() => {
            result.current.handleError(unknownError);
        });

        expect(result.current.error).toEqual({
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred',
            timestamp: expect.any(String)
        });
        expect(result.current.isError).toBe(true);
    });

    it('should clear error state', () => {
        const { result } = renderHook(() => useErrorHandler());

        // First set an error
        act(() => {
            result.current.handleError(new Error('Test error'));
        });

        expect(result.current.isError).toBe(true);

        // Then clear it
        act(() => {
            result.current.clearError();
        });

        expect(result.current.error).toBeNull();
        expect(result.current.isError).toBe(false);
    });

    it('should return user-friendly error messages', () => {
        const { result } = renderHook(() => useErrorHandler());

        const testCases = [
            {
                error: { code: 'VALIDATION_ERROR', message: 'Invalid input', timestamp: '' },
                expected: 'Please check your input and try again.'
            },
            {
                error: { code: 'AUTHENTICATION_ERROR', message: 'Invalid credentials', timestamp: '' },
                expected: 'Please log in to continue.'
            },
            {
                error: { code: 'NOT_FOUND', message: 'Resource not found', timestamp: '' },
                expected: 'The requested resource was not found.'
            },
            {
                error: { code: 'UNKNOWN_CODE', message: 'Custom message', timestamp: '' },
                expected: 'Custom message'
            }
        ];

        testCases.forEach(({ error, expected }) => {
            const message = result.current.getErrorMessage(error);
            expect(message).toBe(expected);
        });
    });
});

describe('withErrorHandler', () => {
    it('should call function and return result on success', async () => {
        const mockFn = vi.fn().mockResolvedValue('success');
        const mockErrorHandler = vi.fn();

        const wrappedFn = withErrorHandler(mockFn, mockErrorHandler);
        const result = await wrappedFn('arg1', 'arg2');

        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
        expect(result).toBe('success');
        expect(mockErrorHandler).not.toHaveBeenCalled();
    });

    it('should call error handler and return undefined on error', async () => {
        const error = new Error('Test error');
        const mockFn = vi.fn().mockRejectedValue(error);
        const mockErrorHandler = vi.fn();

        const wrappedFn = withErrorHandler(mockFn, mockErrorHandler);
        const result = await wrappedFn('arg1', 'arg2');

        expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
        expect(result).toBeUndefined();
        expect(mockErrorHandler).toHaveBeenCalledWith(error);
    });
});