import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from '../AuthContext';
import { authApi } from '../../services/api';

// Mock the API
vi.mock('../../services/api', () => ({
    authApi: {
        login: vi.fn(),
        register: vi.fn(),
        verifyToken: vi.fn(),
        getCurrentUser: vi.fn(),
    },
}));

// Mock localStorage
const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Test component that uses the auth context
function TestComponent() {
    const { user, isAuthenticated, isLoading, login, logout } = useAuth();

    return (
        <div>
            <div data-testid="loading">{isLoading ? 'loading' : 'not-loading'}</div>
            <div data-testid="authenticated">{isAuthenticated ? 'authenticated' : 'not-authenticated'}</div>
            <div data-testid="user">{user ? user.email : 'no-user'}</div>
            <button onClick={() => login('test@example.com', 'password')}>Login</button>
            <button onClick={logout}>Logout</button>
        </div>
    );
}

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('should provide initial auth state', async () => {
        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Initially should be loading
        expect(screen.getByTestId('loading')).toHaveTextContent('loading');

        // Wait for loading to complete
        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
    });

    it('should handle successful login', async () => {
        const mockLoginResponse = {
            data: {
                success: true,
                data: {
                    token: 'mock-token',
                    user: {
                        id: '1',
                        email: 'test@example.com',
                    },
                },
            },
        };

        (authApi.login as any).mockResolvedValue(mockLoginResponse);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Wait for initial loading to complete
        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        // Click login button
        const loginButton = screen.getByText('Login');
        loginButton.click();

        // Wait for login to complete
        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'mock-token');
    });

    it('should handle logout', async () => {
        const mockLoginResponse = {
            data: {
                success: true,
                data: {
                    token: 'mock-token',
                    user: {
                        id: '1',
                        email: 'test@example.com',
                    },
                },
            },
        };

        (authApi.login as any).mockResolvedValue(mockLoginResponse);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Wait for initial loading to complete
        await waitFor(() => {
            expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
        });

        // Login first
        const loginButton = screen.getByText('Login');
        loginButton.click();

        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        });

        // Now logout
        const logoutButton = screen.getByText('Logout');
        logoutButton.click();

        expect(screen.getByTestId('authenticated')).toHaveTextContent('not-authenticated');
        expect(screen.getByTestId('user')).toHaveTextContent('no-user');
        expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token');
    });

    it('should initialize with existing token', async () => {
        const mockToken = 'existing-token';
        const mockVerifyResponse = {
            data: {
                success: true,
                data: {
                    user: { id: '1', email: 'test@example.com' },
                    valid: true,
                },
            },
        };
        const mockUserResponse = {
            data: {
                data: {
                    id: '1',
                    email: 'test@example.com',
                    createdAt: '2023-01-01',
                    updatedAt: '2023-01-01',
                },
            },
        };

        localStorageMock.getItem.mockReturnValue(mockToken);
        (authApi.verifyToken as any).mockResolvedValue(mockVerifyResponse);
        (authApi.getCurrentUser as any).mockResolvedValue(mockUserResponse);

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        // Should start loading
        expect(screen.getByTestId('loading')).toHaveTextContent('loading');

        // Wait for auth initialization to complete
        await waitFor(() => {
            expect(screen.getByTestId('authenticated')).toHaveTextContent('authenticated');
        });

        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
        expect(screen.getByTestId('loading')).toHaveTextContent('not-loading');
    });
});