import React from 'react';
import { MapPin, Building, Clock, Star, ExternalLink } from 'lucide-react';
import { Job, JobMatch, ExperienceLevel } from '../../services/api';

interface JobCardProps {
    job: Job;
    match?: JobMatch;
    onViewDetails: (job: Job) => void;
    onApply?: (job: Job) => void;
    showMatchScore?: boolean;
    isApplied?: boolean;
}

const experienceLevelColors: Record<ExperienceLevel, string> = {
    entry: 'bg-accent-green/20 text-accent-green border border-accent-green/30',
    mid: 'bg-accent-blue/20 text-accent-blue border border-accent-blue/30',
    senior: 'bg-accent-purple/20 text-accent-purple border border-accent-purple/30',
    lead: 'bg-accent-red/20 text-accent-red border border-accent-red/30',
};

const experienceLevelLabels: Record<ExperienceLevel, string> = {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    lead: 'Lead Level',
};

export function JobCard({ job, match, onViewDetails, onApply, showMatchScore = false, isApplied = false }: JobCardProps) {
    const handleViewDetails = () => {
        onViewDetails(job);
    };

    const handleApply = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onApply && !isApplied) {
            onApply(job);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-accent-green bg-accent-green/20 border border-accent-green/30';
        if (score >= 60) return 'text-accent-blue bg-accent-blue/20 border border-accent-blue/30';
        if (score >= 40) return 'text-accent-orange bg-accent-orange/20 border border-accent-orange/30';
        return 'text-accent-red bg-accent-red/20 border border-accent-red/30';
    };

    return (
        <div
            className="bg-gradient-card rounded-lg shadow-dark border border-dark-700/30 p-6 hover:shadow-dark-lg transition-all cursor-pointer backdrop-blur-sm"
            onClick={handleViewDetails}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1 line-clamp-2">
                        {job.title}
                    </h3>
                    <div className="flex items-center text-dark-300 mb-2">
                        <Building className="h-4 w-4 mr-1" />
                        <span className="text-sm font-medium">{job.company}</span>
                    </div>
                </div>

                {showMatchScore && match && (
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(match.score)}`}>
                        <Star className="h-3 w-3 inline mr-1" />
                        {Math.round(match.score)}%
                    </div>
                )}
            </div>

            {/* Location and Experience Level */}
            <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center text-dark-400">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span className="text-sm">{job.location}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${experienceLevelColors[job.experienceLevel]}`}>
                    {experienceLevelLabels[job.experienceLevel]}
                </span>
            </div>

            {/* Description */}
            <p className="text-dark-300 text-sm mb-4 line-clamp-3">
                {job.description}
            </p>

            {/* Skills/Requirements */}
            {job.requirements && job.requirements.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                        {job.requirements.slice(0, 4).map((requirement, index) => (
                            <span
                                key={index}
                                className={`px-2 py-1 rounded text-xs font-medium ${match?.skillMatches.includes(requirement)
                                    ? 'bg-accent-green/20 text-accent-green border border-accent-green/30'
                                    : 'bg-dark-700/50 text-dark-300 border border-dark-600'
                                    }`}
                            >
                                {requirement}
                            </span>
                        ))}
                        {job.requirements.length > 4 && (
                            <span className="px-2 py-1 rounded text-xs text-dark-400">
                                +{job.requirements.length - 4} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Match Reasons */}
            {showMatchScore && match && match.matchReasons.length > 0 && (
                <div className="mb-4">
                    <div className="flex flex-wrap gap-1">
                        {match.matchReasons.slice(0, 2).map((reason, index) => (
                            <span
                                key={index}
                                className="px-2 py-1 rounded-full text-xs bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                            >
                                {reason}
                            </span>
                        ))}
                        {match.matchReasons.length > 2 && (
                            <span className="px-2 py-1 rounded-full text-xs text-dark-400">
                                +{match.matchReasons.length - 2} more
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center pt-4 border-t border-dark-700/30">
                <div className="flex items-center text-dark-400 text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>
                        {new Date(job.updatedAt).toLocaleDateString()}
                    </span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleViewDetails}
                        className="px-3 py-1 text-sm text-accent-blue hover:text-blue-400 font-medium transition-colors"
                    >
                        View Details
                    </button>

                    {onApply && (
                        <button
                            onClick={handleApply}
                            disabled={isApplied}
                            className={`px-4 py-1 text-sm font-medium rounded-lg transition-all ${isApplied
                                ? 'bg-dark-700/50 text-dark-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-accent-blue to-primary-600 text-white hover:from-blue-500 hover:to-primary-500 shadow-glow-sm'
                                }`}
                        >
                            {isApplied ? 'Applied' : 'Apply'}
                        </button>
                    )}

                    <a
                        href={job.applicationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-dark-400 hover:text-white transition-colors"
                        title="View on company website"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>
        </div>
    );
}