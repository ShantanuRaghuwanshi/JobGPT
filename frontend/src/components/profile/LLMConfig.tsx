import React, { useState, useEffect } from 'react';
import { Settings, Eye, EyeOff, Save, AlertCircle, CheckCircle } from 'lucide-react';
import type { LLMConfig } from '../../services/api';

interface LLMConfigProps {
    config?: LLMConfig | null;
    onSave: (config: LLMConfig) => Promise<void>;
    isLoading?: boolean;
}

const llmProviders = [
    { value: 'openai', label: 'OpenAI (GPT-3.5/GPT-4)', requiresApiKey: true },
    { value: 'claude', label: 'Anthropic Claude', requiresApiKey: true },
    { value: 'gemini', label: 'Google Gemini', requiresApiKey: true },
    { value: 'ollama', label: 'Ollama (Local)', requiresApiKey: false },
] as const;

const modelsByProvider = {
    openai: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview'],
    claude: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229'],
    gemini: ['gemini-pro', 'gemini-pro-vision'],
    ollama: ['llama2', 'codellama', 'mistral', 'neural-chat'],
};

export function LLMConfig({ config, onSave, isLoading = false }: LLMConfigProps) {
    const [formData, setFormData] = useState<LLMConfig>({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: '',
        endpoint: '',
    });

    const [showApiKey, setShowApiKey] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        if (config) {
            setFormData(config);
        }
    }, [config]);

    const handleInputChange = (field: keyof LLMConfig, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
        setTestResult(null);
    };

    const handleProviderChange = (provider: LLMConfig['provider']) => {
        const defaultModel = modelsByProvider[provider][0];
        setFormData(prev => ({
            ...prev,
            provider,
            model: defaultModel,
            endpoint: provider === 'ollama' ? 'http://localhost:11434' : '',
        }));
        setTestResult(null);
    };

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};
        const selectedProvider = llmProviders.find(p => p.value === formData.provider);

        if (!formData.model) {
            newErrors.model = 'Model is required';
        }

        if (selectedProvider?.requiresApiKey && !formData.apiKey) {
            newErrors.apiKey = 'API key is required for this provider';
        }

        if (formData.provider === 'ollama' && !formData.endpoint) {
            newErrors.endpoint = 'Endpoint is required for Ollama';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const testConnection = async () => {
        if (!validateForm()) {
            return;
        }

        setIsTesting(true);
        setTestResult(null);

        try {
            // Simulate API test - in real implementation, this would call a backend endpoint
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Mock success/failure based on provider
            const success = Math.random() > 0.3; // 70% success rate for demo

            setTestResult({
                success,
                message: success
                    ? 'Connection successful! LLM is responding correctly.'
                    : 'Connection failed. Please check your configuration.'
            });
        } catch (error) {
            setTestResult({
                success: false,
                message: 'Failed to test connection. Please try again.'
            });
        } finally {
            setIsTesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            await onSave(formData);
        } catch (error) {
            console.error('Error saving LLM config:', error);
        }
    };

    const selectedProvider = llmProviders.find(p => p.value === formData.provider);
    const availableModels = modelsByProvider[formData.provider] || [];

    return (
        <div className="bg-gradient-card shadow-dark border border-dark-700/30 rounded-lg p-6 backdrop-blur-sm">
            <div className="flex items-center mb-6">
                <Settings className="h-5 w-5 text-accent-blue mr-2" />
                <h3 className="text-lg font-medium text-white">LLM Configuration</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Provider Selection */}
                <div>
                    <label className="block text-sm font-medium text-dark-300 mb-3">
                        AI Provider
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {llmProviders.map(provider => (
                            <label
                                key={provider.value}
                                className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none transition-all ${formData.provider === provider.value
                                    ? 'border-accent-blue ring-2 ring-accent-blue/50 bg-accent-blue/10'
                                    : 'border-dark-600 hover:border-dark-500 bg-dark-800/30'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="provider"
                                    value={provider.value}
                                    checked={formData.provider === provider.value}
                                    onChange={(e) => handleProviderChange(e.target.value as LLMConfig['provider'])}
                                    className="sr-only"
                                />
                                <div className="flex-1">
                                    <div className="flex items-center">
                                        <div className="text-sm">
                                            <p className="font-medium text-white">{provider.label}</p>
                                            <p className="text-dark-400">
                                                {provider.requiresApiKey ? 'Requires API key' : 'Local installation'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Model Selection */}
                <div>
                    <label htmlFor="model" className="block text-sm font-medium text-dark-300">
                        Model
                    </label>
                    <select
                        id="model"
                        value={formData.model}
                        onChange={(e) => handleInputChange('model', e.target.value)}
                        className={`mt-1 block w-full rounded-lg bg-dark-800/50 border-dark-600 text-white shadow-sm focus:border-accent-blue focus:ring-accent-blue ${errors.model ? 'border-error-500' : ''
                            }`}
                    >
                        {availableModels.map(model => (
                            <option key={model} value={model} className="bg-dark-800 text-white">
                                {model}
                            </option>
                        ))}
                    </select>
                    {errors.model && <p className="mt-1 text-sm text-error-500">{errors.model}</p>}
                </div>

                {/* API Key (if required) */}
                {selectedProvider?.requiresApiKey && (
                    <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-dark-300">
                            API Key
                        </label>
                        <div className="mt-1 relative">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                id="apiKey"
                                value={formData.apiKey || ''}
                                onChange={(e) => handleInputChange('apiKey', e.target.value)}
                                className={`block w-full pr-10 rounded-lg bg-dark-800/50 border-dark-600 text-white shadow-sm focus:border-accent-blue focus:ring-accent-blue ${errors.apiKey ? 'border-error-500' : ''
                                    }`}
                                placeholder="Enter your API key"
                            />
                            <button
                                type="button"
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            >
                                {showApiKey ? (
                                    <EyeOff className="h-4 w-4 text-dark-400 hover:text-white transition-colors" />
                                ) : (
                                    <Eye className="h-4 w-4 text-dark-400 hover:text-white transition-colors" />
                                )}
                            </button>
                        </div>
                        {errors.apiKey && <p className="mt-1 text-sm text-error-500">{errors.apiKey}</p>}
                    </div>
                )}

                {/* Endpoint (for Ollama) */}
                {formData.provider === 'ollama' && (
                    <div>
                        <label htmlFor="endpoint" className="block text-sm font-medium text-dark-300">
                            Ollama Endpoint
                        </label>
                        <input
                            type="url"
                            id="endpoint"
                            value={formData.endpoint || ''}
                            onChange={(e) => handleInputChange('endpoint', e.target.value)}
                            className={`mt-1 block w-full rounded-lg bg-dark-800/50 border-dark-600 text-white shadow-sm focus:border-accent-blue focus:ring-accent-blue ${errors.endpoint ? 'border-error-500' : ''
                                }`}
                            placeholder="http://localhost:11434"
                        />
                        {errors.endpoint && <p className="mt-1 text-sm text-error-500">{errors.endpoint}</p>}
                        <p className="mt-1 text-sm text-dark-400">
                            Make sure Ollama is running locally and accessible at this endpoint
                        </p>
                    </div>
                )}

                {/* Test Connection */}
                <div className="border-t border-dark-700/30 pt-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-medium text-white">Test Configuration</h4>
                        <button
                            type="button"
                            onClick={testConnection}
                            disabled={isTesting}
                            className="inline-flex items-center px-3 py-2 border border-dark-600 shadow-sm text-sm leading-4 font-medium rounded-lg text-dark-300 bg-dark-800/50 hover:bg-dark-700/50 hover:text-white focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:opacity-50 transition-all"
                        >
                            {isTesting ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent-blue mr-2"></div>
                                    Testing...
                                </>
                            ) : (
                                'Test Connection'
                            )}
                        </button>
                    </div>

                    {testResult && (
                        <div className={`p-3 rounded-lg backdrop-blur-sm ${testResult.success ? 'bg-success-500/10 border border-success-500/30' : 'bg-error-500/10 border border-error-500/30'
                            }`}>
                            <div className="flex">
                                {testResult.success ? (
                                    <CheckCircle className="h-5 w-5 text-success-500 mr-2" />
                                ) : (
                                    <AlertCircle className="h-5 w-5 text-error-500 mr-2" />
                                )}
                                <p className={`text-sm ${testResult.success ? 'text-success-500' : 'text-error-500'
                                    }`}>
                                    {testResult.message}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Form Actions */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-accent-blue to-primary-600 hover:from-blue-500 hover:to-primary-500 focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:opacity-50 shadow-glow-sm transition-all"
                    >
                        <Save className="h-4 w-4 mr-2" />
                        {isLoading ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}