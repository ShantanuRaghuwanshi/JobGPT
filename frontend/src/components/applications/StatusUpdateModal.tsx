import React, { useState, useEffect } from 'react';
import { Application, ApplicationStatus, applicationApi } from '../../services/api';
import ApplicationStatusBadge from './ApplicationStatusBadge';

interface StatusUpdateModalProps {
    application: Application;
    isOpen: boolean;
    onClose: () => void;
    onUpdate: (updatedApplication: Application) => void;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
    application,
    isOpen,
    onClose,
    onUpdate
}) => {
    const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>(application.status);
    const [notes, setNotes] = useState(application.notes || '');
    const [interviewDate, setInterviewDate] = useState(
        application.interviewDate ? new Date(application.interviewDate).toISOString().slice(0, 16) : ''
    );
    const [validTransitions, setValidTransitions] = useState<ApplicationStatus[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            fetchValidTransitions();
            setSelectedStatus(application.status);
            setNotes(application.notes || '');
            setInterviewDate(
                application.interviewDate ? new Date(application.interviewDate).toISOString().slice(0, 16) : ''
            );
        }
    }, [isOpen, application]);

    const fetchValidTransitions = async () => {
        try {
            const response = await applicationApi.getValidTransitions(application.status);
            setValidTransitions([application.status, ...response.data.validTransitions]);
        } catch (error) {
            console.error('Failed to fetch valid transitions:', error);
            setValidTransitions([application.status]);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            const updateRequest = {
                status: selectedStatus,
                notes: notes.trim() || undefined,
                interviewDate: (selectedStatus === 'interview' && interviewDate) ? interviewDate : undefined
            };

            const response = await applicationApi.updateApplicationStatus(application.id, updateRequest);
            onUpdate(response.data);
            onClose();
        } catch (error: any) {
            setError(error.response?.data?.message || 'Failed to update application status');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        setError(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Update Application Status</h2>
                    <button
                        onClick={handleClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Current Status:</p>
                    <ApplicationStatusBadge status={application.status} />
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                            New Status
                        </label>
                        <select
                            id="status"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value as ApplicationStatus)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        >
                            {validTransitions.map((status) => (
                                <option key={status} value={status}>
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedStatus === 'interview' && (
                        <div className="mb-4">
                            <label htmlFor="interviewDate" className="block text-sm font-medium text-gray-700 mb-2">
                                Interview Date & Time
                            </label>
                            <input
                                type="datetime-local"
                                id="interviewDate"
                                value={interviewDate}
                                onChange={(e) => setInterviewDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}

                    <div className="mb-6">
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            id="notes"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Add any notes about this status update..."
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Updating...' : 'Update Status'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StatusUpdateModal;