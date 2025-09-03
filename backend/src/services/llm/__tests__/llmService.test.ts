import { LLMService } from '../llmService';
import { LLMConfig, ParsedResume } from '../../../types';
import { LLMError } from '../types';

// Mock the PDF parser
jest.mock('pdf-parse', () => jest.fn());
const mockPdfParse = require('pdf-parse') as jest.MockedFunction<any>;

// Mock the LLM clients
jest.mock('../clients/openai');
jest.mock('../clients/claude');
jest.mock('../clients/gemini');
jest.mock('../clients/ollama');

import { OpenAIClient } from '../clients/openai';
import { ClaudeClient } from '../clients/claude';
import { GeminiClient } from '../clients/gemini';
import { OllamaClient } from '../clients/ollama';

const MockedOpenAIClient = OpenAIClient as jest.MockedClass<typeof OpenAIClient>;
const MockedClaudeClient = ClaudeClient as jest.MockedClass<typeof ClaudeClient>;
const MockedGeminiClient = GeminiClient as jest.MockedClass<typeof GeminiClient>;
const MockedOllamaClient = OllamaClient as jest.MockedClass<typeof OllamaClient>;

describe('LLMService', () => {
    let llmService: LLMService;

    const mockParsedResume: ParsedResume = {
        personalInfo: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            location: 'New York, NY'
        },
        experience: [
            {
                company: 'Tech Corp',
                position: 'Software Engineer',
                duration: '2020-2023',
                description: 'Developed web applications'
            }
        ],
        education: [
            {
                institution: 'University of Tech',
                degree: 'BS Computer Science',
                year: '2020'
            }
        ],
        skills: ['JavaScript', 'TypeScript', 'React']
    };

    beforeEach(() => {
        llmService = new LLMService();
        jest.clearAllMocks();
    });

    describe('Configuration Management', () => {
        it('should create OpenAI client with valid config', () => {
            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-api-key',
                model: 'gpt-3.5-turbo'
            };

            llmService.updateConfig(config);

            expect(MockedOpenAIClient).toHaveBeenCalledWith('test-api-key', 'gpt-3.5-turbo');
            expect(llmService.isConfigured()).toBe(true);
            expect(llmService.getConfig()).toEqual(config);
        });

        it('should create Claude client with valid config', () => {
            const config: LLMConfig = {
                provider: 'claude',
                apiKey: 'test-api-key',
                model: 'claude-3-haiku-20240307'
            };

            llmService.updateConfig(config);

            expect(MockedClaudeClient).toHaveBeenCalledWith('test-api-key', 'claude-3-haiku-20240307');
        });

        it('should create Gemini client with valid config', () => {
            const config: LLMConfig = {
                provider: 'gemini',
                apiKey: 'test-api-key',
                model: 'gemini-pro'
            };

            llmService.updateConfig(config);

            expect(MockedGeminiClient).toHaveBeenCalledWith('test-api-key', 'gemini-pro');
        });

        it('should create Ollama client with valid config', () => {
            const config: LLMConfig = {
                provider: 'ollama',
                endpoint: 'http://localhost:11434',
                model: 'llama2'
            };

            llmService.updateConfig(config);

            expect(MockedOllamaClient).toHaveBeenCalledWith('http://localhost:11434', 'llama2');
        });

        it('should throw error for missing API key', () => {
            const config: LLMConfig = {
                provider: 'openai',
                model: 'gpt-3.5-turbo'
            };

            expect(() => llmService.updateConfig(config)).toThrow('OpenAI API key is required');
        });

        it('should throw error for missing Ollama endpoint', () => {
            const config: LLMConfig = {
                provider: 'ollama',
                model: 'llama2'
            };

            expect(() => llmService.updateConfig(config)).toThrow('Ollama endpoint is required');
        });

        it('should throw error for unsupported provider', () => {
            const config = {
                provider: 'unsupported' as any,
                model: 'test'
            } as LLMConfig;

            expect(() => llmService.updateConfig(config)).toThrow('Unsupported LLM provider: unsupported');
        });
    });

    describe('Configuration Validation', () => {
        it('should validate OpenAI config correctly', () => {
            const validConfig: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-key',
                model: 'gpt-3.5-turbo'
            };

            const result = llmService.validateConfig(validConfig);
            expect(result.valid).toBe(true);
            expect(result.error).toBeUndefined();
        });

        it('should reject config without API key for cloud providers', () => {
            const invalidConfig: LLMConfig = {
                provider: 'openai',
                model: 'gpt-3.5-turbo'
            };

            const result = llmService.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('openai requires an API key');
        });

        it('should validate Ollama config correctly', () => {
            const validConfig: LLMConfig = {
                provider: 'ollama',
                endpoint: 'http://localhost:11434',
                model: 'llama2'
            };

            const result = llmService.validateConfig(validConfig);
            expect(result.valid).toBe(true);
        });

        it('should reject invalid Ollama endpoint URL', () => {
            const invalidConfig: LLMConfig = {
                provider: 'ollama',
                endpoint: 'invalid-url',
                model: 'llama2'
            };

            const result = llmService.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Invalid Ollama endpoint URL');
        });

        it('should reject config without model', () => {
            const invalidConfig = {
                provider: 'openai',
                apiKey: 'test-key'
            } as LLMConfig;

            const result = llmService.validateConfig(invalidConfig);
            expect(result.valid).toBe(false);
            expect(result.error).toBe('Model name is required');
        });
    });

    describe('Resume Parsing', () => {
        let mockClient: any;

        beforeEach(() => {
            mockClient = {
                parseResume: jest.fn().mockResolvedValue(mockParsedResume),
                generateCoverLetter: jest.fn().mockResolvedValue('Generated cover letter'),
                testConnection: jest.fn().mockResolvedValue(true)
            };
            MockedOpenAIClient.mockImplementation(() => mockClient as any);

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-api-key',
                model: 'gpt-3.5-turbo'
            };
            llmService.updateConfig(config);
        });

        it('should parse PDF resume successfully', async () => {
            mockPdfParse.mockResolvedValue({ text: 'Resume content' } as any);

            const pdfBuffer = Buffer.from('fake pdf content');
            const result = await llmService.parseResumeFromBuffer(pdfBuffer, 'application/pdf');

            expect(mockPdfParse).toHaveBeenCalledWith(pdfBuffer);
            expect(mockClient.parseResume).toHaveBeenCalledWith('Resume content');
            expect(result).toEqual(mockParsedResume);
        });

        it('should parse text resume successfully', async () => {
            const textBuffer = Buffer.from('Resume text content');
            const result = await llmService.parseResumeFromBuffer(textBuffer, 'text/plain');

            expect(mockClient.parseResume).toHaveBeenCalledWith('Resume text content');
            expect(result).toEqual(mockParsedResume);
        });

        it('should parse resume from text string', async () => {
            const result = await llmService.parseResumeFromText('Resume text content');

            expect(mockClient.parseResume).toHaveBeenCalledWith('Resume text content');
            expect(result).toEqual(mockParsedResume);
        });

        it('should throw error for unsupported file type', async () => {
            const buffer = Buffer.from('content');

            await expect(
                llmService.parseResumeFromBuffer(buffer, 'application/msword')
            ).rejects.toThrow('Unsupported file type: application/msword');
        });

        it('should throw error for empty resume text', async () => {
            await expect(
                llmService.parseResumeFromText('')
            ).rejects.toThrow('Resume text cannot be empty');
        });

        it('should throw error when client not configured', async () => {
            const unconfiguredService = new LLMService();

            await expect(
                unconfiguredService.parseResumeFromText('content')
            ).rejects.toThrow('LLM client not configured');
        });

        it('should handle LLM parsing errors', async () => {
            mockClient.parseResume.mockRejectedValue(new LLMError('Parsing failed', 'openai'));

            await expect(
                llmService.parseResumeFromText('content')
            ).rejects.toThrow(LLMError);
        });
    });

    describe('Cover Letter Generation', () => {
        let mockClient: any;

        beforeEach(() => {
            mockClient = {
                parseResume: jest.fn().mockResolvedValue(mockParsedResume),
                generateCoverLetter: jest.fn().mockResolvedValue('Generated cover letter'),
                testConnection: jest.fn().mockResolvedValue(true)
            };
            MockedOpenAIClient.mockImplementation(() => mockClient as any);

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-api-key',
                model: 'gpt-3.5-turbo'
            };
            llmService.updateConfig(config);
        });

        it('should generate cover letter successfully', async () => {
            const jobDescription = 'Software Engineer position at Tech Corp';
            const result = await llmService.generateCoverLetter(mockParsedResume, jobDescription);

            expect(mockClient.generateCoverLetter).toHaveBeenCalledWith(mockParsedResume, jobDescription);
            expect(result).toBe('Generated cover letter');
        });

        it('should throw error for empty job description', async () => {
            await expect(
                llmService.generateCoverLetter(mockParsedResume, '')
            ).rejects.toThrow('Job description cannot be empty');
        });

        it('should throw error when client not configured', async () => {
            const unconfiguredService = new LLMService();

            await expect(
                unconfiguredService.generateCoverLetter(mockParsedResume, 'job description')
            ).rejects.toThrow('LLM client not configured');
        });
    });

    describe('Connection Testing', () => {
        it('should test connection successfully', async () => {
            const mockClient = {
                parseResume: jest.fn(),
                generateCoverLetter: jest.fn(),
                testConnection: jest.fn().mockResolvedValue(true)
            };
            MockedOpenAIClient.mockImplementation(() => mockClient as any);

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-api-key',
                model: 'gpt-3.5-turbo'
            };
            llmService.updateConfig(config);

            const result = await llmService.testConnection();

            expect(mockClient.testConnection).toHaveBeenCalled();
            expect(result).toBe(true);
        });

        it('should return false when client not configured', async () => {
            const result = await llmService.testConnection();
            expect(result).toBe(false);
        });

        it('should return false when connection test fails', async () => {
            const mockClient = {
                parseResume: jest.fn(),
                generateCoverLetter: jest.fn(),
                testConnection: jest.fn().mockRejectedValue(new Error('Connection failed'))
            };
            MockedOpenAIClient.mockImplementation(() => mockClient as any);

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-api-key',
                model: 'gpt-3.5-turbo'
            };
            llmService.updateConfig(config);

            const result = await llmService.testConnection();
            expect(result).toBe(false);
        });
    });

    describe('Utility Methods', () => {
        it('should return supported file types', () => {
            const fileTypes = llmService.getSupportedFileTypes();
            expect(fileTypes).toEqual(['application/pdf', 'text/plain']);
        });

        it('should return configuration status', () => {
            expect(llmService.isConfigured()).toBe(false);

            const config: LLMConfig = {
                provider: 'openai',
                apiKey: 'test-api-key',
                model: 'gpt-3.5-turbo'
            };
            llmService.updateConfig(config);

            expect(llmService.isConfigured()).toBe(true);
        });
    });
});