import React, { useState, useRef } from 'react';
import { Upload, FileText, Trash2, Download, AlertCircle, Brain, CheckCircle, Edit3 } from 'lucide-react';
import { profileApi } from '../../services/api';

interface ParsedResume {
    personalInfo: {
        name: string;
        email: string;
        phone?: string;
        location?: string;
    };
    experience: Array<{
        company: string;
        position: string;
        duration: string;
        description: string;
    }>;
    education: Array<{
        institution: string;
        degree: string;
        year: string;
    }>;
    skills: string[];
}

interface ResumeUploadWithAIProps {
    resumeId?: string | null;
    onUploadSuccess: (resumeId: string, parsedData?: ParsedResume) => void;
    onDeleteSuccess: () => void;
    onParsedDataApplied: () => void;
}

export function ResumeUploadWithAI({
    resumeId,
    onUploadSuccess,
    onDeleteSuccess,
    onParsedDataApplied
}: ResumeUploadWithAIProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isParsing, setIsParsing] = useState(false);
    const [isApplyingData, setIsApplyingData] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [parsedData, setParsedData] = useState<ParsedResume | null>(null);
    const [showParsedData, setShowParsedData] = useState(false);
    const [editableParsedData, setEditableParsedData] = useState<ParsedResume | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (file: File) => {
        // Validate file type - only PDF and TXT for AI parsing
        const allowedTypes = ['application/pdf', 'text/plain'];
        if (!allowedTypes.includes(file.type)) {
            setUploadError('Please upload a PDF or TXT file for AI parsing');
            return;
        }

        // Validate file size (5MB limit)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            setUploadError('File size must be less than 5MB');
            return;
        }

        uploadFileWithAI(file);
    };

    const uploadFileWithAI = async (file: File) => {
        setIsUploading(true);
        setUploadError(null);
        setParseError(null);
        setParsedData(null);

        try {
            const response = await profileApi.uploadAndParseResume(file);
            const { resumeId: newResumeId, parsedData: newParsedData, parseError } = response.data;

            if (newParsedData) {
                setParsedData(newParsedData);
                setEditableParsedData(newParsedData);
                setShowParsedData(true);
            } else if (parseError) {
                setParseError(parseError);
            }

            onUploadSuccess(newResumeId, newParsedData);
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

    const handleParseExistingResume = async () => {
        setIsParsing(true);
        setParseError(null);
        setParsedData(null);

        try {
            const response = await profileApi.parseResume();
            const { parsedData: newParsedData } = response.data;

            setParsedData(newParsedData);
            setEditableParsedData(newParsedData);
            setShowParsedData(true);
        } catch (error: any) {
            console.error('Error parsing resume:', error);
            setParseError(
                error.response?.data?.error?.message ||
                'Failed to parse resume. Please try again.'
            );
        } finally {
            setIsParsing(false);
        }
    };

    const handleApplyParsedData = async () => {
        if (!editableParsedData) return;

        setIsApplyingData(true);
        try {
            await profileApi.applyParsedData(editableParsedData);
            onParsedDataApplied();
            setShowParsedData(false);
        } catch (error: any) {
            console.error('Error applying parsed data:', error);
            setParseError(
                error.response?.data?.error?.message ||
                'Failed to apply parsed data. Please try again.'
            );
        } finally {
            setIsApplyingData(false);
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
            setParsedData(null);
            setShowParsedData(false);
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

    const updateEditableData = (field: string, value: any) => {
        if (!editableParsedData) return;

        setEditableParsedData({
            ...editableParsedData,
            [field]: value
        });
    };

    const updatePersonalInfo = (field: string, value: string) => {
        if (!editableParsedData) return;

        setEditableParsedData({
            ...editableParsedData,
            personalInfo: {
                ...editableParsedData.personalInfo,
                [field]: value
            }
        });
    };

    if (showParsedData && editableParsedData) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <Brain className="h-5 w-5 text-blue-600 mr-2" />
                        <h3 className="text-lg font-medium text-gray-900">Review Parsed Resume Data</h3>
                    </div>
                    <button
                        onClick={() => setShowParsedData(false)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Personal Information */}
                    <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">Personal Information</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    value={editableParsedData.personalInfo.name}
                                    onChange={(e) => updatePersonalInfo('name', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={editableParsedData.personalInfo.email}
                                    onChange={(e) => updatePersonalInfo('email', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={editableParsedData.personalInfo.phone || ''}
                                    onChange={(e) => updatePersonalInfo('phone', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                                <input
                                    type="text"
                                    value={editableParsedData.personalInfo.location || ''}
                                    onChange={(e) => updatePersonalInfo('location', e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Skills */}
                    <div>
                        <h4 className="text-md font-medium text-gray-900 mb-3">Skills</h4>
                        <textarea
                            value={editableParsedData.skills.join(', ')}
                            onChange={(e) => updateEditableData('skills', e.target.value.split(',').map(s => s.trim()).filter(s => s))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter skills separated by commas"
                        />
                    </div>

                    {/* Experience */}
                    {editableParsedData.experience.length > 0 && (
                        <div>
                            <h4 className="text-md font-medium text-gray-900 mb-3">Experience</h4>
                            <div className="space-y-3">
                                {editableParsedData.experience.map((exp, index) => (
                                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                                        <p className="font-medium">{exp.position} at {exp.company}</p>
                                        <p className="text-sm text-gray-600">{exp.duration}</p>
                                        <p className="text-sm text-gray-700 mt-1">{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Education */}
                    {editableParsedData.education.length > 0 && (
                        <div>
                            <h4 className="text-md font-medium text-gray-900 mb-3">Education</h4>
                            <div className="space-y-3">
                                {editableParsedData.education.map((edu, index) => (
                                    <div key={index} className="p-3 bg-gray-50 rounded-md">
                                        <p className="font-medium">{edu.degree}</p>
                                        <p className="text-sm text-gray-600">{edu.institution} - {edu.year}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end space-x-3 mt-6 pt-4 border-t">
                    <button
                        onClick={() => setShowParsedData(false)}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApplyParsedData}
                        disabled={isApplyingData}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                    >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isApplyingData ? 'Applying...' : 'Apply to Profile'}
                    </button>
                </div>

                {parseError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                            <p className="text-sm text-red-700">{parseError}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    if (resumeId) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center mb-4">
                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">Resume</h3>
                </div>

                <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <FileText className="h-8 w-8 text-blue-600 mr-3" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">Resume uploaded</p>
                                <p className="text-sm text-gray-500">Click to view or parse with AI</p>
                            </div>
                        </div>
                        <div className="flex space-x-2">
                            <button
                                onClick={handleParseExistingResume}
                                disabled={isParsing}
                                className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <Brain className="h-4 w-4 mr-1" />
                                {isParsing ? 'Parsing...' : 'Parse with AI'}
                            </button>
                            <button
                                onClick={handleDownload}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <Download className="h-4 w-4 mr-1" />
                                View
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                            >
                                <Trash2 className="h-4 w-4 mr-1" />
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>

                {(uploadError || parseError) && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                            <p className="text-sm text-red-700">{uploadError || parseError}</p>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
                <Upload className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Upload Resume with AI Parsing</h3>
            </div>

            <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                    }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
            >
                {isUploading ? (
                    <div className="flex flex-col items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                        <p className="text-sm text-gray-600">Uploading and parsing resume...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="flex items-center mb-3">
                            <Upload className="h-12 w-12 text-gray-400 mr-2" />
                            <Brain className="h-8 w-8 text-blue-600" />
                        </div>
                        <p className="text-lg font-medium text-gray-900 mb-2">
                            Drop your resume here, or{' '}
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="text-blue-600 hover:text-blue-500 underline"
                            >
                                browse
                            </button>
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            Supports PDF and TXT files up to 5MB. AI will automatically parse your resume data.
                        </p>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                accept=".pdf,.txt"
                onChange={handleFileInputChange}
                className="hidden"
            />

            {(uploadError || parseError) && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        <p className="text-sm text-red-700">{uploadError || parseError}</p>
                    </div>
                </div>
            )}
        </div>
    );
}