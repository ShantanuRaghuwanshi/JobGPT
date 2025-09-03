import React, { useState } from 'react';
import { Search, Filter, X, MapPin, Briefcase, Tag } from 'lucide-react';
import { JobFilters, ExperienceLevel } from '../../services/api';

interface JobSearchFiltersProps {
    filters: JobFilters;
    onFiltersChange: (filters: JobFilters) => void;
    onSearch: (query: string) => void;
    isLoading?: boolean;
}

const experienceLevels: { value: ExperienceLevel; label: string }[] = [
    { value: 'entry', label: 'Entry Level' },
    { value: 'mid', label: 'Mid Level' },
    { value: 'senior', label: 'Senior Level' },
    { value: 'lead', label: 'Lead Level' },
];

export function JobSearchFilters({ filters, onFiltersChange, onSearch, isLoading = false }: JobSearchFiltersProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [localFilters, setLocalFilters] = useState<JobFilters>(filters);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(searchQuery);
    };

    const handleFilterChange = (key: keyof JobFilters, value: any) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        onFiltersChange(newFilters);
    };

    const clearFilters = () => {
        const clearedFilters: JobFilters = {
            limit: filters.limit,
            offset: 0,
        };
        setLocalFilters(clearedFilters);
        onFiltersChange(clearedFilters);
        setSearchQuery('');
    };

    const hasActiveFilters = () => {
        return !!(
            localFilters.keywords ||
            localFilters.location ||
            localFilters.experienceLevel ||
            localFilters.company
        );
    };

    return (
        <div className="bg-gradient-card rounded-lg shadow-dark border border-dark-700/30 p-6 mb-6 backdrop-blur-sm">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="mb-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-dark-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search jobs by title, company, or keywords..."
                        className="block w-full pl-10 pr-12 py-3 bg-dark-800/50 border border-dark-600 text-white placeholder-dark-400 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                        disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center">
                        <button
                            type="button"
                            onClick={() => setShowFilters(!showFilters)}
                            className={`mr-2 p-2 rounded-lg transition-all ${showFilters || hasActiveFilters()
                                ? 'text-accent-blue bg-accent-blue/20 border border-accent-blue/30'
                                : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                                }`}
                        >
                            <Filter className="h-5 w-5" />
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="mr-2 px-4 py-2 bg-gradient-to-r from-accent-blue to-primary-600 text-white rounded-lg hover:from-blue-500 hover:to-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:opacity-50 shadow-glow-sm transition-all"
                        >
                            {isLoading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>
            </form>

            {/* Filters Panel */}
            {showFilters && (
                <div className="border-t border-dark-700/30 pt-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium text-white">Filters</h3>
                        {hasActiveFilters() && (
                            <button
                                onClick={clearFilters}
                                className="text-sm text-accent-blue hover:text-blue-400 font-medium transition-colors"
                            >
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Location Filter */}
                        <div>
                            <label htmlFor="location-filter" className="block text-sm font-medium text-dark-300 mb-2">
                                <MapPin className="h-4 w-4 inline mr-1" />
                                Location
                            </label>
                            <input
                                id="location-filter"
                                type="text"
                                value={localFilters.location || ''}
                                onChange={(e) => handleFilterChange('location', e.target.value || undefined)}
                                placeholder="e.g. San Francisco, Remote"
                                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 text-white placeholder-dark-400 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                            />
                        </div>

                        {/* Experience Level Filter */}
                        <div>
                            <label htmlFor="experience-filter" className="block text-sm font-medium text-dark-300 mb-2">
                                <Briefcase className="h-4 w-4 inline mr-1" />
                                Experience Level
                            </label>
                            <select
                                id="experience-filter"
                                value={localFilters.experienceLevel || ''}
                                onChange={(e) => handleFilterChange('experienceLevel', e.target.value || undefined)}
                                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 text-white rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                            >
                                <option value="" className="bg-dark-800 text-white">All Levels</option>
                                {experienceLevels.map((level) => (
                                    <option key={level.value} value={level.value} className="bg-dark-800 text-white">
                                        {level.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Company Filter */}
                        <div>
                            <label htmlFor="company-filter" className="block text-sm font-medium text-dark-300 mb-2">
                                <Tag className="h-4 w-4 inline mr-1" />
                                Company
                            </label>
                            <input
                                id="company-filter"
                                type="text"
                                value={localFilters.company || ''}
                                onChange={(e) => handleFilterChange('company', e.target.value || undefined)}
                                placeholder="e.g. Google, Microsoft"
                                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 text-white placeholder-dark-400 rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                            />
                        </div>

                        {/* Results per page */}
                        <div>
                            <label className="block text-sm font-medium text-dark-300 mb-2">
                                Results per page
                            </label>
                            <select
                                value={localFilters.limit || 20}
                                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value))}
                                className="w-full px-3 py-2 bg-dark-800/50 border border-dark-600 text-white rounded-lg focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                            >
                                <option value={10} className="bg-dark-800 text-white">10</option>
                                <option value={20} className="bg-dark-800 text-white">20</option>
                                <option value={50} className="bg-dark-800 text-white">50</option>
                                <option value={100} className="bg-dark-800 text-white">100</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters() && (
                        <div className="mt-4 pt-4 border-t border-dark-700/30">
                            <div className="flex flex-wrap gap-2">
                                {localFilters.keywords && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-blue/20 text-accent-blue border border-accent-blue/30">
                                        Keywords: {localFilters.keywords}
                                        <button
                                            onClick={() => handleFilterChange('keywords', undefined)}
                                            className="ml-2 text-accent-blue hover:text-blue-400 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {localFilters.location && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-green/20 text-accent-green border border-accent-green/30">
                                        Location: {localFilters.location}
                                        <button
                                            onClick={() => handleFilterChange('location', undefined)}
                                            className="ml-2 text-accent-green hover:text-green-400 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {localFilters.experienceLevel && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-purple/20 text-accent-purple border border-accent-purple/30">
                                        Level: {experienceLevels.find(l => l.value === localFilters.experienceLevel)?.label}
                                        <button
                                            onClick={() => handleFilterChange('experienceLevel', undefined)}
                                            className="ml-2 text-accent-purple hover:text-purple-400 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                                {localFilters.company && (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-accent-orange/20 text-accent-orange border border-accent-orange/30">
                                        Company: {localFilters.company}
                                        <button
                                            onClick={() => handleFilterChange('company', undefined)}
                                            className="ml-2 text-accent-orange hover:text-orange-400 transition-colors"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}