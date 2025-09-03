import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    Home,
    Search,
    Kanban,
    User,
    LogOut,
    Menu,
    X
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onToggle }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const navigationItems = [
        {
            name: 'Dashboard',
            path: '/dashboard',
            icon: Home,
            description: 'Overview and stats'
        },
        {
            name: 'Job Discovery',
            path: '/jobs',
            icon: Search,
            description: 'Find new opportunities'
        },
        {
            name: 'Pipeline',
            path: '/pipeline',
            icon: Kanban,
            description: 'Manage applications'
        },
        {
            name: 'Profile',
            path: '/profile',
            icon: User,
            description: 'Personal information'
        },
    ];

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <>
            {/* Mobile menu button */}
            <button
                onClick={onToggle}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white hover:text-accent-blue hover:bg-dark-700/50 focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all backdrop-blur-sm"
            >
                {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-40 bg-dark-900/75 backdrop-blur-sm"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <div className={`
                fixed left-0 top-0 bottom-0 z-30 w-64 bg-dark-900/95 backdrop-blur-md shadow-dark-lg border-r border-dark-700/30 transform transition-transform duration-300 ease-in-out
                lg:translate-x-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <div className="flex flex-col h-full">
                    {/* Logo - only show on mobile */}
                    <div className="lg:hidden flex items-center justify-center h-16 px-4 bg-dark-800/80 border-b border-dark-700/30">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-xl font-bold bg-gradient-to-r from-accent-blue to-primary-600 bg-clip-text text-transparent hover:from-blue-400 hover:to-primary-500 transition-all"
                        >
                            JobGPT
                        </button>
                    </div>

                    {/* Desktop spacing for navigation bar */}
                    <div className="hidden lg:block h-16"></div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-2">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        navigate(item.path);
                                        if (window.innerWidth < 1024) {
                                            onToggle();
                                        }
                                    }}
                                    className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all group ${isActive(item.path)
                                        ? 'bg-gradient-to-r from-accent-blue/15 to-primary-600/15 text-accent-blue border border-accent-blue/20 shadow-glow-sm'
                                        : 'text-dark-300 hover:bg-dark-800/60 hover:text-white border border-transparent'
                                        }`}
                                >
                                    <Icon className={`h-5 w-5 mr-3 flex-shrink-0 transition-colors ${isActive(item.path) ? 'text-accent-blue' : 'text-dark-400 group-hover:text-white'}`} />
                                    <div className="text-left">
                                        <div className="font-medium">{item.name}</div>
                                        <div className={`text-xs mt-0.5 transition-colors ${isActive(item.path) ? 'text-accent-blue/70' : 'text-dark-500 group-hover:text-dark-300'}`}>
                                            {item.description}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="border-t border-dark-700/30 p-4">
                        <div className="flex items-center mb-4">
                            <div className="flex-shrink-0">
                                <div className="h-8 w-8 bg-gradient-to-r from-accent-blue to-primary-600 rounded-full flex items-center justify-center shadow-glow-sm">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {user?.email || 'User'}
                                </p>
                                <p className="text-xs text-dark-400">
                                    Job Seeker
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center px-3 py-2 text-sm font-medium text-error-500 hover:bg-error-500/10 hover:text-error-400 border border-transparent rounded-lg transition-all"
                        >
                            <LogOut className="h-4 w-4 mr-3" />
                            Sign out
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;