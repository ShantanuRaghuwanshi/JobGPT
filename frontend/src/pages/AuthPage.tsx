import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/auth/LoginForm';
import { RegisterForm } from '../components/auth/RegisterForm';

type AuthMode = 'login' | 'register';

export function AuthPage() {
    const [mode, setMode] = useState<AuthMode>('login');
    const navigate = useNavigate();
    const location = useLocation();

    // Get the intended destination from location state, default to dashboard
    const from = location.state?.from?.pathname || '/dashboard';

    const handleAuthSuccess = () => {
        navigate(from, { replace: true });
    };

    const switchToRegister = () => setMode('register');
    const switchToLogin = () => setMode('login');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                {mode === 'login' ? (
                    <LoginForm
                        onSuccess={handleAuthSuccess}
                        onSwitchToRegister={switchToRegister}
                    />
                ) : (
                    <RegisterForm
                        onSuccess={handleAuthSuccess}
                        onSwitchToLogin={switchToLogin}
                    />
                )}
            </div>
        </div>
    );
}