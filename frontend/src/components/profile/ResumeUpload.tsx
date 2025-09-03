import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, AlertCircle } from 'lucide-react';
import { profileApi } from '../../services/api';

interface ResumeUploadProps {
    resumeId?: string | null;
    onUploadSuccess: (resumeId: string) => void;
    onDeleteSuccess: () => void;
}

export function ResumeUpload({ resumeId, onUploadSuccess, onDeleteSuccess }: ResumeUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        // Validate file type
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Please upload a PDF or Word document (.pdf, .doc, .docx)');
            return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setUploadError('File size must be less than 5MB');
            return;
        }

        uploadFile(file);
    };

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadError(null);

        try {
            const response = await profileApi.uploadResume(file);
            onUploadSuccess(response.data.resumeId);
        } catch (error: any) {
            console.error('Error uploading resume:', error);
            setUploadError(
                error.response?.data?.error?.message ||
                'Failed to upload resume. Please try again.'
            );
        } finally {
            setIsUploading(false);
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileSelect(file);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete your resume?')) {
            return;
        }

        setIsDeleting(true);
        try {
            await profileApi.deleteResume();
            onDeleteSuccess();
        } catch (error: any) {
            console.error('Error deleting resume:', error);
            setUploadError(
                error.response?.data?.error?.message ||
                'Failed to delete resume. Please try again.'
            );
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDownload = () => {
        if (resumeId) {
            const url = profileApi.getResumeUrl(resumeId);
            window.open(url, '_blank');
        }
    };

    if (resumeId) {
        return (
            <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center mb-4">
                    <FileText className="h-5 w-5 text-accent-blue mr-2" />
                    <h3 className="text-lg font-medium text-white">Resume</h3>
                </div>

                <div className="border border-dark-600/50 rounded-lg p-4 bg-dark-800/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <FileText className="h-8 w-8 text-accent-blue mr-3" />
                            <div>
                                <p className="text-sm font-medium text-white">Resume uploaded</p>
                                <p className="text-sm text-dark-300">Click to view or download</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleDownload}
                                className="inline-flex items-center px-3 py-2 border border-dark-600 shadow-sm text-sm leading-4 font-medium rounded-lg text-dark-300 bg-dark-800/50 hover:bg-dark-700/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-blue transition-all"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                View
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-lg text-white bg-error-500 hover:bg-error-600 focus:outline-none focus:ring-2 focus:ring-error-500 disabled:opacity-50 transition-all"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>

                {uploadError && (
                    <div className="mt-4 p-3 bg-error-500/10 border border-error-500/30 rounded-lg backdrop-blur-sm">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-error-500 mr-2" />
                            <p className="text-sm text-error-500">{uploadError}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center mb-4">
                <Upload className="h-5 w-5 text-accent-blue mr-2" />
                <h3 className="text-lg font-medium text-white">Upload Resume</h3>
            </div>

            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-dark-600 hover:border-dark-500'
                    }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-blue mb-3"></div>
                        <p className="text-sm text-dark-300">Uploading resume...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <Upload className="h-12 w-12 text-dark-400 mb-3" />
                        <p className="text-lg font-medium text-white mb-2">
                            Drop your resume here, or{' '}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-accent-blue hover:text-blue-400 underline transition-colors"
                            >
                                browse
                            </button>
                        </p>
                        <p className="text-sm text-dark-300 mb-4">
                            Supports PDF, DOC, and DOCX files up to 5MB
                        </p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-accent-blue to-primary-600 hover:from-blue-500 hover:to-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-blue shadow-glow-sm transition-all"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                        </button>
                    </div>
                )}
            </div>

            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileInputChange}
                className="hidden"
            />

            {uploadError && (
                <div className="mt-4 p-3 bg-error-500/10 border border-error-500/30 rounded-lg backdrop-blur-sm">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-error-500 mr-2" />
                        <p className="text-sm text-error-500">{uploadError}</p>
                    </div>
                </div>
            )}
        </div>
    );
}