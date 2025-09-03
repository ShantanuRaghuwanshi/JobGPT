import Anthropic from '@anthropic-ai/sdk';
import { LLMClient, LLMError, RESUME_PARSING_PROMPT, COVER_LETTER_PROMPT } from '../types';
import { ParsedResume } from '../../../types';

export class ClaudeClient implements LLMClient {
    private client: Anthropic;
    private model: string;

    constructor(apiKey: string, model: string = 'claude-3-haiku-20240307') {
        this.client = new Anthropic({ apiKey });
        this.model = model;
    }

    async parseResume(resumeText: string): Promise<ParsedResume> {
        try {
            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: 2000,
                temperature: 0.1,
                messages: [
                    {
                        role: 'user',
                        content: RESUME_PARSING_PROMPT + resumeText
                    }
                ]
            });

            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude');
            }

            // Try to extract JSON from the response
            const jsonMatch = content.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }

            const parsedData = JSON.parse(jsonMatch[0]);
            return this.validateParsedResume(parsedData);
        } catch (error) {
            throw new LLMError(
                `Claude resume parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'claude',
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

            const response = await this.client.messages.create({
                model: this.model,
                max_tokens: 1000,
                temperature: 0.7,
                messages: [
                    {
                        role: 'user',
                        content: COVER_LETTER_PROMPT + resumeContext + '\n\nJob Description:\n' + jobDescription
                    }
                ]
            });

            const content = response.content[0];
            if (content.type !== 'text') {
                throw new Error('Unexpected response type from Claude');
            }

            return content.text.trim();
        } catch (error) {
            throw new LLMError(
                `Claude cover letter generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                'claude',
                error instanceof Error ? error : undefined
            );
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.client.messages.create({
                model: this.model,
                max_tokens: 5,
                messages: [{ role: 'user', content: 'Hello' }]
            });
            return true;
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