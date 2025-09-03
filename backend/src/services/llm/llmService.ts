import { LLMConfig, ParsedResume } from '../../types';
import { LLMClient, LLMError } from './types';
import { OpenAIClient } from './clients/openai';
import { ClaudeClient } from './clients/claude';
import { GeminiClient } from './clients/gemini';
import { OllamaClient } from './clients/ollama';
import pdfParse from 'pdf-parse';

export class LLMService {
    private client: LLMClient | null = null;
    private config: LLMConfig | null = null;

    constructor(config?: LLMConfig) {
        if (config) {
            this.updateConfig(config);
        }
    }

    updateConfig(config: LLMConfig): void {
        this.config = config;
        this.client = this.createClient(config);
    }

    private createClient(config: LLMConfig): LLMClient {
        switch (config.provider) {
            case 'openai':
                if (!config.apiKey) {
                    throw new Error('OpenAI API key is required');
                }
                return new OpenAIClient(config.apiKey, config.model);

            case 'claude':
                if (!config.apiKey) {
                    throw new Error('Claude API key is required');
                }
                return new ClaudeClient(config.apiKey, config.model);

            case 'gemini':
                if (!config.apiKey) {
                    throw new Error('Gemini API key is required');
                }
                return new GeminiClient(config.apiKey, config.model);

            case 'ollama':
                if (!config.endpoint) {
                    throw new Error('Ollama endpoint is required');
                }
                return new OllamaClient(config.endpoint, config.model);

            default:
                throw new Error(`Unsupported LLM provider: ${config.provider}`);
        }
    }

    async parseResumeFromBuffer(fileBuffer: Buffer, mimeType: string): Promise<ParsedResume> {
        if (!this.client) {
            throw new Error('LLM client not configured. Please set up LLM configuration first.');
        }

        try {
            let resumeText: string;

            if (mimeType === 'application/pdf') {
                const pdfData = await pdfParse(fileBuffer);
                resumeText = pdfData.text;
            } else if (mimeType === 'text/plain') {
                resumeText = fileBuffer.toString('utf-8');
            } else {
                throw new Error(`Unsupported file type: ${mimeType}`);
            }

            if (!resumeText.trim()) {
                throw new Error('No text content found in the resume file');
            }

            return await this.client.parseResume(resumeText);
        } catch (error) {
            if (error instanceof LLMError) {
                throw error;
            }
            throw new LLMError(
                `Resume parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                this.config?.provider || 'unknown',
                error instanceof Error ? error : undefined
            );
        }
    }

    async parseResumeFromText(resumeText: string): Promise<ParsedResume> {
        if (!this.client) {
            throw new Error('LLM client not configured. Please set up LLM configuration first.');
        }

        if (!resumeText.trim()) {
            throw new Error('Resume text cannot be empty');
        }

        return await this.client.parseResume(resumeText);
    }

    async generateCoverLetter(resume: ParsedResume, jobDescription: string): Promise<string> {
        if (!this.client) {
            throw new Error('LLM client not configured. Please set up LLM configuration first.');
        }

        if (!jobDescription.trim()) {
            throw new Error('Job description cannot be empty');
        }

        return await this.client.generateCoverLetter(resume, jobDescription);
    }

    async testConnection(): Promise<boolean> {
        if (!this.client) {
            return false;
        }

        try {
            return await this.client.testConnection();
        } catch (error) {
            return false;
        }
    }

    getConfig(): LLMConfig | null {
        return this.config;
    }

    isConfigured(): boolean {
        return this.client !== null && this.config !== null;
    }

    getSupportedFileTypes(): string[] {
        return ['application/pdf', 'text/plain'];
    }

    validateConfig(config: LLMConfig): { valid: boolean; error?: string } {
        try {
            switch (config.provider) {
                case 'openai':
                case 'claude':
                case 'gemini':
                    if (!config.apiKey) {
                        return { valid: false, error: `${config.provider} requires an API key` };
                    }
                    break;

                case 'ollama':
                    if (!config.endpoint) {
                        return { valid: false, error: 'Ollama requires an endpoint URL' };
                    }
                    // Basic URL validation
                    try {
                        new URL(config.endpoint);
                    } catch {
                        return { valid: false, error: 'Invalid Ollama endpoint URL' };
                    }
                    break;

                default:
                    return { valid: false, error: `Unsupported provider: ${config.provider}` };
            }

            if (!config.model) {
                return { valid: false, error: 'Model name is required' };
            }

            return { valid: true };
        } catch (error) {
            return {
                valid: false,
                error: error instanceof Error ? error.message : 'Unknown validation error'
            };
        }
    }
}

// Singleton instance for the application
export const llmService = new LLMService();