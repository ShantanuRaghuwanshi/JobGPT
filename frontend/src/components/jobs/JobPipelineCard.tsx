import React from 'react';
import { useDrag } from 'react-dnd';
import { PipelineJobWithApplication } from '../../services/api';
import { MapPin, Calendar, Building, Clock, FileText } from 'lucide-react';

interface JobPipelineCardProps {
    job: PipelineJobWithApplication;
    columnId: string;
    onJobClick?: (job: PipelineJobWithApplication) => void;
}

export function JobPipelineCard({ job, columnId, onJobClick }: JobPipelineCardProps) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'job',
        item: {
            jobId: job.id,
            fromColumn: columnId,
            job: job
        },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    }));

    const handleClick = () => {
        if (onJobClick) {
            onJobClick(job);
        }
    };

    const getStatusBadge = () => {
        if (!job.applicationStatus) return null;

        const statusColors = {
            applied: 'bg-blue-100 text-blue-800',
            interview: 'bg-yellow-100 text-yellow-800',
            offered: 'bg-green-100 text-green-800',
            rejected: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.applicationStatus]}`}>
                {job.applicationStatus.charAt(0).toUpperCase() + job.applicationStatus.slice(1)}
            </span>
        );
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return null;
        return new Date(dateString).toLocaleDateString();
    };

    return (
        <div
            ref={drag}
            className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-move hover:shadow-md transition-shadow ${isDragging ? 'opacity-50' : ''
                }`}
            onClick={handleClick}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                        {job.title}
                    </h3>
                    <div className="flex items-center mt-1 text-sm text-gray-500">
                        <Building className="h-4 w-4 mr-1" />
                        <span className="truncate">{job.company}</span>
                    </div>
                </div>
                {getStatusBadge()}
            </div>

            {/* Location and Experience */}
            <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span className="truncate">{job.location}</span>
                </div>
                <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                    {job.experienceLevel}
                </span>
            </div>

            {/* Application Details (if applied) */}
            {job.applicationStatus && (
                <div className="border-t border-gray-100 pt-3 mt-3">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        {job.appliedAt && (
                            <div className="flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>Applied {formatDate(job.appliedAt)}</span>
                            </div>
                        )}
                        {job.interviewDate && (
                            <div className="flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>Interview {formatDate(job.interviewDate)}</span>
                            </div>
                        )}
                    </div>
                    {job.notes && (
                        <div className="flex items-start mt-2 text-xs text-gray-600">
                            <FileText className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                            <span className="line-clamp-2">{job.notes}</span>
                        </div>
                    )}
                </div>
            )}

            {/* Skills Preview */}
            {job.requirements && job.requirements.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap gap-1">
                        {job.requirements.slice(0, 3).map((skill, index) => (
                            <span
                                key={index}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700"
                            >
                                {skill}
                            </span>
                        ))}
                        {job.requirements.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-50 text-gray-500">
                                +{job.requirements.length - 3} more
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}