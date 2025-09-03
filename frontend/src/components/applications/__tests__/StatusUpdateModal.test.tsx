import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import StatusUpdateModal from '../StatusUpdateModal';
import { Application } from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
    applicationApi: {
        getValidTransitions: vi.fn(),
        updateApplicationStatus: vi.fn(),
    },
}));

// Import after mocking
import { applicationApi } from '../../../services/api';
const mockApplicationApi = applicationApi as any;

describe('StatusUpdateModal', () => {
    const mockApplication: Application = {
        id: 'app-123',
        userId: 'user-123',
        jobId: 'job-123',
        status: 'applied',
        appliedAt: '2024-01-01T00:00:00Z',
        notes: 'Initial notes',
    };

    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockApplicationApi.getValidTransitions.mockResolvedValue({
            data: {
                currentStatus: 'applied',
                validTransitions: ['interview', 'rejected'],
            },
        } as any);
    });

    it('should not render when isOpen is false', () => {
        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={false}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.queryByText('Update Application Status')).not.toBeInTheDocument();
    });

    it('should render modal when isOpen is true', async () => {
        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('Update Application Status')).toBeInTheDocument();
        expect(screen.getByText('Current Status:')).toBeInTheDocument();
        expect(screen.getByDisplayValue('applied')).toBeInTheDocument();

        await waitFor(() => {
            expect(mockApplicationApi.getValidTransitions).toHaveBeenCalledWith('applied');
        });
    });

    it('should show interview date field when interview status is selected', async () => {
        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        const statusSelect = screen.getByDisplayValue('applied');
        await userEvent.selectOptions(statusSelect, 'interview');

        expect(screen.getByLabelText('Interview Date & Time')).toBeInTheDocument();
    });

    it('should not show interview date field for non-interview status', async () => {
        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        const statusSelect = screen.getByDisplayValue('applied');
        await userEvent.selectOptions(statusSelect, 'rejected');

        expect(screen.queryByLabelText('Interview Date & Time')).not.toBeInTheDocument();
    });

    it('should call onClose when cancel button is clicked', async () => {
        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        const cancelButton = screen.getByText('Cancel');
        await userEvent.click(cancelButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should call onClose when X button is clicked', async () => {
        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        const closeButton = screen.getByRole('button', { name: '' }); // X button has no text
        await userEvent.click(closeButton);

        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should submit form with correct data', async () => {
        const updatedApplication = { ...mockApplication, status: 'interview' as const };
        mockApplicationApi.updateApplicationStatus.mockResolvedValue({
            data: updatedApplication,
        } as any);

        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        // Change status to interview
        const statusSelect = screen.getByDisplayValue('applied');
        await userEvent.selectOptions(statusSelect, 'interview');

        // Add notes
        const notesTextarea = screen.getByPlaceholderText('Add any notes about this status update...');
        await userEvent.type(notesTextarea, 'Interview scheduled');

        // Add interview date
        const interviewDateInput = screen.getByLabelText('Interview Date & Time');
        await userEvent.type(interviewDateInput, '2024-01-15T10:00');

        // Submit form
        const submitButton = screen.getByText('Update Status');
        await userEvent.click(submitButton);

        await waitFor(() => {
            expect(mockApplicationApi.updateApplicationStatus).toHaveBeenCalledWith(
                'app-123',
                {
                    status: 'interview',
                    notes: 'Interview scheduled',
                    interviewDate: '2024-01-15T10:00',
                }
            );
        });

        expect(mockOnUpdate).toHaveBeenCalledWith(updatedApplication);
        expect(mockOnClose).toHaveBeenCalled();
    });

    it('should handle API errors', async () => {
        const errorMessage = 'Invalid status transition';
        mockApplicationApi.updateApplicationStatus.mockRejectedValue({
            response: { data: { message: errorMessage } },
        });

        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        const submitButton = screen.getByText('Update Status');
        await userEvent.click(submitButton);

        await waitFor(() => {
            expect(screen.getByText(errorMessage)).toBeInTheDocument();
        });

        expect(mockOnUpdate).not.toHaveBeenCalled();
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should show loading state during submission', async () => {
        // Mock a delayed response
        mockApplicationApi.updateApplicationStatus.mockImplementation(
            () => new Promise(resolve => setTimeout(resolve, 100))
        );

        render(
            <StatusUpdateModal
                application={mockApplication}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        const submitButton = screen.getByText('Update Status');
        await userEvent.click(submitButton);

        expect(screen.getByText('Updating...')).toBeInTheDocument();
        expect(submitButton).toBeDisabled();
    });

    it('should populate form with existing application data', () => {
        const applicationWithData: Application = {
            ...mockApplication,
            notes: 'Existing notes',
            interviewDate: '2024-01-10T14:00:00Z',
        };

        render(
            <StatusUpdateModal
                application={applicationWithData}
                isOpen={true}
                onClose={mockOnClose}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByDisplayValue('Existing notes')).toBeInTheDocument();
    });
});