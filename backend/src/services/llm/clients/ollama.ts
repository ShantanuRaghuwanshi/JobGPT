import axios from 'axios';
import { LLMClient, LLMError, RESUME_PARSING_PROMPT, COVER_LETTER_PROMPT } from '../types';
import { ParsedResume } from '../../../types';

export class OllamaClient implements LLMClient {
    private endpoint: string;
    private model: string;

    constructor(endpoint: string, model: string) {
        this.endpoint = endpoint.endsWith('/') ? endpoint.slice(0, -1) : endpoint;
        this.model = model;
    }

    async parseResume(resumeText: string): Promise<ParsedResume> {
        try {
            const response = await axios.post(`${this.endpoint}/api/generate`, {
                model: this.model,
                prompt: RESUME_PARSING_PROMPT + resumeText,
                stream: false,
                options: {
                    temperature: 0.1,
                    num_predict: 2000
                }
            }, {
                timeout: 60000 // 60 second timeout
            });

            const content = response.data.response;
            if (!content) {
                throw new Error('No response content from Ollama');
            }

            // Try to extract JSON from the response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            return this.validateParsedResume(parsedData);
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new LLMError(
                    `Ollama resume parsing failed: ${error.message}`,
                    'ollama',
                    error
                );
            }
            throw new LLMError(
                `Ollama resume parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'ollama',
                error instanceof Error ? error : undefined
            );
        }
    }

    async generateCoverLetter(resume: ParsedResume, jobDescription: string): Promise<string> {
        try {
            const resumeContext = `
Name: ${resume.personalInfo.name}
Email: ${resume.personalInfo.email}
Location: ${resume.personalInfo.location || 'Not specified'}

Experience:
${resume.experience.map(exp =>
                `- ${exp.position} at ${exp.company} (${exp.duration}): ${exp.description}`
            ).join('\n')}

Education:
${resume.education.map(edu =>
                `- ${edu.degree} from ${edu.institution} (${edu.year})`
            ).join('\n')}

Skills: ${resume.skills.join(', ')}
`;

            const response = await axios.post(`${this.endpoint}/api/generate`, {
                model: this.model,
                prompt: COVER_LETTER_PROMPT + resumeContext + '\n\nJob Description:\n' + jobDescription,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 1000
                }
            }, {
                timeout: 60000 // 60 second timeout
            });

            const content = response.data.response;
            if (!content) {
                throw new Error('No response content from Ollama');
            }

            return content.trim();
        } catch (error) {
            if (axios.isAxiosError(error)) {
                throw new LLMError(
                    `Ollama cover letter generation failed: ${error.message}`,
                    'ollama',
                    error
                );
            }
            throw new LLMError(
                `Ollama cover letter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'ollama',
                error instanceof Error ? error : undefined
            );
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            const response = await axios.post(`${this.endpoint}/api/generate`, {
                model: this.model,
                prompt: 'Hello',
                stream: false,
                options: {
                    num_predict: 5
                }
            }, {
                timeout: 10000 // 10 second timeout for connection test
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    private validateParsedResume(data: any): ParsedResume {
        // Basic validation to ensure required structure
        if (!data.personalInfo || !data.personalInfo.name || !data.personalInfo.email) {
            throw new Error('Invalid resume data: missing required personal information');
        }

        return {
            personalInfo: {
                name: data.personalInfo.name || '',
                email: data.personalInfo.email || '',
                phone: data.personalInfo.phone || null,
                location: data.personalInfo.location || null
            },
            experience: Array.isArray(data.experience) ? data.experience.map((exp: any) => ({
                company: exp.company || '',
                position: exp.position || '',
                duration: exp.duration || '',
                description: exp.description || ''
            })) : [],
            education: Array.isArray(data.education) ? data.education.map((edu: any) => ({
                institution: edu.institution || '',
                degree: edu.degree || '',
                year: edu.year || ''
            })) : [],
            skills: Array.isArray(data.skills) ? data.skills : []
        };
    }
}