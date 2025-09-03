import { OpenAIClient } from '../clients/openai';
import { LLMError } from '../types';

// Mock OpenAI
const mockCreate = jest.fn();
jest.mock('openai', () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: mockCreate
            }
        }
    }));
});

describe('OpenAIClient', () => {
    let client: OpenAIClient;

    beforeEach(() => {
        client = new OpenAIClient('test-api-key', 'gpt-3.5-turbo');
        mockCreate.mockClear();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('parseResume', () => {
        it('should parse resume successfully', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            personalInfo: {
                                name: 'John Doe',
                                email: 'john@example.com',
                                phone: '+1234567890',
                                location: 'New York, NY'
                            },
                            experience: [{
                                company: 'Tech Corp',
                                position: 'Software Engineer',
                                duration: '2020-2023',
                                description: 'Developed web applications'
                            }],
                            education: [{
                                institution: 'University of Tech',
                                degree: 'BS Computer Science',
                                year: '2020'
                            }],
                            skills: ['JavaScript', 'TypeScript', 'React']
                        })
                    }
                }]
            };

            mockCreate.mockResolvedValue(mockResponse as any);

            const result = await client.parseResume('Resume text content');

            expect(mockCreate).toHaveBeenCalledWith({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'user',
                    content: expect.stringContaining('Resume text content')
                }],
                temperature: 0.1,
                max_tokens: 2000
            });

            expect(result.personalInfo.name).toBe('John Doe');
            expect(result.personalInfo.email).toBe('john@example.com');
            expect(result.experience).toHaveLength(1);
            expect(result.skills).toEqual(['JavaScript', 'TypeScript', 'React']);
        });

        it('should handle JSON wrapped in text', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: `Here is the parsed resume data:
                        {
                            "personalInfo": {
                                "name": "Jane Smith",
                                "email": "jane@example.com",
                                "phone": null,
                                "location": null
                            },
                            "experience": [],
                            "education": [],
                            "skills": ["Python", "Django"]
                        }
                        This completes the parsing.`
                    }
                }]
            };

            mockCreate.mockResolvedValue(mockResponse as any);

            const result = await client.parseResume('Resume text');

            expect(result.personalInfo.name).toBe('Jane Smith');
            expect(result.skills).toEqual(['Python', 'Django']);
        });

        it('should throw error when no response content', async () => {
            const mockResponse = {
                choices: [{
                    message: {}
                }]
            };

            mockCreate.mockResolvedValue(mockResponse as any);

            await expect(client.parseResume('Resume text')).rejects.toThrow(LLMError);
        });

        it('should throw error when no valid JSON found', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: 'This is not JSON content'
                    }
                }]
            };

            mockCreate.mockResolvedValue(mockResponse as any);

            await expect(client.parseResume('Resume text')).rejects.toThrow(LLMError);
        });

        it('should throw error when API call fails', async () => {
            mockCreate.mockRejectedValue(new Error('API Error'));

            await expect(client.parseResume('Resume text')).rejects.toThrow(LLMError);
        });

        it('should validate required personal info', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: JSON.stringify({
                            personalInfo: {
                                name: '',
                                email: ''
                            },
                            experience: [],
                            education: [],
                            skills: []
                        })
                    }
                }]
            };

            mockCreate.mockResolvedValue(mockResponse as any);

            await expect(client.parseResume('Resume text')).rejects.toThrow('Invalid resume data');
        });
    });

    describe('generateCoverLetter', () => {
        const mockResume = {
            personalInfo: {
                name: 'John Doe',
                email: 'john@example.com',
                phone: '+1234567890',
                location: 'New York, NY'
            },
            experience: [{
                company: 'Tech Corp',
                position: 'Software Engineer',
                duration: '2020-2023',
                description: 'Developed web applications'
            }],
            education: [{
                institution: 'University of Tech',
                degree: 'BS Computer Science',
                year: '2020'
            }],
            skills: ['JavaScript', 'TypeScript', 'React']
        };

        it('should generate cover letter successfully', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: 'Dear Hiring Manager,\n\nI am writing to express my interest...'
                    }
                }]
            };

            mockCreate.mockResolvedValue(mockResponse as any);

            const result = await client.generateCoverLetter(mockResume, 'Software Engineer position');

            expect(mockCreate).toHaveBeenCalledWith({
                model: 'gpt-3.5-turbo',
                messages: [{
                    role: 'user',
                    content: expect.stringContaining('Software Engineer position')
                }],
                temperature: 0.7,
                max_tokens: 1000
            });

            expect(result).toBe('Dear Hiring Manager,\n\nI am writing to express my interest...');
        });

        it('should throw error when no response content', async () => {
            const mockResponse = {
                choices: [{
                    message: {}
                }]
            };

            mockCreate.mockResolvedValue(mockResponse as any);

            await expect(
                client.generateCoverLetter(mockResume, 'Job description')
            ).rejects.toThrow(LLMError);
        });

        it('should throw error when API call fails', async () => {
            mockCreate.mockRejectedValue(new Error('API Error'));

            await expect(
                client.generateCoverLetter(mockResume, 'Job description')
            ).rejects.toThrow(LLMError);
        });
    });

    describe('testConnection', () => {
        it('should return true when connection successful', async () => {
            const mockResponse = {
                choices: [{
                    message: {
                        content: 'Hello'
                    }
                }]
            };

            mockCreate.mockResolvedValue(mockResponse as any);

            const result = await client.testConnection();

            expect(result).toBe(true);
            expect(mockCreate).toHaveBeenCalledWith({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: 'Hello' }],
                max_tokens: 5
            });
        });

        it('should return false when connection fails', async () => {
            mockCreate.mockRejectedValue(new Error('Connection failed'));

            const result = await client.testConnection();

            expect(result).toBe(false);
        });
    });
});