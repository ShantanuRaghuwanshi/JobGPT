import React, { useState, useEffect } from 'react';
import { StatusChange, applicationApi } from '../../services/api';
import ApplicationStatusBadge from './ApplicationStatusBadge';

interface ApplicationHistoryProps {
    applicationId: string;
    isOpen: boolean;
    onClose: () => void;
}

export const ApplicationHistory: React.FC<ApplicationHistoryProps> = ({
    applicationId,
    isOpen,
    onClose
}) => {
    const [history, setHistory] = useState<StatusChange[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && applicationId) {
            fetchHistory();
        }
    }, [isOpen, applicationId]);

    const fetchHistory = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await applicationApi.getApplicationHistory(applicationId);
            setHistory(response.data.history);
        } catch (error: any) {
            setError(error.response?.data?.message || 'Failed to load application history');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold">Application History</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {isLoading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Loading history...</span>
                    </div>
                )}

                {error && (
                    <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded mb-4">
                        {error}
                    </div>
                )}

                {!isLoading && !error && history.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        No status changes recorded for this application.
                    </div>
                )}

                {!isLoading && !error && history.length > 0 && (
                    <div className="space-y-4">
                        {history.map((change, index) => (
                            <div key={change.id} className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                                    </div>
                                    {index < history.length - 1 && (
                                        <div className="w-0.5 h-8 bg-gray-200 mx-auto mt-2"></div>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        {change.fromStatus && (
                                            <>
                                                <ApplicationStatusBadge status={change.fromStatus} />
                                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                </svg>
                                            </>
                                        )}
                                        <ApplicationStatusBadge status={change.toStatus} />
                                    </div>

                                    <p className="text-sm text-gray-500 mb-1">
                                        {formatDate(change.changedAt)}
                                    </p>

                                    {change.notes && (
                                        <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                            {change.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApplicationHistory;