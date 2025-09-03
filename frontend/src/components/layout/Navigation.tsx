import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Search, User, Settings } from 'lucide-react';

const Navigation: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user } = useAuth();

    return (
        <nav className="fixed top-0 left-0 right-0 z-40 bg-dark-800/80 backdrop-blur-sm shadow-dark border-b border-dark-700/50 lg:left-64">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    {/* Left side - Logo and breadcrumb */}
                    <div className="flex items-center">
                        <div className="lg:hidden w-12">
                            {/* Space for mobile menu button - handled by Sidebar */}
                        </div>

                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="text-xl font-bold text-white hover:text-accent-blue transition-colors lg:block hidden"
                            >
                                JobGPT
                            </button>
                            <span className="mx-2 text-dark-400 lg:block hidden">/</span>
                            <span className="text-dark-300 capitalize">
                                {location.pathname.replace('/', '') || 'dashboard'}
                            </span>
                        </div>
                    </div>

                    {/* Center - Search (on larger screens) */}
                    <div className="hidden md:flex flex-1 max-w-lg mx-8">
                        <div className="relative w-full">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-dark-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search jobs, companies..."
                                className="block w-full pl-10 pr-3 py-2 border border-dark-600/50 rounded-lg leading-5 bg-dark-700/50 placeholder-dark-400 text-white focus:outline-none focus:placeholder-dark-300 focus:ring-2 focus:ring-accent-blue focus:border-accent-blue text-sm backdrop-blur-sm"
                            />
                        </div>
                    </div>

                    {/* Right side - Actions and user menu */}
                    <div className="flex items-center space-x-4">
                        {/* Notifications */}
                        <button className="p-2 text-dark-300 hover:text-white hover:bg-dark-700/50 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg transition-all">
                            <Bell className="h-5 w-5" />
                        </button>

                        {/* Settings */}
                        <button
                            onClick={() => navigate('/profile')}
                            className="p-2 text-dark-300 hover:text-white hover:bg-dark-700/50 focus:outline-none focus:ring-2 focus:ring-accent-blue rounded-lg transition-all"
                        >
                            <Settings className="h-5 w-5" />
                        </button>

                        {/* User avatar */}
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/profile')}
                                className="flex items-center text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue hover:bg-dark-700/50 p-2 transition-all"
                            >
                                <div className="h-8 w-8 bg-gradient-to-r from-accent-blue to-primary-600 rounded-full flex items-center justify-center shadow-glow-sm">
                                    <User className="h-4 w-4 text-white" />
                                </div>
                                <span className="ml-2 text-white hidden sm:block">
                                    {user?.email?.split('@')[0] || 'User'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navigation;