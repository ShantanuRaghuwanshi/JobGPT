import React, { useState } from 'react';

interface JobRecommendation {
    jobId: string;
    title: string;
    company: string;
    score: number;
    matchReasons: string[];
}

interface JobRecommendationsProps {
    recommendations: JobRecommendation[];
    onRefresh: () => void;
    refreshing: boolean;
}

const JobRecommendations: React.FC<JobRecommendationsProps> = ({
    recommendations,
    onRefresh,
    refreshing
}) => {
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-accent-green bg-accent-green/20 border-accent-green/30';
        if (score >= 60) return 'text-warning-500 bg-warning-500/20 border-warning-500/30';
        return 'text-error-500 bg-error-500/20 border-error-500/30';
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return 'Excellent Match';
        if (score >= 60) return 'Good Match';
        return 'Fair Match';
    };

    const handleViewJob = (jobId: string) => {
        // Navigate to job details
        window.location.href = `/jobs/${jobId}`;
    };

    const handleApplyToJob = (jobId: string) => {
        // Navigate to job application
        window.location.href = `/jobs/${jobId}/apply`;
    };

    return (
        <div className="bg-gradient-card rounded-xl shadow-dark border border-dark-700/50">
            <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white">Job Recommendations</h2>
                    <button
                        onClick={onRefresh}
                        disabled={refreshing}
                        className="text-sm text-accent-blue hover:text-accent-blue/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {recommendations.length === 0 ? (
                    <div className="text-center py-8">
                        <div className="text-dark-500 text-4xl mb-4">🎯</div>
                        <p className="text-dark-400">No recommendations available</p>
                        <p className="text-sm text-dark-500 mt-1">
                            Complete your profile to get personalized job recommendations
                        </p>
                        <div className="mt-4">
                            <a
                                href="/profile"
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-gradient-to-r from-accent-blue to-primary-600 hover:from-accent-blue/80 hover:to-primary-700 transition-all shadow-glow-sm"
                            >
                                Complete Profile
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {recommendations.map((recommendation, index) => (
                            <div
                                key={recommendation.jobId}
                                className="border border-dark-700/30 rounded-xl p-4 hover:shadow-dark hover:border-dark-600/50 transition-all bg-dark-800/20 hover:bg-dark-800/40"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <h3 className="font-medium text-white text-sm">
                                                {recommendation.title}
                                            </h3>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getScoreColor(recommendation.score)}`}>
                                                {recommendation.score}% match
                                            </span>
                                        </div>
                                        <p className="text-sm text-dark-300 mb-2">
                                            {recommendation.company}
                                        </p>
                                        <p className="text-xs text-dark-400 mb-3">
                                            {getScoreLabel(recommendation.score)}
                                        </p>

                                        {/* Match Reasons */}
                                        {recommendation.matchReasons.length > 0 && (
                                            <div className="mb-3">
                                                <button
                                                    onClick={() => setExpandedCard(
                                                        expandedCard === recommendation.jobId ? null : recommendation.jobId
                                                    )}
                                                    className="text-xs text-accent-blue hover:text-accent-blue/80 font-medium transition-colors"
                                                >
                                                    {expandedCard === recommendation.jobId ? 'Hide' : 'Show'} match reasons
                                                </button>

                                                {expandedCard === recommendation.jobId && (
                                                    <div className="mt-2 space-y-1">
                                                        {recommendation.matchReasons.map((reason, reasonIndex) => (
                                                            <div key={reasonIndex} className="flex items-center text-xs text-dark-300">
                                                                <span className="w-1.5 h-1.5 bg-accent-green rounded-full mr-2"></span>
                                                                {reason}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Actions */}
                                        <div className="flex space-x-2">
                                            <button
                                                onClick={() => handleViewJob(recommendation.jobId)}
                                                className="inline-flex items-center px-3 py-1.5 border border-dark-600/50 shadow-sm text-xs font-medium rounded-lg text-dark-300 bg-dark-800/30 hover:bg-dark-700/50 hover:border-dark-500/50 transition-all"
                                            >
                                                View Details
                                            </button>
                                            <button
                                                onClick={() => handleApplyToJob(recommendation.jobId)}
                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-lg shadow-sm text-white bg-gradient-to-r from-accent-blue to-primary-600 hover:from-accent-blue/80 hover:to-primary-700 transition-all"
                                            >
                                                Quick Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {recommendations.length > 0 && (
                    <div className="mt-6 text-center">
                        <a
                            href="/jobs?view=recommendations"
                            className="text-sm text-accent-blue hover:text-accent-blue/80 font-medium transition-colors"
                        >
                            View all recommendations →
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobRecommendations;