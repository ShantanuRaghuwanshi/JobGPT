import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelineApi, PipelineData, PipelineJobWithApplication, ApplicationStatus } from '../../services/api';
import { PipelineColumn } from './PipelineColumn';
import { JobDetailModal } from './JobDetailModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorMessage } from '../ui/ErrorMessage';
import { RefreshCw, BarChart3 } from 'lucide-react';

interface JobPipelineProps {
    className?: string;
}

export function JobPipeline({ className = '' }: JobPipelineProps) {
    const [selectedJob, setSelectedJob] = useState<PipelineJobWithApplication | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const queryClient = useQueryClient();

    // Fetch pipeline data
    const {
        data: pipelineData,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['pipeline'],
        queryFn: async () => {
            const response = await pipelineApi.getPipelineData();
            return response.data.data;
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });

    // Fetch pipeline stats
    const { data: stats } = useQuery({
        queryKey: ['pipeline-stats'],
        queryFn: async () => {
            const response = await pipelineApi.getPipelineStats();
            return response.data.data;
        },
        refetchInterval: 30000,
    });

    // Drag and drop mutation
    const dragDropMutation = useMutation({
        mutationFn: async ({ jobId, fromColumn, toColumn }: {
            jobId: string;
            fromColumn: string;
            toColumn: string;
        }) => {
            const response = await pipelineApi.handleDragDrop({
                jobId,
                fromColumn,
                toColumn
            });
            return response.data;
        },
        onSuccess: () => {
            // Invalidate and refetch pipeline data
            queryClient.invalidateQueries({ queryKey: ['pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        },
        onError: (error: any) => {
            console.error('Drag drop error:', error);
            // You could show a toast notification here
        },
    });

    // Refresh mutation
    const refreshMutation = useMutation({
        mutationFn: async () => {
            const response = await pipelineApi.refreshPipelineData();
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pipeline'] });
            queryClient.invalidateQueries({ queryKey: ['pipeline-stats'] });
        },
    });

    const handleDrop = (jobId: string, fromColumn: string, toColumn: string) => {
        dragDropMutation.mutate({ jobId, fromColumn, toColumn });
    };

    const handleJobClick = (job: PipelineJobWithApplication) => {
        setSelectedJob(job);
        setIsModalOpen(true);
    };

    const handleRefresh = () => {
        refreshMutation.mutate();
    };

    const isValidDropTarget = (fromColumn: string, toColumn: string): boolean => {
        // Define valid transitions
        const validTransitions: Record<string, string[]> = {
            available: ['applied'],
            applied: ['available', 'interview', 'rejected'],
            interview: ['available', 'offered', 'rejected'],
            offered: ['available', 'rejected']
        };

        return validTransitions[fromColumn]?.includes(toColumn) || false;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" />
            </div>
        );
    }

    if (error) {
        return (
            <ErrorMessage
                title="Failed to load pipeline"
                message="There was an error loading your job pipeline. Please try again."
                onRetry={() => refetch()}
            />
        );
    }

    if (!pipelineData || !pipelineData.columns) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">No pipeline data available</p>
            </div>
        );
    }

    return (
        <DndProvider backend={HTML5Backend}>
            <div className={`space-y-6 ${className}`}>
                {/* Header with Stats */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Job Pipeline</h2>
                        <p className="text-gray-600 mt-1">
                            Drag and drop jobs between columns to manage your applications
                        </p>
                    </div>
                    <div className="flex items-center space-x-4">
                        {/* Stats Summary */}
                        {stats && (
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="flex items-center">
                                    <BarChart3 className="h-4 w-4 mr-1 text-gray-400" />
                                    <span className="text-gray-600">
                                        {stats.available + stats.applied + stats.interview + stats.offered} total
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Refresh Button */}
                        <button
                            onClick={handleRefresh}
                            disabled={refreshMutation.isPending}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Pipeline Columns */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-96">
                    {pipelineData.columns.map((column) => (
                        <div key={column.id} className="relative">
                            <PipelineColumn
                                column={column}
                                onDrop={handleDrop}
                                onJobClick={handleJobClick}
                                isValidDropTarget={isValidDropTarget}
                            />
                        </div>
                    ))}
                </div>

                {/* Loading Overlay for Drag Operations */}
                {dragDropMutation.isPending && (
                    <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-4 shadow-lg">
                            <div className="flex items-center">
                                <LoadingSpinner size="sm" />
                                <span className="ml-3 text-sm text-gray-600">Updating application...</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Job Detail Modal */}
                {selectedJob && (
                    <JobDetailModal
                        job={selectedJob}
                        isOpen={isModalOpen}
                        onClose={() => {
                            setIsModalOpen(false);
                            setSelectedJob(null);
                        }}
                        showApplicationDetails={!!selectedJob.applicationStatus}
                    />
                )}
            </div>
        </DndProvider>
    );
}