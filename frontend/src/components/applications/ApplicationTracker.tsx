import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus, ApplicationStats, applicationApi, jobApi } from '../../services/api';
import ApplicationStatusBadge from './ApplicationStatusBadge';
import StatusUpdateModal from './StatusUpdateModal';
import ApplicationHistory from './ApplicationHistory';

interface ApplicationWithJob extends Application {
    job?: {
        id: string;
        title: string;
        company: string;
        location: string;
    };
}

export const ApplicationTracker: React.FC = () => {
    const [applications, setApplications] = useState<ApplicationWithJob[]>([]);
    const [stats, setStats] = useState<ApplicationStats | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus | 'all'>('all');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [statusUpdateModal, setStatusUpdateModal] = useState<{
        isOpen: boolean;
        application: Application | null;
    }>({ isOpen: false, application: null });

    const [historyModal, setHistoryModal] = useState<{
        isOpen: boolean;
        applicationId: string | null;
    }>({ isOpen: false, applicationId: null });

    useEffect(() => {
        fetchApplications();
        fetchStats();
    }, [selectedStatus]);

    const fetchApplications = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const statusFilter = selectedStatus === 'all' ? undefined : selectedStatus;
            const response = await applicationApi.getApplications(statusFilter);

            // Fetch job details for each application
            const applicationsWithJobs = await Promise.all(
                response.data.applications.map(async (app) => {
                    try {
                        const jobResponse = await jobApi.getJobById(app.jobId);
                        return {
                            ...app,
                            job: {
                                id: jobResponse.data.id,
                                title: jobResponse.data.title,
                                company: jobResponse.data.company,
                                location: jobResponse.data.location,
                            }
                        };
                    } catch (error) {
                        // If job fetch fails, return application without job details
                        return app;
                    }
                })
            );

            setApplications(applicationsWithJobs);
        } catch (error: any) {
            setError(error.response?.data?.message || 'Failed to load applications');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await applicationApi.getApplicationStats();
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch application stats:', error);
        }
    };

    const handleStatusUpdate = (updatedApplication: Application) => {
        setApplications(prev =>
            prev.map(app =>
                app.id === updatedApplication.id
                    ? { ...app, ...updatedApplication }
                    : app
            )
        );
        fetchStats(); // Refresh stats after update
    };

    const openStatusUpdateModal = (application: Application) => {
        setStatusUpdateModal({ isOpen: true, application });
    };

    const closeStatusUpdateModal = () => {
        setStatusUpdateModal({ isOpen: false, application: null });
    };

    const openHistoryModal = (applicationId: string) => {
        setHistoryModal({ isOpen: true, applicationId });
    };

    const closeHistoryModal = () => {
        setHistoryModal({ isOpen: false, applicationId: null });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatInterviewDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="space-y-6">
            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white p-4 rounded-lg shadow border">
                        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                        <div className="text-sm text-gray-600">Total Applications</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg shadow border border-blue-200">
                        <div className="text-2xl font-bold text-blue-900">{stats.applied}</div>
                        <div className="text-sm text-blue-600">Applied</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg shadow border border-yellow-200">
                        <div className="text-2xl font-bold text-yellow-900">{stats.interview}</div>
                        <div className="text-sm text-yellow-600">Interviews</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg shadow border border-green-200">
                        <div className="text-2xl font-bold text-green-900">{stats.offered}</div>
                        <div className="text-sm text-green-600">Offers</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg shadow border border-red-200">
                        <div className="text-2xl font-bold text-red-900">{stats.rejected}</div>
                        <div className="text-sm text-red-600">Rejected</div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {(['all', 'applied', 'interview', 'offered', 'rejected'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setSelectedStatus(status)}
                        className={`
                            flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors
                            ${selectedStatus === status
                                ? 'bg-white text-gray-900 shadow'
                                : 'text-gray-600 hover:text-gray-900'
                            }
                        `}
                    >
                        {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                        {stats && status !== 'all' && (
                            <span className="ml-1 text-xs">({stats[status]})</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Applications List */}
            <div className="bg-white rounded-lg shadow">
                {isLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading applications...</span>
                    </div>
                )}

                {error && (
                    <div className="p-6">
                        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                            {error}
                        </div>
                    </div>
                )}

                {!isLoading && !error && applications.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        {selectedStatus === 'all'
                            ? 'No applications found. Start applying to jobs to track your progress!'
                            : `No applications with status "${selectedStatus}" found.`
                        }
                    </div>
                )}

                {!isLoading && !error && applications.length > 0 && (
                    <div className="divide-y divide-gray-200">
                        {applications.map((application) => (
                            <div key={application.id} className="p-6 hover:bg-gray-50">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                            <h3 className="text-lg font-medium text-gray-900 truncate">
                                                {application.job?.title || 'Job Title Not Available'}
                                            </h3>
                                            <ApplicationStatusBadge status={application.status} />
                                        </div>

                                        <div className="text-sm text-gray-600 space-y-1">
                                            <p>
                                                <span className="font-medium">Company:</span> {application.job?.company || 'Unknown'}
                                            </p>
                                            <p>
                                                <span className="font-medium">Location:</span> {application.job?.location || 'Unknown'}
                                            </p>
                                            <p>
                                                <span className="font-medium">Applied:</span> {formatDate(application.appliedAt)}
                                            </p>
                                            {application.interviewDate && (
                                                <p>
                                                    <span className="font-medium">Interview:</span> {formatInterviewDate(application.interviewDate)}
                                                </p>
                                            )}
                                            {application.notes && (
                                                <p className="mt-2">
                                                    <span className="font-medium">Notes:</span> {application.notes}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            onClick={() => openHistoryModal(application.id)}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
                                            title="View History"
                                        >
                                            History
                                        </button>
                                        <button
                                            onClick={() => openStatusUpdateModal(application)}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Update Status
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {statusUpdateModal.application && (
                <StatusUpdateModal
                    application={statusUpdateModal.application}
                    isOpen={statusUpdateModal.isOpen}
                    onClose={closeStatusUpdateModal}
                    onUpdate={handleStatusUpdate}
                />
            )}

            {historyModal.applicationId && (
                <ApplicationHistory
                    applicationId={historyModal.applicationId}
                    isOpen={historyModal.isOpen}
                    onClose={closeHistoryModal}
                />
            )}
        </div>
    );
};

export default ApplicationTracker;