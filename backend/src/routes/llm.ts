import express from 'express';
import { llmService } from '../services/llm';
import { authenticateToken } from '../middleware/auth';
import { LLMConfig } from '../types';

const router = express.Router();

// Get current LLM configuration
router.get('/config', authenticateToken, async (req, res) => {
    try {
        const config = llmService.getConfig();

        // Don't return sensitive information like API keys
        const safeConfig = config ? {
            provider: config.provider,
            model: config.model,
            endpoint: config.endpoint, // Only relevant for Ollama
            configured: true
        } : {
            configured: false
        };

        return res.json(safeConfig);
    } catch (error) {
        console.error('Error getting LLM config:', error);
        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get LLM configuration',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Update LLM configuration
router.put('/config', authenticateToken, async (req, res) => {
    try {
        const config: LLMConfig = req.body;

        // Validate configuration
        const validation = llmService.validateConfig(config);
        if (!validation.valid) {
            return res.status(400).json({
                error: {
                    code: 'INVALID_CONFIG',
                    message: validation.error,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Update configuration
        llmService.updateConfig(config);

        // Test connection
        const connectionTest = await llmService.testConnection();

        return res.json({
            message: 'LLM configuration updated successfully',
            connectionTest,
            config: {
                provider: config.provider,
                model: config.model,
                endpoint: config.endpoint,
                configured: true
            }
        });
    } catch (error) {
        console.error('Error updating LLM config:', error);

        if (error instanceof Error) {
            return res.status(400).json({
                error: {
                    code: 'CONFIG_ERROR',
                    message: error.message,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update LLM configuration',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Test LLM connection
router.post('/test-connection', authenticateToken, async (req, res) => {
    try {
        if (!llmService.isConfigured()) {
            return res.status(400).json({
                error: {
                    code: 'NOT_CONFIGURED',
                    message: 'LLM service is not configured',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const connectionTest = await llmService.testConnection();

        return res.json({
            connected: connectionTest,
            message: connectionTest ? 'Connection successful' : 'Connection failed'
        });
    } catch (error) {
        console.error('Error testing LLM connection:', error);
        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to test LLM connection',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Get supported providers and models
router.get('/providers', authenticateToken, async (req, res) => {
    try {
        const providers = {
            openai: {
                name: 'OpenAI',
                requiresApiKey: true,
                models: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo-preview']
            },
            claude: {
                name: 'Anthropic Claude',
                requiresApiKey: true,
                models: ['claude-3-haiku-20240307', 'claude-3-sonnet-20240229', 'claude-3-opus-20240229']
            },
            gemini: {
                name: 'Google Gemini',
                requiresApiKey: true,
                models: ['gemini-pro', 'gemini-pro-vision']
            },
            ollama: {
                name: 'Ollama (Local)',
                requiresEndpoint: true,
                models: ['llama2', 'codellama', 'mistral', 'neural-chat', 'starling-lm']
            }
        };

        const supportedFileTypes = llmService.getSupportedFileTypes();

        return res.json({
            providers,
            supportedFileTypes
        });
    } catch (error) {
        console.error('Error getting LLM providers:', error);
        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get LLM providers',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

export default router;