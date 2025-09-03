import React from 'react';

interface QuickActionsProps {
    onRefreshRecommendations: () => void;
    refreshing: boolean;
}

const QuickActions: React.FC<QuickActionsProps> = ({
    onRefreshRecommendations,
    refreshing
}) => {
    const actions = [
        {
            title: 'Browse Jobs',
            description: 'Discover new opportunities',
            icon: '🔍',
            href: '/jobs',
            color: 'bg-gradient-to-br from-accent-blue to-primary-600 hover:from-accent-blue/80 hover:to-primary-700'
        },
        {
            title: 'View Pipeline',
            description: 'Manage your applications',
            icon: '📋',
            href: '/pipeline',
            color: 'bg-gradient-to-br from-accent-green to-success-600 hover:from-accent-green/80 hover:to-success-700'
        },
        {
            title: 'Update Profile',
            description: 'Improve your matches',
            icon: '👤',
            href: '/profile',
            color: 'bg-gradient-to-br from-accent-purple to-accent-indigo hover:from-accent-purple/80 hover:to-accent-indigo/80'
        },
        {
            title: 'View Applications',
            description: 'Track your progress',
            icon: '📊',
            href: '/applications',
            color: 'bg-gradient-to-br from-accent-orange to-warning-600 hover:from-accent-orange/80 hover:to-warning-700'
        }
    ];

    return (
        <div className="bg-gradient-card rounded-xl shadow-dark border border-dark-700/50">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Quick Actions</h2>

                <div className="space-y-3">
                    {actions.map((action, index) => (
                        <a
                            key={index}
                            href={action.href}
                            className="flex items-center p-4 rounded-xl border border-dark-700/30 hover:border-dark-600/50 hover:shadow-dark transition-all group bg-dark-800/20 hover:bg-dark-800/40"
                        >
                            <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-white text-lg mr-4 group-hover:scale-105 transition-transform shadow-glow-sm`}>
                                {action.icon}
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-white group-hover:text-dark-200">
                                    {action.title}
                                </h3>
                                <p className="text-xs text-dark-400">
                                    {action.description}
                                </p>
                            </div>
                            <div className="text-dark-500 group-hover:text-dark-300">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </div>
                        </a>
                    ))}
                </div>

                {/* Special Actions */}
                <div className="mt-6 pt-6 border-t border-dark-700/50 space-y-3">
                    <button
                        onClick={onRefreshRecommendations}
                        disabled={refreshing}
                        className="w-full flex items-center justify-center p-3 border border-accent-blue/30 rounded-xl text-accent-blue hover:bg-accent-blue/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-accent-blue/5 hover:border-accent-blue/50"
                    >
                        <span className="mr-2">🔄</span>
                        {refreshing ? 'Refreshing Recommendations...' : 'Refresh Job Recommendations'}
                    </button>

                    <button
                        onClick={() => {
                            // Trigger job crawling/refresh
                            window.location.href = '/jobs?refresh=true';
                        }}
                        className="w-full flex items-center justify-center p-3 border border-accent-green/30 rounded-xl text-accent-green hover:bg-accent-green/10 transition-all bg-accent-green/5 hover:border-accent-green/50"
                    >
                        <span className="mr-2">🌐</span>
                        Find New Jobs
                    </button>
                </div>

                {/* Help Section */}
                <div className="mt-6 pt-6 border-t border-dark-700/50">
                    <h3 className="text-sm font-medium text-dark-300 mb-3">Need Help?</h3>
                    <div className="space-y-2">
                        <a
                            href="/help/getting-started"
                            className="flex items-center text-sm text-dark-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-dark-800/30"
                        >
                            <span className="mr-2">📚</span>
                            Getting Started Guide
                        </a>
                        <a
                            href="/help/best-practices"
                            className="flex items-center text-sm text-dark-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-dark-800/30"
                        >
                            <span className="mr-2">💡</span>
                            Application Best Practices
                        </a>
                        <a
                            href="/help/troubleshooting"
                            className="flex items-center text-sm text-dark-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-dark-800/30"
                        >
                            <span className="mr-2">🔧</span>
                            Troubleshooting
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default QuickActions;