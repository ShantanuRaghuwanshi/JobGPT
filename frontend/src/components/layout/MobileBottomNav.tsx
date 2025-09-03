import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Kanban, User } from 'lucide-react';

const MobileBottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const navigationItems = [
        {
            name: 'Dashboard',
            path: '/dashboard',
            icon: Home
        },
        {
            name: 'Jobs',
            path: '/jobs',
            icon: Search
        },
        {
            name: 'Pipeline',
            path: '/pipeline',
            icon: Kanban
        },
        {
            name: 'Profile',
            path: '/profile',
            icon: User
        },
    ];

    const isActive = (path: string) => {
        return location.pathname === path;
    };

    return (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-800/90 backdrop-blur-sm border-t border-dark-700/50 shadow-dark">
            <div className="grid grid-cols-4 py-2">
                {navigationItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`flex flex-col items-center justify-center py-3 px-1 text-xs font-medium transition-all rounded-lg mx-1 ${isActive(item.path)
                                ? 'text-accent-blue bg-accent-blue/20 border border-accent-blue/30 shadow-glow-sm'
                                : 'text-dark-300 hover:text-white hover:bg-dark-700/50'
                                }`}
                        >
                            <Icon className={`h-5 w-5 mb-1 transition-colors ${isActive(item.path) ? 'text-accent-blue' : 'text-dark-400'
                                }`} />
                            <span className="truncate">{item.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileBottomNav;