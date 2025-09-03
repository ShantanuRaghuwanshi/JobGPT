import React, { useState, useEffect } from 'react';
import { Settings, Brain, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { llmApi, LLMConfig } from '../../services/api';

interface LLMConfigWithUIProps {
    onConfigurationChange?: (configured: boolean) => void;
}

interface Provider {
    name: string;
    requiresApiKey?: boolean;
    requiresEndpoint?: boolean;
    models: string[];
}

export function LLMConfigWithUI({ onConfigurationChange }: LLMConfigWithUIProps) {
    const [config, setConfig] = useState<LLMConfig>({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: '',
        endpoint: ''
    });
    const [providers, setProviders] = useState<{ [key: string]: Provider }>({});
    const [supportedFileTypes, setSupportedFileTypes] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isTesting, setIsTesting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
    const [isConfigured, setIsConfigured] = useState(false);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setIsLoading(true);

            // Load providers and current config in parallel
            const [providersResponse, configResponse] = await Promise.all([
                llmApi.getProviders(),
                llmApi.getConfig()
            ]);

            setProviders(providersResponse.data.providers);
            setSupportedFileTypes(providersResponse.data.supportedFileTypes);

            const currentConfig = configResponse.data;
            setIsConfigured(currentConfig.configured);

            if (currentConfig.configured) {
                setConfig({
                    provider: currentConfig.provider as any,
                    model: currentConfig.model || 'gpt-3.5-turbo',
                    apiKey: '', // Don't show API key for security
                    endpoint: currentConfig.endpoint || ''
                });
            }

            onConfigurationChange?.(currentConfig.configured);
        } catch (error: any) {
            console.error('Error loading LLM configuration:', error);
            setError('Failed to load configuration');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        try {
            setIsSaving(true);
            setError(null);
            setSuccess(null);

            const response = await llmApi.updateConfig(config);

            setSuccess(response.data.message);
            setConnectionStatus(response.data.connectionTest);
            setIsConfigured(true);
            onConfigurationChange?.(true);

            if (!response.data.connectionTest) {
                setError('Configuration saved but connection test failed. Please verify your settings.');
            }
        } catch (error: any) {
            console.error('Error saving LLM configuration:', error);
            setError(
                error.response?.data?.error?.message ||
                'Failed to save configuration'
            );
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestConnection = async () => {
        try {
            setIsTesting(true);
            setError(null);

            const response = await llmApi.testConnection();
            setConnectionStatus(response.data.connected);

            if (response.data.connected) {
                setSuccess('Connection test successful!');
            } else {
                setError('Connection test failed. Please check your configuration.');
            }
        } catch (error: any) {
            console.error('Error testing connection:', error);
            setConnectionStatus(false);
            setError(
                error.response?.data?.error?.message ||
                'Connection test failed'
            );
        } finally {
            setIsTesting(false);
        }
    };

    const handleProviderChange = (provider: string) => {
        const providerInfo = providers[provider];
        if (!providerInfo) return;

        setConfig({
            ...config,
            provider: provider as any,
            model: providerInfo.models[0] || '',
            apiKey: '',
            endpoint: provider === 'ollama' ? 'http://localhost:11434' : ''
        });
        setConnectionStatus(null);
    };

    const currentProvider = providers[config.provider];

    if (isLoading) {
        return (
            <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-center py-8">
                    <Loader className="h-8 w-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">Loading configuration...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-6">
                <Brain className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">AI Configuration</h3>
                {isConfigured && (
                    <div className="ml-auto flex items-center text-green-600">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        <span className="text-sm">Configured</span>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {/* Provider Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Provider
                    </label>
                    <select
                        value={config.provider}
                        onChange={(e) => handleProviderChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {Object.entries(providers).map(([key, provider]) => (
                            <option key={key} value={key}>
                                {provider.name}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Model Selection */}
                {currentProvider && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Model
                        </label>
                        <select
                            value={config.model}
                            onChange={(e) => setConfig({ ...config, model: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {currentProvider.models.map((model) => (
                                <option key={model} value={model}>
                                    {model}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* API Key (for cloud providers) */}
                {currentProvider?.requiresApiKey && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            API Key
                        </label>
                        <input
                            type="password"
                            value={config.apiKey}
                            onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                            placeholder="Enter your API key"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Your API key is stored securely and never displayed after saving.
                        </p>
                    </div>
                )}

                {/* Endpoint (for Ollama) */}
                {currentProvider?.requiresEndpoint && (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Endpoint URL
                        </label>
                        <input
                            type="url"
                            value={config.endpoint}
                            onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                            placeholder="http://localhost:11434"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Make sure Ollama is running on this endpoint.
                        </p>
                    </div>
                )}

                {/* Supported File Types Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Supported File Types</h4>
                    <p className="text-sm text-blue-700">
                        {supportedFileTypes.join(', ')}
                    </p>
                </div>

                {/* Connection Status */}
                {connectionStatus !== null && (
                    <div className={`flex items-center p-3 rounded-md ${connectionStatus
                            ? 'bg-green-50 border border-green-200 text-green-700'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                        {connectionStatus ? (
                            <CheckCircle className="h-4 w-4 mr-2" />
                        ) : (
                            <AlertCircle className="h-4 w-4 mr-2" />
                        )}
                        <span className="text-sm">
                            {connectionStatus ? 'Connection successful' : 'Connection failed'}
                        </span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-3 pt-4 border-t">
                    <button
                        onClick={handleSaveConfig}
                        disabled={isSaving || !config.model ||
                            (currentProvider?.requiresApiKey && !config.apiKey) ||
                            (currentProvider?.requiresEndpoint && !config.endpoint)}
                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Settings className="h-4 w-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Save Configuration'}
                    </button>

                    {isConfigured && (
                        <button
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {isTesting ? (
                                <Loader className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            {isTesting ? 'Testing...' : 'Test Connection'}
                        </button>
                    )}
                </div>

                {/* Success/Error Messages */}
                {success && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                        <div className="flex">
                            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                            <p className="text-sm text-green-700">{success}</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}