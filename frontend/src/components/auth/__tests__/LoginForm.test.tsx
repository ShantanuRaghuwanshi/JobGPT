import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { LoginForm } from '../LoginForm';
import { AuthProvider } from '../../../contexts/AuthContext';
import { authApi } from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
    authApi: {
        login: vi.fn(),
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

function renderWithAuth(component: React.ReactElement) {
    return render(
        <AuthProvider>
            {component}
        </AuthProvider>
    );
}

describe('LoginForm', () => {
    const mockOnSuccess = vi.fn();
    const mockOnSwitchToRegister = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.getItem.mockReturnValue(null);
    });

    it('should render login form', () => {
        renderWithAuth(
            <LoginForm
                onSuccess={mockOnSuccess}
                onSwitchToRegister={mockOnSwitchToRegister}
            />
        );

        expect(screen.getByText('Sign In')).toBeInTheDocument();
        expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
        expect(screen.getByLabelText('Password')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
        expect(screen.getByText('Sign up here')).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
        const user = userEvent.setup();

        renderWithAuth(
            <LoginForm
                onSuccess={mockOnSuccess}
                onSwitchToRegister={mockOnSwitchToRegister}
            />
        );

        const submitButton = screen.getByRole('button', { name: 'Sign In' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Email is required')).toBeInTheDocument();
            expect(screen.getByText('Password is required')).toBeInTheDocument();
        });
    });

    it('should validate email format', async () => {
        const user = userEvent.setup();

        renderWithAuth(
            <LoginForm
                onSuccess={mockOnSuccess}
                onSwitchToRegister={mockOnSwitchToRegister}
            />
        );

        const emailInput = screen.getByLabelText('Email Address');
        await user.type(emailInput, 'invalid-email');

        const submitButton = screen.getByRole('button', { name: 'Sign In' });
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
        });
    });

    it('should handle successful login', async () => {
        const user = userEvent.setup();
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

        renderWithAuth(
            <LoginForm
                onSuccess={mockOnSuccess}
                onSwitchToRegister={mockOnSwitchToRegister}
            />
        );

        const emailInput = screen.getByLabelText('Email Address');
        const passwordInput = screen.getByLabelText('Password');
        const submitButton = screen.getByRole('button', { name: 'Sign In' });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'password123');
        await user.click(submitButton);

        await waitFor(() => {
            expect(authApi.login).toHaveBeenCalledWith({
                email: 'test@example.com',
                password: 'password123',
            });
        });

        expect(mockOnSuccess).toHaveBeenCalled();
    });

    it('should handle login error', async () => {
        const user = userEvent.setup();
        const mockError = {
            response: {
                data: {
                    error: {
                        message: 'Invalid email or password',
                    },
                },
            },
        };

        (authApi.login as any).mockRejectedValue(mockError);

        renderWithAuth(
            <LoginForm
                onSuccess={mockOnSuccess}
                onSwitchToRegister={mockOnSwitchToRegister}
            />
        );

        const emailInput = screen.getByLabelText('Email Address');
        const passwordInput = screen.getByLabelText('Password');
        const submitButton = screen.getByRole('button', { name: 'Sign In' });

        await user.type(emailInput, 'test@example.com');
        await user.type(passwordInput, 'wrongpassword');
        await user.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
        });

        expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should toggle password visibility', async () => {
        const user = userEvent.setup();

        renderWithAuth(
            <LoginForm
                onSuccess={mockOnSuccess}
                onSwitchToRegister={mockOnSwitchToRegister}
            />
        );

        const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
        const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button

        expect(passwordInput.type).toBe('password');

        await user.click(toggleButton);
        expect(passwordInput.type).toBe('text');

        await user.click(toggleButton);
        expect(passwordInput.type).toBe('password');
    });

    it('should call onSwitchToRegister when sign up link is clicked', async () => {
        const user = userEvent.setup();

        renderWithAuth(
            <LoginForm
                onSuccess={mockOnSuccess}
                onSwitchToRegister={mockOnSwitchToRegister}
            />
        );

        const signUpLink = screen.getByText('Sign up here');
        await user.click(signUpLink);

        expect(mockOnSwitchToRegister).toHaveBeenCalled();
    });
});