import React from 'react';
import { useDrop } from 'react-dnd';
import { PipelineColumn as PipelineColumnType, PipelineJobWithApplication } from '../../services/api';
import { JobPipelineCard } from './JobPipelineCard';
import { Plus, AlertCircle } from 'lucide-react';

interface PipelineColumnProps {
    column: PipelineColumnType;
    onDrop: (jobId: string, fromColumn: string, toColumn: string) => void;
    onJobClick?: (job: PipelineJobWithApplication) => void;
    isValidDropTarget?: (fromColumn: string, toColumn: string) => boolean;
}

export function PipelineColumn({ column, onDrop, onJobClick, isValidDropTarget }: PipelineColumnProps) {
    const [{ isOver, canDrop }, drop] = useDrop(() => ({
        accept: 'job',
        drop: (item: { jobId: string; fromColumn: string; job: PipelineJobWithApplication }) => {
            if (item.fromColumn !== column.id) {
                onDrop(item.jobId, item.fromColumn, column.id);
            }
        },
        canDrop: (item: { jobId: string; fromColumn: string; job: PipelineJobWithApplication }) => {
            if (item.fromColumn === column.id) return false;
            return isValidDropTarget ? isValidDropTarget(item.fromColumn, column.id) : true;
        },
        collect: (monitor) => ({
            isOver: monitor.isOver(),
            canDrop: monitor.canDrop(),
        }),
    }));

    const getColumnColor = () => {
        const colors = {
            available: 'border-gray-300 bg-gray-50',
            applied: 'border-blue-300 bg-blue-50',
            interview: 'border-yellow-300 bg-yellow-50',
            offered: 'border-green-300 bg-green-50'
        };
        return colors[column.status] || colors.available;
    };

    const getHeaderColor = () => {
        const colors = {
            available: 'text-gray-700',
            applied: 'text-blue-700',
            interview: 'text-yellow-700',
            offered: 'text-green-700'
        };
        return colors[column.status] || colors.available;
    };

    const getDropZoneStyle = () => {
        if (isOver && canDrop) {
            return 'border-2 border-dashed border-blue-400 bg-blue-50';
        }
        if (isOver && !canDrop) {
            return 'border-2 border-dashed border-red-400 bg-red-50';
        }
        return '';
    };

    return (
        <div
            ref={drop}
            className={`flex flex-col h-full min-h-96 rounded-lg border-2 ${getColumnColor()} ${getDropZoneStyle()}`}
        >
            {/* Column Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <h3 className={`text-lg font-semibold ${getHeaderColor()}`}>
                        {column.title}
                    </h3>
                    <div className="flex items-center space-x-2">
                        <span className="bg-white text-gray-600 px-2 py-1 rounded-full text-sm font-medium">
                            {column.jobs.length}
                        </span>
                        {column.status === 'available' && (
                            <Plus className="h-4 w-4 text-gray-400" />
                        )}
                    </div>
                </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 p-4 overflow-y-auto">
                {column.jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                        <div className="text-center">
                            <div className="text-2xl mb-2">📋</div>
                            <p className="text-sm">
                                {column.status === 'available'
                                    ? 'No available jobs'
                                    : `No ${column.status} applications`
                                }
                            </p>
                            {column.status === 'available' && (
                                <p className="text-xs mt-1 text-gray-400">
                                    Jobs will appear here when crawled
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {column.jobs.map((job) => (
                            <JobPipelineCard
                                key={job.id}
                                job={job}
                                columnId={column.id}
                                onJobClick={onJobClick}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Drop Zone Indicator */}
            {isOver && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-10 rounded-lg pointer-events-none">
                    <div className={`px-4 py-2 rounded-lg text-sm font-medium ${canDrop
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}>
                        {canDrop ? (
                            <div className="flex items-center">
                                <Plus className="h-4 w-4 mr-2" />
                                Drop to move here
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                Invalid move
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}