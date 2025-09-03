import React from 'react';
import { DashboardStats as DashboardStatsType } from '../../services/api';

interface DashboardStatsProps {
    stats: DashboardStatsType;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
    // Handle null/undefined stats
    if (!stats) {
        return (
            <div className="bg-gradient-card rounded-xl shadow-dark border border-dark-700/50">
                <div className="p-6">
                    <h2 className="text-lg font-semibold text-white mb-6">Overview</h2>
                    <div className="text-center py-8">
                        <p className="text-dark-400">Loading statistics...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Provide safe defaults for undefined stats
    const safeStats = {
        user: {
            totalApplications: stats?.user?.totalApplications || 0,
            activeApplications: stats?.user?.activeApplications || 0,
            interviewsScheduled: stats?.user?.interviewsScheduled || 0,
            offersReceived: stats?.user?.offersReceived || 0,
            profileComplete: stats?.user?.profileComplete || false
        },
        jobs: {
            totalAvailable: stats?.jobs?.totalAvailable || 0,
            newJobsToday: stats?.jobs?.newJobsToday || 0,
            matchingJobs: stats?.jobs?.matchingJobs || 0,
            averageMatchScore: stats?.jobs?.averageMatchScore || 0
        },
        applications: {
            applied: stats?.applications?.applied || 0,
            interview: stats?.applications?.interview || 0,
            offered: stats?.applications?.offered || 0,
            rejected: stats?.applications?.rejected || 0,
            successRate: stats?.applications?.successRate || 0
        },
        recommendations: {
            topMatches: stats?.recommendations?.topMatches || [],
            skillsInDemand: stats?.recommendations?.skillsInDemand || [],
            suggestedLocations: stats?.recommendations?.suggestedLocations || []
        }
    };

    const statCards = [
        {
            title: 'Total Applications',
            value: safeStats.user.totalApplications,
            subtitle: `${safeStats.user.activeApplications} active`,
            icon: '📄',
            color: 'bg-gradient-to-br from-accent-blue to-primary-600'
        },
        {
            title: 'Interviews Scheduled',
            value: safeStats.user.interviewsScheduled,
            subtitle: 'This month',
            icon: '🗓️',
            color: 'bg-gradient-to-br from-accent-green to-success-600'
        },
        {
            title: 'Offers Received',
            value: safeStats.user.offersReceived,
            subtitle: 'Pending decisions',
            icon: '🎉',
            color: 'bg-gradient-to-br from-accent-purple to-accent-indigo'
        },
        {
            title: 'Success Rate',
            value: `${safeStats.applications.successRate}%`,
            subtitle: 'Offer rate',
            icon: '📈',
            color: 'bg-gradient-to-br from-accent-orange to-warning-600'
        }
    ];

    const jobStats = [
        {
            title: 'Available Jobs',
            value: safeStats.jobs.totalAvailable,
            subtitle: `${safeStats.jobs.newJobsToday} new today`,
            color: 'text-accent-blue'
        },
        {
            title: 'Matching Jobs',
            value: safeStats.jobs.matchingJobs,
            subtitle: `${safeStats.jobs.averageMatchScore}% avg match`,
            color: 'text-accent-green'
        }
    ];

    return (
        <div className="bg-gradient-card rounded-xl shadow-dark border border-dark-700/50">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Overview</h2>

                {/* Application Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {statCards.map((stat, index) => (
                        <div key={index} className="bg-dark-800/30 rounded-xl p-4 border border-dark-700/30 hover:border-dark-600/50 transition-all duration-300 group">
                            <div className="flex items-center">
                                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-white text-lg mr-3 shadow-glow-sm group-hover:scale-105 transition-transform`}>
                                    {stat.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-dark-400">{stat.title}</p>
                                    <p className="text-2xl font-bold text-white">{stat.value}</p>
                                    <p className="text-xs text-dark-500">{stat.subtitle}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Job Market Stats */}
                <div className="border-t border-dark-700/50 pt-6">
                    <h3 className="text-md font-medium text-white mb-4">Job Market</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {jobStats.map((stat, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-dark-800/30 rounded-xl border border-dark-700/30 hover:border-dark-600/50 transition-colors">
                                <div>
                                    <p className="text-sm font-medium text-dark-300">{stat.title}</p>
                                    <p className="text-xs text-dark-400">{stat.subtitle}</p>
                                </div>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Application Status Breakdown */}
                <div className="border-t border-dark-700/50 pt-6 mt-6">
                    <h3 className="text-md font-medium text-white mb-4">Application Status</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="text-center p-4 bg-gradient-to-br from-accent-blue/20 to-primary-600/20 rounded-xl border border-accent-blue/30 hover:border-accent-blue/50 transition-colors">
                            <p className="text-2xl font-bold text-accent-blue">{safeStats.applications.applied}</p>
                            <p className="text-xs text-accent-blue font-medium">Applied</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-warning-500/20 to-accent-orange/20 rounded-xl border border-warning-500/30 hover:border-warning-500/50 transition-colors">
                            <p className="text-2xl font-bold text-warning-500">{safeStats.applications.interview}</p>
                            <p className="text-xs text-warning-500 font-medium">Interview</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-accent-green/20 to-success-600/20 rounded-xl border border-accent-green/30 hover:border-accent-green/50 transition-colors">
                            <p className="text-2xl font-bold text-accent-green">{safeStats.applications.offered}</p>
                            <p className="text-xs text-accent-green font-medium">Offered</p>
                        </div>
                        <div className="text-center p-4 bg-gradient-to-br from-error-500/20 to-accent-red/20 rounded-xl border border-error-500/30 hover:border-error-500/50 transition-colors">
                            <p className="text-2xl font-bold text-error-500">{safeStats.applications.rejected}</p>
                            <p className="text-xs text-error-500 font-medium">Rejected</p>
                        </div>
                    </div>
                </div>

                {/* Skills in Demand */}
                {safeStats.recommendations.skillsInDemand.length > 0 && (
                    <div className="border-t border-dark-700/50 pt-6 mt-6">
                        <h3 className="text-md font-medium text-white mb-4">Skills in Demand</h3>
                        <div className="flex flex-wrap gap-2">
                            {safeStats.recommendations.skillsInDemand.slice(0, 8).map((skill, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-accent-indigo/20 to-accent-purple/20 text-accent-indigo border border-accent-indigo/30 hover:border-accent-indigo/50 transition-colors"
                                >
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DashboardStats;