import { LLMConfig, ParsedResume } from '../../types';

export interface LLMClient {
    parseResume(resumeText: string): Promise<ParsedResume>;
    generateCoverLetter(resume: ParsedResume, jobDescription: string): Promise<string>;
    testConnection(): Promise<boolean>;
}

export interface LLMResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export class LLMError extends Error {
    constructor(
        message: string,
        public provider: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'LLMError';
    }
}

export const RESUME_PARSING_PROMPT = `
You are an AI assistant that extracts structured information from resumes. 
Parse the following resume text and return ONLY a valid JSON object with this exact structure:

{
  "personalInfo": {
    "name": "Full Name",
    "email": "email@example.com",
    "phone": "phone number or null",
    "location": "city, state/country or null"
  },
  "experience": [
    {
      "company": "Company Name",
      "position": "Job Title",
      "duration": "Start Date - End Date",
      "description": "Brief description of role and achievements"
    }
  ],
  "education": [
    {
      "institution": "School/University Name",
      "degree": "Degree Type and Major",
      "year": "Graduation Year"
    }
  ],
  "skills": ["skill1", "skill2", "skill3"]
}

Important:
- Return ONLY the JSON object, no additional text
- If information is missing, use null or empty arrays
- Extract all relevant skills mentioned in the resume
- Include all work experience entries
- Be precise with dates and company names

Resume text:
`;

export const COVER_LETTER_PROMPT = `
You are an AI assistant that writes professional cover letters. 
Create a personalized cover letter based on the candidate's resume and the job description.

The cover letter should:
- Be professional and engaging
- Highlight relevant experience and skills
- Show enthusiasm for the role and company
- Be 3-4 paragraphs long
- Not exceed 400 words

Candidate Resume Information:
`;