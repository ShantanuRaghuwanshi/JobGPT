import { UserProfileRepository } from '../database/repositories/userProfile';
import { UserProfile, UserUpdate } from '../types/database';
import { ParsedResume } from '../types';
import { llmService } from './llm';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class ProfileService {
    private userProfileRepository: UserProfileRepository;
    private uploadsDir: string;

    constructor() {
        this.userProfileRepository = new UserProfileRepository();
        this.uploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
        this.ensureUploadsDirectory();
    }

    private async ensureUploadsDirectory(): Promise<void> {
        try {
            await fs.access(this.uploadsDir);
        } catch {
            await fs.mkdir(this.uploadsDir, { recursive: true });
        }
    }

    public async getProfile(userId: string): Promise<UserProfile | null> {
        try {
            return await this.userProfileRepository.findByUserId(userId);
        } catch (error) {
            console.error('Error fetching user profile:', error);
            throw new Error('Failed to fetch user profile');
        }
    }

    public async createProfile(userId: string, profileData: UserUpdate): Promise<UserProfile> {
        try {
            // Check if profile already exists
            const existingProfile = await this.userProfileRepository.findByUserId(userId);
            if (existingProfile) {
                throw new Error('User profile already exists');
            }

            // Create the profile with default values
            const newProfile = await this.userProfileRepository.createProfile({
                userId,
                name: profileData.name || '',
                age: profileData.age,
                location: profileData.location || '',
                skills: profileData.skills || [],
                experienceLevel: profileData.experienceLevel || 'entry',
                preferences: profileData.preferences || {
                    locations: [],
                    experienceLevels: ['entry'],
                    keywords: [],
                    remoteWork: false,
                },
                resumeId: null,
            });

            return newProfile;
        } catch (error) {
            console.error('Error creating user profile:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to create user profile');
        }
    }

    public async updateProfile(userId: string, updates: UserUpdate): Promise<UserProfile> {
        try {
            // Check if profile exists
            const existingProfile = await this.userProfileRepository.findByUserId(userId);

            if (!existingProfile) {
                throw new Error('User profile not found');
            }

            const updatedProfile = await this.userProfileRepository.updateProfile(userId, updates);

            if (!updatedProfile) {
                throw new Error('Failed to update user profile');
            }

            return updatedProfile;
        } catch (error) {
            console.error('Error updating user profile:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to update user profile');
        }
    }

    public async uploadResume(userId: string, file: Express.Multer.File): Promise<string> {
        try {
            // Validate file type - only support types that LLM service can parse
            const supportedTypes = llmService.getSupportedFileTypes();
            if (!supportedTypes.includes(file.mimetype)) {
                throw new Error(`Invalid file type. Supported types: ${supportedTypes.join(', ')}`);
            }

            // Validate file size (5MB limit)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                throw new Error('File size too large. Maximum size is 5MB.');
            }

            // Generate unique filename
            const fileExtension = path.extname(file.originalname);
            const resumeId = `${uuidv4()}${fileExtension}`;
            const filePath = path.join(this.uploadsDir, resumeId);

            // Save file to disk
            await fs.writeFile(filePath, file.buffer);

            // Update user profile with resume ID
            await this.updateProfile(userId, { resumeId });

            return resumeId;
        } catch (error) {
            console.error('Error uploading resume:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to upload resume');
        }
    }

    public async getResumeFile(resumeId: string): Promise<Buffer> {
        try {
            const filePath = path.join(this.uploadsDir, resumeId);
            return await fs.readFile(filePath);
        } catch (error) {
            console.error('Error reading resume file:', error);
            throw new Error('Resume file not found');
        }
    }

    public async deleteResume(userId: string): Promise<void> {
        try {
            const profile = await this.getProfile(userId);
            if (!profile || !profile.resumeId) {
                throw new Error('No resume found for user');
            }

            // Delete file from disk
            const filePath = path.join(this.uploadsDir, profile.resumeId);
            try {
                await fs.unlink(filePath);
            } catch (error) {
                console.warn('Resume file not found on disk:', error);
            }

            // Remove resume ID from profile
            await this.updateProfile(userId, { resumeId: null });
        } catch (error) {
            console.error('Error deleting resume:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to delete resume');
        }
    }

    public async profileExists(userId: string): Promise<boolean> {
        try {
            return await this.userProfileRepository.profileExists(userId);
        } catch (error) {
            console.error('Error checking profile existence:', error);
            return false;
        }
    }

    public getResumeFilePath(resumeId: string): string {
        return path.join(this.uploadsDir, resumeId);
    }

    public getResumeUrl(resumeId: string): string {
        return `/api/profile/resume/${resumeId}`;
    }

    public async parseResumeWithAI(userId: string): Promise<ParsedResume> {
        try {
            // Check if LLM service is configured
            if (!llmService.isConfigured()) {
                throw new Error('AI service not configured. Please configure LLM settings first.');
            }

            // Get user profile to find resume
            const profile = await this.getProfile(userId);
            if (!profile || !profile.resumeId) {
                throw new Error('No resume found for user');
            }

            // Get resume file
            const resumeBuffer = await this.getResumeFile(profile.resumeId);

            // Determine MIME type from file extension
            const fileExtension = path.extname(profile.resumeId).toLowerCase();
            let mimeType: string;

            if (fileExtension === '.pdf') {
                mimeType = 'application/pdf';
            } else if (fileExtension === '.txt') {
                mimeType = 'text/plain';
            } else {
                throw new Error(`Unsupported file type: ${fileExtension}`);
            }

            // Parse resume using LLM service
            const parsedResume = await llmService.parseResumeFromBuffer(resumeBuffer, mimeType);

            return parsedResume;
        } catch (error) {
            console.error('Error parsing resume with AI:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to parse resume with AI');
        }
    }

    public async updateProfileFromParsedResume(userId: string, parsedResume: ParsedResume): Promise<UserProfile> {
        try {
            // Validate parsed resume data
            this.validateParsedResumeData(parsedResume);

            // Map parsed resume data to profile update format
            const profileUpdates: UserUpdate = {
                name: parsedResume.personalInfo.name,
                skills: parsedResume.skills,
                // Note: We don't update location from resume as it might be outdated
                // Users should manually verify and update location if needed
            };

            // Update the profile
            const updatedProfile = await this.updateProfile(userId, profileUpdates);

            return updatedProfile;
        } catch (error) {
            console.error('Error updating profile from parsed resume:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to update profile from parsed resume');
        }
    }

    public async uploadAndParseResume(userId: string, file: Express.Multer.File): Promise<{
        resumeId: string;
        parsedData?: ParsedResume;
        parseError?: string;
    }> {
        try {
            // First upload the resume
            const resumeId = await this.uploadResume(userId, file);

            // Try to parse the resume if LLM service is configured
            if (llmService.isConfigured()) {
                try {
                    const parsedData = await this.parseResumeWithAI(userId);
                    return { resumeId, parsedData };
                } catch (parseError) {
                    console.warn('Resume parsing failed, but upload succeeded:', parseError);
                    return {
                        resumeId,
                        parseError: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
                    };
                }
            } else {
                return {
                    resumeId,
                    parseError: 'AI service not configured. Resume uploaded but not parsed.'
                };
            }
        } catch (error) {
            console.error('Error uploading and parsing resume:', error);
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('Failed to upload and parse resume');
        }
    }

    private validateParsedResumeData(parsedResume: ParsedResume): void {
        if (!parsedResume.personalInfo?.name) {
            throw new Error('Parsed resume must contain a name');
        }

        if (!parsedResume.personalInfo?.email) {
            throw new Error('Parsed resume must contain an email');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(parsedResume.personalInfo.email)) {
            throw new Error('Parsed resume contains invalid email format');
        }

        // Ensure arrays are properly formatted
        if (!Array.isArray(parsedResume.skills)) {
            throw new Error('Skills must be an array');
        }

        if (!Array.isArray(parsedResume.experience)) {
            throw new Error('Experience must be an array');
        }

        if (!Array.isArray(parsedResume.education)) {
            throw new Error('Education must be an array');
        }
    }

    public async getResumeParsingStatus(userId: string): Promise<{
        hasResume: boolean;
        canParse: boolean;
        llmConfigured: boolean;
        resumeId?: string;
    }> {
        try {
            const profile = await this.getProfile(userId);
            const hasResume = !!(profile?.resumeId);
            const llmConfigured = llmService.isConfigured();

            return {
                hasResume,
                canParse: hasResume && llmConfigured,
                llmConfigured,
                resumeId: profile?.resumeId || undefined
            };
        } catch (error) {
            console.error('Error getting resume parsing status:', error);
            return {
                hasResume: false,
                canParse: false,
                llmConfigured: false
            };
        }
    }
}