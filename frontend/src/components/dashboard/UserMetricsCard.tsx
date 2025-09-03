import React from 'react';
import { UserMetrics } from '../../services/api';

interface UserMetricsCardProps {
    metrics: UserMetrics;
}

const UserMetricsCard: React.FC<UserMetricsCardProps> = ({ metrics }) => {
    // Provide default values for undefined metrics
    const safeMetrics = {
        profileCompleteness: metrics?.profileCompleteness || 0,
        responseRate: metrics?.responseRate || 0,
        applicationVelocity: metrics?.applicationVelocity || 0,
        averageTimeToInterview: metrics?.averageTimeToInterview || 0,
        topMatchingSkills: metrics?.topMatchingSkills || []
    };
    const getProgressColor = (percentage: number) => {
        if (percentage >= 80) return 'bg-gradient-to-r from-accent-green to-success-500';
        if (percentage >= 60) return 'bg-gradient-to-r from-warning-500 to-accent-orange';
        if (percentage >= 40) return 'bg-gradient-to-r from-accent-orange to-error-500';
        return 'bg-gradient-to-r from-error-500 to-accent-red';
    };

    const getProgressLabel = (percentage: number) => {
        if (percentage >= 80) return 'Excellent';
        if (percentage >= 60) return 'Good';
        if (percentage >= 40) return 'Fair';
        return 'Needs Improvement';
    };

    const formatVelocity = (velocity: number) => {
        if (velocity === 0) return '0 per week';
        if (velocity < 1) return `${velocity.toFixed(1)} per week`;
        return `${Math.round(velocity)} per week`;
    };

    const formatTimeToInterview = (days: number) => {
        if (days === 0) return 'No data';
        if (days < 1) return 'Less than 1 day';
        if (days === 1) return '1 day';
        return `${Math.round(days)} days`;
    };

    return (
        <div className="bg-gradient-card rounded-xl shadow-dark border border-dark-700/50 backdrop-blur-sm">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Your Performance</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Profile Completeness */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-dark-300">Profile Completeness</h3>
                            <span className="text-sm font-bold text-white bg-dark-700/50 px-2 py-1 rounded-lg">
                                {safeMetrics.profileCompleteness}%
                            </span>
                        </div>
                        <div className="w-full bg-dark-700/50 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(safeMetrics.profileCompleteness)} shadow-glow-sm`}
                                style={{ width: `${safeMetrics.profileCompleteness}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-dark-400">
                            {getProgressLabel(safeMetrics.profileCompleteness)} -
                            {safeMetrics.profileCompleteness < 100 ? ' Complete your profile for better matches' : ' Your profile is complete!'}
                        </p>
                    </div>

                    {/* Response Rate */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium text-dark-300">Response Rate</h3>
                            <span className="text-sm font-bold text-white bg-dark-700/50 px-2 py-1 rounded-lg">
                                {safeMetrics.responseRate}%
                            </span>
                        </div>
                        <div className="w-full bg-dark-700/50 rounded-full h-3 overflow-hidden">
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(safeMetrics.responseRate)} shadow-glow-sm`}
                                style={{ width: `${Math.min(safeMetrics.responseRate, 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-xs text-dark-400">
                            {getProgressLabel(safeMetrics.responseRate)} -
                            {safeMetrics.responseRate < 20 ? ' Consider improving your applications' :
                                safeMetrics.responseRate < 40 ? ' Good progress, keep applying' :
                                    ' Excellent response rate!'}
                        </p>
                    </div>
                </div>

                {/* Additional Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-dark-700/50">
                    <div className="space-y-2 p-4 bg-dark-800/30 rounded-xl border border-dark-700/30">
                        <h3 className="text-sm font-medium text-dark-300">Application Velocity</h3>
                        <p className="text-2xl font-bold text-white">
                            {formatVelocity(safeMetrics.applicationVelocity)}
                        </p>
                        <p className="text-xs text-dark-400">
                            {safeMetrics.applicationVelocity < 1 ? 'Consider applying more frequently' :
                                safeMetrics.applicationVelocity < 3 ? 'Good application pace' :
                                    'Very active job search!'}
                        </p>
                    </div>

                    <div className="space-y-2 p-4 bg-dark-800/30 rounded-xl border border-dark-700/30">
                        <h3 className="text-sm font-medium text-dark-300">Avg. Time to Interview</h3>
                        <p className="text-2xl font-bold text-white">
                            {formatTimeToInterview(safeMetrics.averageTimeToInterview)}
                        </p>
                        <p className="text-xs text-dark-400">
                            {safeMetrics.averageTimeToInterview === 0 ? 'No interviews yet' :
                                safeMetrics.averageTimeToInterview <= 7 ? 'Fast response time!' :
                                    safeMetrics.averageTimeToInterview <= 14 ? 'Good response time' :
                                        'Longer response time is normal'}
                        </p>
                    </div>
                </div>

                {/* Top Skills */}
                {safeMetrics.topMatchingSkills && safeMetrics.topMatchingSkills.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-dark-700/50">
                        <h3 className="text-sm font-medium text-dark-300 mb-3">Your Top Matching Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {safeMetrics.topMatchingSkills.slice(0, 6).map((skill, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-blue/20 to-accent-indigo/20 text-accent-blue border border-accent-blue/30 hover:border-accent-blue/50 transition-colors"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                        <p className="text-xs text-dark-400 mt-2">
                            These skills appear most frequently in your job matches
                        </p>
                    </div>
                )}

                {/* Improvement Suggestions */}
                <div className="mt-6 pt-6 border-t border-dark-700/50">
                    <h3 className="text-sm font-medium text-dark-300 mb-3">Suggestions</h3>
                    <div className="space-y-3">
                        {safeMetrics.profileCompleteness < 80 && (
                            <div className="flex items-start space-x-3 p-3 bg-warning-500/10 border border-warning-500/20 rounded-lg">
                                <span className="text-warning-500 text-sm">💡</span>
                                <p className="text-xs text-dark-300">
                                    Complete your profile to improve job matching accuracy
                                </p>
                            </div>
                        )}
                        {safeMetrics.applicationVelocity < 1 && (
                            <div className="flex items-start space-x-3 p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-lg">
                                <span className="text-accent-blue text-sm">🚀</span>
                                <p className="text-xs text-dark-300">
                                    Try applying to more jobs to increase your chances
                                </p>
                            </div>
                        )}
                        {safeMetrics.responseRate < 20 && safeMetrics.applicationVelocity > 0 && (
                            <div className="flex items-start space-x-3 p-3 bg-accent-green/10 border border-accent-green/20 rounded-lg">
                                <span className="text-accent-green text-sm">✨</span>
                                <p className="text-xs text-dark-300">
                                    Consider customizing your applications for better response rates
                                </p>
                            </div>
                        )}
                        {safeMetrics.profileCompleteness >= 80 && safeMetrics.responseRate >= 30 && (
                            <div className="flex items-start space-x-3 p-3 bg-success-500/10 border border-success-500/20 rounded-lg">
                                <span className="text-success-500 text-sm">🎉</span>
                                <p className="text-xs text-dark-300">
                                    Great job! You're on track for a successful job search
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserMetricsCard;