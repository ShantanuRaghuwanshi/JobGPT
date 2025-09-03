import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';

export interface User {
    id: string;
    email: string;
    createdAt: string;
    updatedAt: string;
}

export interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

type AuthAction =
    | { type: 'AUTH_START' }
    | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string } }
    | { type: 'AUTH_FAILURE' }
    | { type: 'LOGOUT' }
    | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
    user: null,
    token: localStorage.getItem('auth_token'),
    isLoading: true,
    isAuthenticated: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'AUTH_START':
            return {
                ...state,
                isLoading: true,
            };
        case 'AUTH_SUCCESS':
            return {
                ...state,
                user: action.payload.user,
                token: action.payload.token,
                isLoading: false,
                isAuthenticated: true,
            };
        case 'AUTH_FAILURE':
            return {
                ...state,
                user: null,
                token: null,
                isLoading: false,
                isAuthenticated: false,
            };
        case 'LOGOUT':
            return {
                ...state,
                user: null,
                token: null,
                isLoading: false,
                isAuthenticated: false,
            };
        case 'SET_LOADING':
            return {
                ...state,
                isLoading: action.payload,
            };
        default:
            return state;
    }
}

interface AuthContextType extends AuthState {
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name: string, location: string) => Promise<void>;
    logout: () => void;
    refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Initialize auth state on mount
    useEffect(() => {
        const initializeAuth = async () => {
            const token = localStorage.getItem('auth_token');

            if (token) {
                try {
                    dispatch({ type: 'AUTH_START' });
                    const response = await authApi.verifyToken();

                    if (response.data.success) {
                        // Get user data
                        const userResponse = await authApi.getCurrentUser();
                        dispatch({
                            type: 'AUTH_SUCCESS',
                            payload: {
                                user: userResponse.data.data,
                                token,
                            },
                        });
                    } else {
                        throw new Error('Token verification failed');
                    }
                } catch (error) {
                    console.error('Auth initialization failed:', error);
                    localStorage.removeItem('auth_token');
                    dispatch({ type: 'AUTH_FAILURE' });
                }
            } else {
                dispatch({ type: 'SET_LOADING', payload: false });
            }
        };

        initializeAuth();
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        try {
            dispatch({ type: 'AUTH_START' });
            const response = await authApi.login({ email, password });

            const { token, user } = response.data.data;

            // Store token in localStorage
            localStorage.setItem('auth_token', token);

            dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, token },
            });
        } catch (error) {
            dispatch({ type: 'AUTH_FAILURE' });
            throw error;
        }
    };

    const register = async (
        email: string,
        password: string,
        name: string,
        location: string
    ): Promise<void> => {
        try {
            dispatch({ type: 'AUTH_START' });
            const response = await authApi.register({
                email,
                password,
                name,
                location,
            });

            const { token, user } = response.data.data;

            // Store token in localStorage
            localStorage.setItem('auth_token', token);

            dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, token },
            });
        } catch (error) {
            dispatch({ type: 'AUTH_FAILURE' });
            throw error;
        }
    };

    const logout = (): void => {
        localStorage.removeItem('auth_token');
        dispatch({ type: 'LOGOUT' });
    };

    const refreshToken = async (): Promise<void> => {
        try {
            const response = await authApi.verifyToken();

            if (response.data.success) {
                // Get updated user data
                const userResponse = await authApi.getCurrentUser();
                dispatch({
                    type: 'AUTH_SUCCESS',
                    payload: {
                        user: userResponse.data.data,
                        token: state.token!,
                    },
                });
            } else {
                throw new Error('Token refresh failed');
            }
        } catch (error) {
            console.error('Token refresh failed:', error);
            logout();
            throw error;
        }
    };

    const value: AuthContextType = {
        ...state,
        login,
        register,
        logout,
        refreshToken,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextType {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}