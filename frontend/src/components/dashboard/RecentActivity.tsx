import React from 'react';
import { DashboardActivity } from '../../services/api';

interface RecentActivityProps {
    activities: DashboardActivity[];
    onRefresh: () => void;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ activities, onRefresh }) => {
    const getActivityIcon = (type: DashboardActivity['type']) => {
        switch (type) {
            case 'application':
                return '📝';
            case 'status_update':
                return '🔄';
            case 'job_match':
                return '🎯';
            default:
                return '📋';
        }
    };

    const getActivityColor = (type: DashboardActivity['type']) => {
        switch (type) {
            case 'application':
                return 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30';
            case 'status_update':
                return 'bg-accent-green/20 text-accent-green border border-accent-green/30';
            case 'job_match':
                return 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30';
            default:
                return 'bg-dark-700/50 text-dark-300 border border-dark-600/50';
        }
    };

    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString();
        }
    };

    return (
        <div className="bg-gradient-card rounded-xl shadow-dark border border-dark-700/50">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
                    <button
                        onClick={onRefresh}
                        className="text-sm text-accent-blue hover:text-accent-blue/80 font-medium transition-colors"
                    >
                        Refresh
                    </button>
                </div>

                {activities.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-dark-500 text-4xl mb-4">📋</div>
                        <p className="text-dark-400">No recent activity</p>
                        <p className="text-sm text-dark-500 mt-1">
                            Start applying to jobs to see your activity here
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activities.map((activity, index) => (
                            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50">
                                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${getActivityColor(activity.type)}`}>
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-gray-900">{activity.description}</p>
                                    <div className="flex items-center mt-1 space-x-2">
                                        <p className="text-xs text-gray-500">
                                            {formatTimestamp(activity.timestamp)}
                                        </p>
                                        {activity.jobTitle && activity.company && (
                                            <>
                                                <span className="text-xs text-gray-300">•</span>
                                                <p className="text-xs text-gray-500">
                                                    {activity.jobTitle} at {activity.company}
                                                </p>
                                            </>
                                        )}
                                        {activity.status && (
                                            <>
                                                <span className="text-xs text-gray-300">•</span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${activity.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                                                    activity.status === 'interview' ? 'bg-yellow-100 text-yellow-800' :
                                                        activity.status === 'offered' ? 'bg-green-100 text-green-800' :
                                                            activity.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                                                'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {activity.status}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activities.length > 0 && (
                    <div className="mt-6 text-center">
                        <a
                            href="/applications"
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                            View all applications →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecentActivity;