import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { LLMConfig } from '../LLMConfig';

// Mock the API
const mockUpdateConfig = vi.fn();
const mockGetConfig = vi.fn();

vi.mock('../../services/api', () => ({
    api: {
        put: mockUpdateConfig,
        get: mockGetConfig
    }
}));

describe('LLMConfig', () => {
    const mockConfig = {
        provider: 'openai',
        apiKey: 'test-api-key',
        model: 'gpt-3.5-turbo',
        endpoint: '',
        isConfigured: true
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockGetConfig.mockResolvedValue({ data: mockConfig });
    });

    it('should render LLM configuration form', async () => {
        render(<LLMConfig />);

        await waitFor(() => {
            expect(screen.getByText('AI Model Configuration')).toBeInTheDocument();
        });

        expect(screen.getByLabelText(/provider/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/api key/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/model/i)).toBeInTheDocument();
    });

    it('should load existing configuration on mount', async () => {
        render(<LLMConfig />);

        await waitFor(() => {
            expect(mockGetConfig).toHaveBeenCalledWith('/api/config/llm');
        });

        await waitFor(() => {
            expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
            expect(screen.getByDisplayValue('gpt-3.5-turbo')).toBeInTheDocument();
        });
    });

    it('should show different fields based on provider selection', async () => {
        render(<LLMConfig />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
        });

        // Switch to Ollama
        const providerSelect = screen.getByLabelText(/provider/i);
        fireEvent.change(providerSelect, { target: { value: 'ollama' } });

        await waitFor(() => {
            expect(screen.getByLabelText(/endpoint/i)).toBeInTheDocument();
            expect(screen.queryByLabelText(/api key/i)).not.toBeInTheDocument();
        });
    });

    it('should validate required fields', async () => {
        render(<LLMConfig />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
        });

        // Clear API key
        const apiKeyInput = screen.getByLabelText(/api key/i);
        fireEvent.change(apiKeyInput, { target: { value: '' } });

        // Try to save
        const saveButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/api key is required/i)).toBeInTheDocument();
        });

        expect(mockUpdateConfig).not.toHaveBeenCalled();
    });

    it('should save configuration successfully', async () => {
        mockUpdateConfig.mockResolvedValue({ data: { success: true } });

        render(<LLMConfig />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
        });

        // Update model
        const modelInput = screen.getByLabelText(/model/i);
        fireEvent.change(modelInput, { target: { value: 'gpt-4' } });

        // Save configuration
        const saveButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(mockUpdateConfig).toHaveBeenCalledWith('/api/config/llm', {
                provider: 'openai',
                apiKey: 'test-api-key',
                model: 'gpt-4',
                endpoint: ''
            });
        });

        await waitFor(() => {
            expect(screen.getByText(/configuration saved successfully/i)).toBeInTheDocument();
        });
    });

    it('should handle save errors gracefully', async () => {
        mockUpdateConfig.mockRejectedValue(new Error('Network error'));

        render(<LLMConfig />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
        });

        const saveButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(saveButton);

        await waitFor(() => {
            expect(screen.getByText(/failed to save configuration/i)).toBeInTheDocument();
        });
    });

    it('should test connection for Ollama provider', async () => {
        const mockTestConnection = vi.fn().mockResolvedValue({ data: { success: true } });
        mockUpdateConfig.mockImplementation((url, data) => {
            if (url.includes('test')) {
                return mockTestConnection();
            }
            return Promise.resolve({ data: { success: true } });
        });

        render(<LLMConfig />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
        });

        // Switch to Ollama
        const providerSelect = screen.getByLabelText(/provider/i);
        fireEvent.change(providerSelect, { target: { value: 'ollama' } });

        await waitFor(() => {
            expect(screen.getByLabelText(/endpoint/i)).toBeInTheDocument();
        });

        // Set endpoint
        const endpointInput = screen.getByLabelText(/endpoint/i);
        fireEvent.change(endpointInput, { target: { value: 'http://localhost:11434' } });

        // Test connection
        const testButton = screen.getByRole('button', { name: /test connection/i });
        fireEvent.click(testButton);

        await waitFor(() => {
            expect(screen.getByText(/connection successful/i)).toBeInTheDocument();
        });
    });

    it('should show loading state during operations', async () => {
        mockUpdateConfig.mockImplementation(() =>
            new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 100))
        );

        render(<LLMConfig />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
        });

        const saveButton = screen.getByRole('button', { name: /save/i });
        fireEvent.click(saveButton);

        expect(screen.getByText(/saving/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText(/configuration saved successfully/i)).toBeInTheDocument();
        });
    });

    it('should reset form when provider changes', async () => {
        render(<LLMConfig />);

        await waitFor(() => {
            expect(screen.getByDisplayValue('openai')).toBeInTheDocument();
        });

        // Switch to Claude
        const providerSelect = screen.getByLabelText(/provider/i);
        fireEvent.change(providerSelect, { target: { value: 'claude' } });

        await waitFor(() => {
            const modelInput = screen.getByLabelText(/model/i);
            expect(modelInput.value).toBe('claude-3-sonnet-20240229'); // Default Claude model
        });
    });
});