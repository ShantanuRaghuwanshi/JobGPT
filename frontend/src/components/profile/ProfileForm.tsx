import React, { useState, useEffect } from 'react';
import { UserProfile, ProfileUpdateRequest, ExperienceLevel } from '../../services/api';
import { User, MapPin, Briefcase, Tag, Save, X } from 'lucide-react';

interface ProfileFormProps {
    profile: UserProfile | null;
    onSave: (updates: ProfileUpdateRequest) => Promise<void>;
    onCancel: () => void;
    isLoading?: boolean;
}

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead/Principal' },
];

export function ProfileForm({ profile, onSave, onCancel, isLoading = false }: ProfileFormProps) {
    const [formData, setFormData] = useState<ProfileUpdateRequest>({
        name: '',
        age: undefined,
        location: '',
        skills: [],
        experienceLevel: 'entry',
        preferences: {
            locations: [],
            experienceLevels: ['entry', 'mid'],
            keywords: [],
            remoteWork: false,
        },
    });

    const [skillInput, setSkillInput] = useState('');
    const [locationInput, setLocationInput] = useState('');
    const [keywordInput, setKeywordInput] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (profile) {
            setFormData({
                name: profile.name,
                age: profile.age,
                location: profile.location,
                skills: profile.skills,
                experienceLevel: profile.experienceLevel,
                preferences: profile.preferences,
            });
        }
    }, [profile]);

    const handleInputChange = (field: keyof ProfileUpdateRequest, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handlePreferencesChange = (field: keyof typeof formData.preferences, value: any) => {
        setFormData(prev => ({
            ...prev,
            preferences: {
                ...prev.preferences!,
                [field]: value,
            },
        }));
    };

    const addSkill = () => {
        if (skillInput.trim() && !formData.skills?.includes(skillInput.trim())) {
            handleInputChange('skills', [...(formData.skills || []), skillInput.trim()]);
            setSkillInput('');
        }
    };

    const removeSkill = (skill: string) => {
        handleInputChange('skills', formData.skills?.filter(s => s !== skill) || []);
    };

    const addLocation = () => {
        if (locationInput.trim() && !formData.preferences?.locations.includes(locationInput.trim())) {
            handlePreferencesChange('locations', [...(formData.preferences?.locations || []), locationInput.trim()]);
            setLocationInput('');
        }
    };

    const removeLocation = (location: string) => {
        handlePreferencesChange('locations', formData.preferences?.locations.filter(l => l !== location) || []);
    };

    const addKeyword = () => {
        if (keywordInput.trim() && !formData.preferences?.keywords.includes(keywordInput.trim())) {
            handlePreferencesChange('keywords', [...(formData.preferences?.keywords || []), keywordInput.trim()]);
            setKeywordInput('');
        }
    };

    const removeKeyword = (keyword: string) => {
        handlePreferencesChange('keywords', formData.preferences?.keywords.filter(k => k !== keyword) || []);
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name?.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.location?.trim()) {
            newErrors.location = 'Location is required';
        }

        if (formData.age && (formData.age < 16 || formData.age > 100)) {
            newErrors.age = 'Age must be between 16 and 100';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving profile:', error);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center mb-4">
                    <User className="h-5 w-5 text-accent-blue mr-2" />
                    <h3 className="text-lg font-medium text-white">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-dark-300">
                            Full Name *
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={formData.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className={`mt-1 block w-full rounded-md bg-dark-800 border-dark-600 text-white placeholder-dark-400 shadow-sm focus:border-accent-blue focus:ring-accent-blue ${errors.name ? 'border-error-500' : ''
                                }`}
                            placeholder="Enter your full name"
                        />
                        {errors.name && <p className="mt-1 text-sm text-error-500">{errors.name}</p>}
                    </div>

                    <div>
                        <label htmlFor="age" className="block text-sm font-medium text-dark-300">
                            Age
                        </label>
                        <input
                            type="number"
                            id="age"
                            min="16"
                            max="100"
                            value={formData.age || ''}
                            onChange={(e) => handleInputChange('age', e.target.value ? parseInt(e.target.value) : undefined)}
                            className={`mt-1 block w-full rounded-md bg-dark-800 border-dark-600 text-white placeholder-dark-400 shadow-sm focus:border-accent-blue focus:ring-accent-blue ${errors.age ? 'border-error-500' : ''
                                }`}
                            placeholder="Enter your age"
                        />
                        {errors.age && <p className="mt-1 text-sm text-error-500">{errors.age}</p>}
                    </div>

                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-dark-300">
                            Current Location *
                        </label>
                        <input
                            type="text"
                            id="location"
                            value={formData.location || ''}
                            onChange={(e) => handleInputChange('location', e.target.value)}
                            className={`mt-1 block w-full rounded-md bg-dark-800 border-dark-600 text-white placeholder-dark-400 shadow-sm focus:border-accent-blue focus:ring-accent-blue ${errors.location ? 'border-error-500' : ''
                                }`}
                            placeholder="e.g., New York, NY"
                        />
                        {errors.location && <p className="mt-1 text-sm text-error-500">{errors.location}</p>}
                    </div>

                    <div>
                        <label htmlFor="experienceLevel" className="block text-sm font-medium text-dark-300">
                            Experience Level
                        </label>
                        <select
                            id="experienceLevel"
                            value={formData.experienceLevel || 'entry'}
                            onChange={(e) => handleInputChange('experienceLevel', e.target.value as ExperienceLevel)}
                            className="mt-1 block w-full rounded-md bg-dark-800 border-dark-600 text-white shadow-sm focus:border-accent-blue focus:ring-accent-blue"
                        >
                            {experienceLevels.map(level => (
                                <option key={level.value} value={level.value}>
                                    {level.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Skills */}
            <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center mb-4">
                    <Briefcase className="h-5 w-5 text-accent-blue mr-2" />
                    <h3 className="text-lg font-medium text-white">Skills</h3>
                </div>

                <div className="flex gap-2 mb-3">
                    <input
                        type="text"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                        className="flex-1 rounded-md bg-dark-800 border-dark-600 text-white placeholder-dark-400 shadow-sm focus:border-accent-blue focus:ring-accent-blue"
                        placeholder="Add a skill (e.g., JavaScript, React)"
                    />
                    <button
                        type="button"
                        onClick={addSkill}
                        className="px-4 py-2 bg-accent-blue text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                    >
                        Add
                    </button>
                </div>

                <div className="flex flex-wrap gap-2">
                    {formData.skills?.map((skill, index) => (
                        <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-blue/20 text-accent-blue border border-accent-blue/30"
                        >
                            {skill}
                            <button
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="ml-2 text-accent-blue hover:text-blue-300"
                            >
                                <X className="h-3 w-3" />
                            </button>
                        </span>
                    ))}
                </div>
            </div>

            {/* Job Preferences */}
            <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
                <div className="flex items-center mb-4">
                    <MapPin className="h-5 w-5 text-accent-blue mr-2" />
                    <h3 className="text-lg font-medium text-white">Job Preferences</h3>
                </div>

                <div className="space-y-4">
                    {/* Preferred Locations */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            Preferred Locations
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={locationInput}
                                onChange={(e) => setLocationInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLocation())}
                                className="flex-1 rounded-md bg-dark-800 border-dark-600 text-white placeholder-dark-400 shadow-sm focus:border-accent-blue focus:ring-accent-blue"
                                placeholder="Add a preferred location"
                            />
                            <button
                                type="button"
                                onClick={addLocation}
                                className="px-4 py-2 bg-accent-green text-white rounded-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-accent-green"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.preferences?.locations.map((location, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-green/20 text-accent-green border border-accent-green/30"
                                >
                                    {location}
                                    <button
                                        type="button"
                                        onClick={() => removeLocation(location)}
                                        className="ml-2 text-accent-green hover:text-green-300"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Experience Levels */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            Interested Experience Levels
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {experienceLevels.map(level => (
                                <label key={level.value} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        checked={formData.preferences?.experienceLevels.includes(level.value) || false}
                                        onChange={(e) => {
                                            const current = formData.preferences?.experienceLevels || [];
                                            const updated = e.target.checked
                                                ? [...current, level.value]
                                                : current.filter(l => l !== level.value);
                                            handlePreferencesChange('experienceLevels', updated);
                                        }}
                                        className="rounded border-dark-600 text-accent-blue focus:ring-accent-blue bg-dark-800"
                                    />
                                    <span className="ml-2 text-sm text-white">{level.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Keywords */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            Job Keywords
                        </label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                value={keywordInput}
                                onChange={(e) => setKeywordInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                className="flex-1 rounded-md bg-dark-800 border-dark-600 text-white placeholder-dark-400 shadow-sm focus:border-accent-blue focus:ring-accent-blue"
                                placeholder="Add job keywords (e.g., frontend, remote)"
                            />
                            <button
                                type="button"
                                onClick={addKeyword}
                                className="px-4 py-2 bg-accent-purple text-white rounded-md hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-accent-purple"
                            >
                                Add
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.preferences?.keywords.map((keyword, index) => (
                                <span
                                    key={index}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-purple/20 text-accent-purple border border-accent-purple/30"
                                >
                                    {keyword}
                                    <button
                                        type="button"
                                        onClick={() => removeKeyword(keyword)}
                                        className="ml-2 text-accent-purple hover:text-purple-300"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Remote Work */}
                    <div>
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.preferences?.remoteWork || false}
                                onChange={(e) => handlePreferencesChange('remoteWork', e.target.checked)}
                                className="rounded border-dark-600 text-accent-blue focus:ring-accent-blue bg-dark-800"
                            />
                            <span className="ml-2 text-sm text-white">Open to remote work</span>
                        </label>
                    </div>

                    {/* Salary Range */}
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            Salary Range (Optional)
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.preferences?.salaryRange?.min || ''}
                                    onChange={(e) => handlePreferencesChange('salaryRange', {
                                        ...formData.preferences?.salaryRange,
                                        min: e.target.value ? parseInt(e.target.value) : undefined,
                                    })}
                                    className="block w-full rounded-md bg-dark-800 border-dark-600 text-white placeholder-dark-400 shadow-sm focus:border-accent-blue focus:ring-accent-blue"
                                    placeholder="Min salary"
                                />
                            </div>
                            <div>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.preferences?.salaryRange?.max || ''}
                                    onChange={(e) => handlePreferencesChange('salaryRange', {
                                        ...formData.preferences?.salaryRange,
                                        max: e.target.value ? parseInt(e.target.value) : undefined,
                                    })}
                                    className="block w-full rounded-md bg-dark-800 border-dark-600 text-white placeholder-dark-400 shadow-sm focus:border-accent-blue focus:ring-accent-blue"
                                    placeholder="Max salary"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-4 py-2 border border-dark-600 rounded-md text-sm font-medium text-dark-300 bg-dark-800 hover:bg-dark-700 focus:outline-none focus:ring-2 focus:ring-accent-blue"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-accent-blue to-primary-600 hover:from-blue-500 hover:to-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:opacity-50"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Profile'}
                </button>
            </div>
        </form>
    );
}