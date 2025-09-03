import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Edit, User, Upload, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { ProfileForm } from '../components/profile/ProfileForm';
import { ResumeUpload } from '../components/profile/ResumeUpload';
import { LLMConfig } from '../components/profile/LLMConfig';
import { profileApi, UserProfile, ProfileUpdateRequest, LLMConfig as LLMConfigType } from '../services/api';

type TabType = 'profile' | 'resume' | 'llm';

export function ProfilePage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('profile');
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [llmConfig, setLlmConfig] = useState<LLMConfigType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setIsLoading(true);
            const response = await profileApi.getProfile();
            setProfile(response.data);
        } catch (error: any) {
            console.error('Error loading profile:', error);
            if (error.response?.status === 404) {
                // Profile doesn't exist yet, that's okay
                setProfile(null);
            } else {
                setError('Failed to load profile. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleProfileSave = async (updates: ProfileUpdateRequest) => {
        try {
            setSaving(true);
            setError(null);
            const response = await profileApi.updateProfile(updates);
            setProfile(response.data);
            setIsEditing(false);
            setSuccessMessage('Profile updated successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error: any) {
            console.error('Error saving profile:', error);
            setError(error.response?.data?.error?.message || 'Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleResumeUpload = (resumeId: string) => {
        if (profile) {
            setProfile({ ...profile, resumeId });
        }
        setSuccessMessage('Resume uploaded successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleResumeDelete = () => {
        if (profile) {
            setProfile({ ...profile, resumeId: null });
        }
        setSuccessMessage('Resume deleted successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const handleLLMConfigSave = async (config: LLMConfigType) => {
        try {
            setSaving(true);
            setError(null);
            // In a real implementation, this would call an API endpoint
            // For now, we'll just simulate saving
            await new Promise(resolve => setTimeout(resolve, 1000));
            setLlmConfig(config);
            setSuccessMessage('LLM configuration saved successfully!');
            setTimeout(() => setSuccessMessage(null), 3000);
        } catch (error: any) {
            console.error('Error saving LLM config:', error);
            setError('Failed to save LLM configuration. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'profile' as TabType, label: 'Profile', icon: User },
        { id: 'resume' as TabType, label: 'Resume', icon: Upload },
        { id: 'llm' as TabType, label: 'AI Settings', icon: Settings },
    ];

    if (isLoading) {
        return (
            <Layout
                title="Profile Management"
                subtitle="Loading your profile information..."
            >
                <div className="flex items-center justify-center min-h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
                        <p className="text-dark-300">Loading profile...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout
            title="Profile Management"
            subtitle="Manage your profile, resume, and AI settings"
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Action Button */}
                {activeTab === 'profile' && !isEditing && (
                    <div className="mb-6 flex justify-end">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-accent-blue to-primary-600 hover:from-blue-500 hover:to-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-blue shadow-glow-sm transition-all"
                        >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Profile
                        </button>
                    </div>
                )}

                {/* Success/Error Messages */}
                {successMessage && (
                    <div className="mb-6 bg-success-500/10 border border-success-500/30 rounded-lg p-4 backdrop-blur-sm">
                        <div className="flex">
                            <CheckCircle className="h-5 w-5 text-success-500 mr-2" />
                            <p className="text-sm text-success-500">{successMessage}</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 bg-error-500/10 border border-error-500/30 rounded-lg p-4 backdrop-blur-sm">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-error-500 mr-2" />
                            <p className="text-sm text-error-500">{error}</p>
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-b border-dark-700/30 mb-6">
                    <nav className="-mb-px flex space-x-8">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                                        ? 'border-accent-blue text-accent-blue'
                                        : 'border-transparent text-dark-400 hover:text-white hover:border-dark-600'
                                        }`}
                                >
                                    <Icon className="h-4 w-4 mr-2" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="space-y-6">
                    {activeTab === 'profile' && (
                        <>
                            {isEditing ? (
                                <ProfileForm
                                    profile={profile}
                                    onSave={handleProfileSave}
                                    onCancel={() => setIsEditing(false)}
                                    isLoading={isSaving}
                                />
                            ) : (
                                <ProfileDisplay profile={profile} />
                            )}
                        </>
                    )}

                    {activeTab === 'resume' && (
                        <ResumeUpload
                            resumeId={profile?.resumeId}
                            onUploadSuccess={handleResumeUpload}
                            onDeleteSuccess={handleResumeDelete}
                        />
                    )}

                    {activeTab === 'llm' && (
                        <LLMConfig
                            config={llmConfig}
                            onSave={handleLLMConfigSave}
                            isLoading={isSaving}
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
}

// Profile Display Component
function ProfileDisplay({ profile }: { profile: UserProfile | null }) {
    if (!profile) {
        return (
            <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
                <div className="text-center py-12">
                    <User className="h-12 w-12 text-dark-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Profile Found</h3>
                    <p className="text-dark-300 mb-4">
                        You haven't created a profile yet. Click "Edit Profile" to get started.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center mb-4">
                    <User className="h-5 w-5 text-accent-blue mr-2" />
                    <h3 className="text-lg font-medium text-white">Basic Information</h3>
                </div>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <dt className="text-sm font-medium text-dark-400">Name</dt>
                        <dd className="mt-1 text-sm text-white">{profile.name}</dd>
                    </div>
                    {profile.age && (
                        <div>
                            <dt className="text-sm font-medium text-dark-400">Age</dt>
                            <dd className="mt-1 text-sm text-white">{profile.age}</dd>
                        </div>
                    )}
                    <div>
                        <dt className="text-sm font-medium text-dark-400">Location</dt>
                        <dd className="mt-1 text-sm text-white">{profile.location}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-dark-400">Experience Level</dt>
                        <dd className="mt-1 text-sm text-white capitalize">{profile.experienceLevel}</dd>
                    </div>
                </dl>
            </div>

            {/* Skills */}
            <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="text-lg font-medium text-white mb-4">Skills</h3>
                <div className="flex flex-wrap gap-2">
                    {profile.skills.map((skill, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                        >
                            {skill}
                        </span>
                    ))}
                </div>
            </div>

            {/* Job Preferences */}
            <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="text-lg font-medium text-white mb-4">Job Preferences</h3>
                <dl className="space-y-4">
                    <div>
                        <dt className="text-sm font-medium text-dark-400">Preferred Locations</dt>
                        <dd className="mt-1">
                            <div className="flex flex-wrap gap-2">
                                {profile.preferences.locations.map((location, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-green/20 text-accent-green border border-accent-green/30"
                                    >
                                        {location}
                                    </span>
                                ))}
                            </div>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-dark-400">Experience Levels</dt>
                        <dd className="mt-1">
                            <div className="flex flex-wrap gap-2">
                                {profile.preferences.experienceLevels.map((level, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-purple/20 text-accent-purple border border-accent-purple/30 capitalize"
                                    >
                                        {level}
                                    </span>
                                ))}
                            </div>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-dark-400">Keywords</dt>
                        <dd className="mt-1">
                            <div className="flex flex-wrap gap-2">
                                {profile.preferences.keywords.map((keyword, index) => (
                                    <span
                                        key={index}
                                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-orange/20 text-accent-orange border border-accent-orange/30"
                                    >
                                        {keyword}
                                    </span>
                                ))}
                            </div>
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-dark-400">Remote Work</dt>
                        <dd className="mt-1 text-sm text-white">
                            {profile.preferences.remoteWork ? 'Open to remote work' : 'Prefers on-site work'}
                        </dd>
                    </div>
                    {profile.preferences.salaryRange && (
                        <div>
                            <dt className="text-sm font-medium text-dark-400">Salary Range</dt>
                            <dd className="mt-1 text-sm text-white">
                                ${profile.preferences.salaryRange.min?.toLocaleString()} - ${profile.preferences.salaryRange.max?.toLocaleString()}
                            </dd>
                        </div>
                    )}
                </dl>
            </div>
        </div>
    );
}