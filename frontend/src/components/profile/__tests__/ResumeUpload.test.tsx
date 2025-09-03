import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResumeUpload } from '../ResumeUpload';
import { profileApi } from '../../../services/api';

// Mock the API
vi.mock('../../../services/api', () => ({
    profileApi: {
        uploadResume: vi.fn(),
        deleteResume: vi.fn(),
        getResumeUrl: vi.fn(),
    },
}));

const mockProfileApi = profileApi as any;

describe('ResumeUpload', () => {
    const mockOnUploadSuccess = vi.fn();
    const mockOnDeleteSuccess = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        mockProfileApi.getResumeUrl.mockReturnValue('/api/profile/resume/test-resume.pdf');
    });

    it('renders upload interface when no resume exists', () => {
        render(
            <ResumeUpload
                resumeId={null}
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        expect(screen.getByText('Upload Resume')).toBeInTheDocument();
        expect(screen.getByText('Drop your resume here, or')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /choose file/i })).toBeInTheDocument();
    });

    it('renders resume display when resume exists', () => {
        render(
            <ResumeUpload
                resumeId="test-resume.pdf"
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        expect(screen.getByText('Resume')).toBeInTheDocument();
        expect(screen.getByText('Resume uploaded')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /view/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('handles file upload successfully', async () => {
        const user = userEvent.setup();
        mockProfileApi.uploadResume.mockResolvedValue({
            data: {
                resumeId: 'new-resume.pdf',
                message: 'Resume uploaded successfully',
                url: '/api/profile/resume/new-resume.pdf',
            },
        } as any);

        render(
            <ResumeUpload
                resumeId={null}
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
        const input = screen.getByRole('button', { name: /choose file/i });

        // Simulate file selection
        const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        Object.defineProperty(hiddenInput, 'files', {
            value: [file],
            writable: false,
        });

        fireEvent.change(hiddenInput);

        await waitFor(() => {
            expect(mockProfileApi.uploadResume).toHaveBeenCalledWith(file);
            expect(mockOnUploadSuccess).toHaveBeenCalledWith('new-resume.pdf');
        });
    });

    it('shows error for invalid file type', async () => {
        const user = userEvent.setup();
        render(
            <ResumeUpload
                resumeId={null}
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        const file = new File(['test content'], 'resume.txt', { type: 'text/plain' });
        const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(hiddenInput, 'files', {
            value: [file],
            writable: false,
        });

        fireEvent.change(hiddenInput);

        await waitFor(() => {
            expect(screen.getByText('Please upload a PDF or Word document (.pdf, .doc, .docx)')).toBeInTheDocument();
        });
    });

    it('shows error for file too large', async () => {
        render(
            <ResumeUpload
                resumeId={null}
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'resume.pdf', { type: 'application/pdf' });
        const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(hiddenInput, 'files', {
            value: [largeFile],
            writable: false,
        });

        fireEvent.change(hiddenInput);

        await waitFor(() => {
            expect(screen.getByText('File size must be less than 5MB')).toBeInTheDocument();
        });
    });

    it('handles resume deletion', async () => {
        const user = userEvent.setup();
        mockProfileApi.deleteResume.mockResolvedValue({ data: { message: 'Resume deleted' } } as any);

        // Mock window.confirm
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

        render(
            <ResumeUpload
                resumeId="test-resume.pdf"
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        await waitFor(() => {
            expect(mockProfileApi.deleteResume).toHaveBeenCalled();
            expect(mockOnDeleteSuccess).toHaveBeenCalled();
        });

        confirmSpy.mockRestore();
    });

    it('cancels deletion when user declines confirmation', async () => {
        const user = userEvent.setup();
        const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

        render(
            <ResumeUpload
                resumeId="test-resume.pdf"
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        const deleteButton = screen.getByRole('button', { name: /delete/i });
        await user.click(deleteButton);

        expect(mockProfileApi.deleteResume).not.toHaveBeenCalled();
        expect(mockOnDeleteSuccess).not.toHaveBeenCalled();

        confirmSpy.mockRestore();
    });

    it('opens resume in new tab when view button is clicked', async () => {
        const user = userEvent.setup();
        const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

        render(
            <ResumeUpload
                resumeId="test-resume.pdf"
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        const viewButton = screen.getByRole('button', { name: /view/i });
        await user.click(viewButton);

        expect(openSpy).toHaveBeenCalledWith('/api/profile/resume/test-resume.pdf', '_blank');

        openSpy.mockRestore();
    });

    it('shows loading state during upload', async () => {
        mockProfileApi.uploadResume.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

        render(
            <ResumeUpload
                resumeId={null}
                onUploadSuccess={mockOnUploadSuccess}
                onDeleteSuccess={mockOnDeleteSuccess}
            />
        );

        const file = new File(['test content'], 'resume.pdf', { type: 'application/pdf' });
        const hiddenInput = document.querySelector('input[type="file"]') as HTMLInputElement;

        Object.defineProperty(hiddenInput, 'files', {
            value: [file],
            writable: false,
        });

        fireEvent.change(hiddenInput);

        expect(screen.getByText('Uploading resume...')).toBeInTheDocument();
    });
});