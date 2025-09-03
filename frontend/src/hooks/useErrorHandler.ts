import { useState, useCallback } from 'react';

export interface ApiError {
    code: string;
    message: string;
    timestamp: string;
    details?: any;
}

export interface ErrorState {
    error: ApiError | null;
    isError: boolean;
}

export const useErrorHandler = () => {
    const [errorState, setErrorState] = useState<ErrorState>({
        error: null,
        isError: false
    });

    const handleError = useCallback((error: any) => {
        console.error('API Error:', error);

        let apiError: ApiError;

        if (error.response?.data?.error) {
            // Structured API error
            apiError = error.response.data.error;
        } else if (error.message) {
            // Generic error with message
            apiError = {
                code: 'UNKNOWN_ERROR',
                message: error.message,
                timestamp: new Date().toISOString()
            };
        } else {
            // Fallback error
            apiError = {
                code: 'UNKNOWN_ERROR',
                message: 'An unexpected error occurred',
                timestamp: new Date().toISOString()
            };
        }

        setErrorState({
            error: apiError,
            isError: true
        });

        // Log error for monitoring
        logError(apiError, error);
    }, []);

    const clearError = useCallback(() => {
        setErrorState({
            error: null,
            isError: false
        });
    }, []);

    const logError = (apiError: ApiError, originalError: any) => {
        const errorData = {
            ...apiError,
            originalError: originalError?.toString(),
            stack: originalError?.stack,
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
        };

        // In production, send to monitoring service
        if (process.env.NODE_ENV === 'production') {
            // Example: Send to error tracking service
            // fetch('/api/client-errors', {
            //   method: 'POST',
            //   headers: { 'Content-Type': 'application/json' },
            //   body: JSON.stringify(errorData)
            // }).catch(console.error);
        }

        console.error('Error logged:', errorData);
    };

    const getErrorMessage = (error: ApiError): string => {
        // Map common error codes to user-friendly messages
        const errorMessages: Record<string, string> = {
            'VALIDATION_ERROR': 'Please check your input and try again.',
            'AUTHENTICATION_ERROR': 'Please log in to continue.',
            'AUTHORIZATION_ERROR': 'You don\'t have permission to perform this action.',
            'NOT_FOUND': 'The requested resource was not found.',
            'EXTERNAL_SERVICE_ERROR': 'External service is temporarily unavailable. Please try again later.',
            'DATABASE_ERROR': 'Database error occurred. Please try again later.',
            'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
            'TIMEOUT_ERROR': 'Request timed out. Please try again.',
            'RATE_LIMIT_ERROR': 'Too many requests. Please wait a moment and try again.'
        };

        return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
    };

    return {
        ...errorState,
        handleError,
        clearError,
        getErrorMessage: (error: ApiError) => getErrorMessage(error)
    };
};

// Utility function to handle async operations with error handling
export const withErrorHandler = <T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    errorHandler: (error: any) => void
) => {
    return async (...args: T): Promise<R | undefined> => {
        try {
            return await fn(...args);
        } catch (error) {
            errorHandler(error);
            return undefined;
        }
    };
};