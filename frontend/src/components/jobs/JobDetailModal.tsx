import React from 'react';
import { X, MapPin, Building, Clock, Star, ExternalLink, Briefcase, Users } from 'lucide-react';
import { Job, JobMatch, ExperienceLevel } from '../../services/api';

interface JobDetailModalProps {
    job: Job;
    match?: JobMatch;
    isOpen: boolean;
    onClose: () => void;
    onApply?: (job: Job) => void;
    isApplied?: boolean;
    showMatchScore?: boolean;
}

const experienceLevelColors: Record<ExperienceLevel, string> = {
    entry: 'bg-green-100 text-green-800',
    mid: 'bg-blue-100 text-blue-800',
    senior: 'bg-purple-100 text-purple-800',
    lead: 'bg-red-100 text-red-800',
};

const experienceLevelLabels: Record<ExperienceLevel, string> = {
    entry: 'Entry Level',
    mid: 'Mid Level',
    senior: 'Senior Level',
    lead: 'Lead Level',
};

export function JobDetailModal({
    job,
    match,
    isOpen,
    onClose,
    onApply,
    isApplied = false,
    showMatchScore = false
}: JobDetailModalProps) {
    if (!isOpen) return null;

    const handleApply = () => {
        if (onApply && !isApplied) {
            onApply(job);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
        if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                {/* Background overlay */}
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
                    onClick={onClose}
                />

                {/* Modal panel */}
                <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-6">
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        {job.title}
                                    </h2>
                                    <div className="flex items-center text-gray-600 mb-3">
                                        <Building className="h-5 w-5 mr-2" />
                                        <span className="text-lg font-medium">{job.company}</span>
                                    </div>
                                </div>

                                {showMatchScore && match && (
                                    <div className={`px-4 py-2 rounded-lg border ${getScoreColor(match.score)}`}>
                                        <div className="flex items-center">
                                            <Star className="h-4 w-4 mr-1" />
                                            <span className="font-semibold">{Math.round(match.score)}% Match</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Job meta info */}
                            <div className="flex flex-wrap items-center gap-4 mb-4">
                                <div className="flex items-center text-gray-500">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    <span>{job.location}</span>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${experienceLevelColors[job.experienceLevel]}`}>
                                    <Briefcase className="h-3 w-3 inline mr-1" />
                                    {experienceLevelLabels[job.experienceLevel]}
                                </span>
                                <div className="flex items-center text-gray-500">
                                    <Clock className="h-4 w-4 mr-1" />
                                    <span className="text-sm">
                                        Posted {new Date(job.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="ml-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Match information */}
                    {showMatchScore && match && (
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h3 className="text-lg font-semibold text-blue-900 mb-3">
                                Why this job matches you
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Match reasons */}
                                {match.matchReasons.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-blue-800 mb-2">Match Reasons</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {match.matchReasons.map((reason, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700"
                                                >
                                                    {reason}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Skill matches */}
                                {match.skillMatches.length > 0 && (
                                    <div>
                                        <h4 className="font-medium text-blue-800 mb-2">Your Matching Skills</h4>
                                        <div className="flex flex-wrap gap-1">
                                            {match.skillMatches.map((skill, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 border border-green-200"
                                                >
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Job description */}
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Job Description</h3>
                        <div className="prose prose-sm max-w-none text-gray-700">
                            {job.description.split('\n').map((paragraph, index) => (
                                <p key={index} className="mb-3">
                                    {paragraph}
                                </p>
                            ))}
                        </div>
                    </div>

                    {/* Requirements */}
                    {job.requirements && job.requirements.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Requirements</h3>
                            <div className="flex flex-wrap gap-2">
                                {job.requirements.map((requirement, index) => (
                                    <span
                                        key={index}
                                        className={`px-3 py-1 rounded-full text-sm font-medium ${match?.skillMatches.includes(requirement)
                                                ? 'bg-green-100 text-green-700 border border-green-200'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}
                                    >
                                        {requirement}
                                        {match?.skillMatches.includes(requirement) && (
                                            <span className="ml-1 text-green-600">✓</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between items-center pt-6 border-t border-gray-200">
                        <div className="flex items-center text-gray-500">
                            <Users className="h-4 w-4 mr-1" />
                            <span className="text-sm">
                                Job ID: {job.id.slice(0, 8)}...
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <a
                                href={job.applicationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                            >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View on Company Site
                            </a>

                            {onApply && (
                                <button
                                    onClick={handleApply}
                                    disabled={isApplied}
                                    className={`inline-flex items-center px-6 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${isApplied
                                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                                        }`}
                                >
                                    {isApplied ? 'Already Applied' : 'Apply Now'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}