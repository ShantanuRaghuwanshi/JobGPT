import { ProfileService } from '../profile';
import { UserProfileRepository } from '../../database/repositories/userProfile';
import { UserProfile, ExperienceLevel } from '../../types/database';
import fs from 'fs/promises';
import path from 'path';

// Mock the repository
jest.mock('../../database/repositories/userProfile');
jest.mock('fs/promises');

const MockedUserProfileRepository = UserProfileRepository as jest.MockedClass<typeof UserProfileRepository>;
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('ProfileService', () => {
    let profileService: ProfileService;
    let mockRepository: jest.Mocked<UserProfileRepository>;

    const mockProfile: UserProfile = {
        id: 'profile-1',
        userId: 'user-1',
        name: 'John Doe',
        age: 30,
        location: 'New York',
        resumeId: 'resume-123.pdf',
        skills: ['JavaScript', 'TypeScript', 'React'],
        experienceLevel: 'mid' as ExperienceLevel,
        preferences: {
            locations: ['New York', 'San Francisco'],
            experienceLevels: ['mid', 'senior'],
            keywords: ['frontend', 'react'],
            remoteWork: true,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRepository = new MockedUserProfileRepository() as jest.Mocked<UserProfileRepository>;
        profileService = new ProfileService();
        (profileService as any).userProfileRepository = mockRepository;
    });

    describe('getProfile', () => {
        it('should return user profile when found', async () => {
            mockRepository.findByUserId.mockResolvedValue(mockProfile);

            const result = await profileService.getProfile('user-1');

            expect(result).toEqual(mockProfile);
            expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-1');
        });

        it('should return null when profile not found', async () => {
            mockRepository.findByUserId.mockResolvedValue(null);

            const result = await profileService.getProfile('user-1');

            expect(result).toBeNull();
            expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-1');
        });

        it('should throw error when repository fails', async () => {
            mockRepository.findByUserId.mockRejectedValue(new Error('Database error'));

            await expect(profileService.getProfile('user-1')).rejects.toThrow('Failed to fetch user profile');
        });
    });

    describe('updateProfile', () => {
        const updates = {
            name: 'Jane Doe',
            age: 25,
            skills: ['Python', 'Django'],
        };

        it('should update profile successfully', async () => {
            const updatedProfile = { ...mockProfile, ...updates };
            mockRepository.findByUserId.mockResolvedValue(mockProfile);
            mockRepository.updateProfile.mockResolvedValue(updatedProfile);

            const result = await profileService.updateProfile('user-1', updates);

            expect(result).toEqual(updatedProfile);
            expect(mockRepository.findByUserId).toHaveBeenCalledWith('user-1');
            expect(mockRepository.updateProfile).toHaveBeenCalledWith('user-1', updates);
        });

        it('should throw error when profile not found', async () => {
            mockRepository.findByUserId.mockResolvedValue(null);

            await expect(profileService.updateProfile('user-1', updates)).rejects.toThrow('User profile not found');
        });

        it('should throw error when update fails', async () => {
            mockRepository.findByUserId.mockResolvedValue(mockProfile);
            mockRepository.updateProfile.mockResolvedValue(null);

            await expect(profileService.updateProfile('user-1', updates)).rejects.toThrow('Failed to update user profile');
        });
    });

    describe('uploadResume', () => {
        const mockFile: Express.Multer.File = {
            fieldname: 'resume',
            originalname: 'resume.pdf',
            encoding: '7bit',
            mimetype: 'application/pdf',
            size: 1024 * 1024, // 1MB
            buffer: Buffer.from('mock file content'),
            destination: '',
            filename: '',
            path: '',
            stream: {} as any,
        };

        beforeEach(() => {
            mockedFs.access.mockResolvedValue();
            mockedFs.writeFile.mockResolvedValue();
            mockRepository.findByUserId.mockResolvedValue(mockProfile);
            mockRepository.updateProfile.mockResolvedValue(mockProfile);
        });

        it('should upload resume successfully', async () => {
            const result = await profileService.uploadResume('user-1', mockFile);

            expect(result).toMatch(/^[0-9a-f-]{36}\.pdf$/); // UUID format with .pdf extension
            expect(mockedFs.writeFile).toHaveBeenCalled();
            expect(mockRepository.updateProfile).toHaveBeenCalledWith('user-1', { resumeId: result });
        });

        it('should reject invalid file type', async () => {
            const invalidFile = { ...mockFile, mimetype: 'text/plain' };

            await expect(profileService.uploadResume('user-1', invalidFile)).rejects.toThrow('Invalid file type');
        });

        it('should reject file that is too large', async () => {
            const largeFile = { ...mockFile, size: 10 * 1024 * 1024 }; // 10MB

            await expect(profileService.uploadResume('user-1', largeFile)).rejects.toThrow('File size too large');
        });

        it('should handle file write error', async () => {
            mockedFs.writeFile.mockRejectedValue(new Error('Write error'));

            await expect(profileService.uploadResume('user-1', mockFile)).rejects.toThrow('Write error');
        });
    });

    describe('getResumeFile', () => {
        it('should return file buffer when file exists', async () => {
            const mockBuffer = Buffer.from('file content');
            mockedFs.readFile.mockResolvedValue(mockBuffer);

            const result = await profileService.getResumeFile('resume-123.pdf');

            expect(result).toEqual(mockBuffer);
            expect(mockedFs.readFile).toHaveBeenCalledWith(expect.stringContaining('resume-123.pdf'));
        });

        it('should throw error when file not found', async () => {
            mockedFs.readFile.mockRejectedValue(new Error('File not found'));

            await expect(profileService.getResumeFile('resume-123.pdf')).rejects.toThrow('Resume file not found');
        });
    });

    describe('deleteResume', () => {
        beforeEach(() => {
            mockRepository.findByUserId.mockResolvedValue(mockProfile);
            mockedFs.unlink.mockResolvedValue();
            mockRepository.updateProfile.mockResolvedValue({ ...mockProfile, resumeId: undefined });
        });

        it('should delete resume successfully', async () => {
            await profileService.deleteResume('user-1');

            expect(mockedFs.unlink).toHaveBeenCalledWith(expect.stringContaining('resume-123.pdf'));
            expect(mockRepository.updateProfile).toHaveBeenCalledWith('user-1', { resumeId: null });
        });

        it('should throw error when no resume found', async () => {
            mockRepository.findByUserId.mockResolvedValue({ ...mockProfile, resumeId: undefined });

            await expect(profileService.deleteResume('user-1')).rejects.toThrow('No resume found for user');
        });

        it('should handle file deletion error gracefully', async () => {
            mockedFs.unlink.mockRejectedValue(new Error('File not found'));

            // Should not throw error, just log warning
            await expect(profileService.deleteResume('user-1')).resolves.not.toThrow();
            expect(mockRepository.updateProfile).toHaveBeenCalledWith('user-1', { resumeId: null });
        });
    });

    describe('profileExists', () => {
        it('should return true when profile exists', async () => {
            mockRepository.profileExists.mockResolvedValue(true);

            const result = await profileService.profileExists('user-1');

            expect(result).toBe(true);
            expect(mockRepository.profileExists).toHaveBeenCalledWith('user-1');
        });

        it('should return false when profile does not exist', async () => {
            mockRepository.profileExists.mockResolvedValue(false);

            const result = await profileService.profileExists('user-1');

            expect(result).toBe(false);
        });

        it('should return false when repository throws error', async () => {
            mockRepository.profileExists.mockRejectedValue(new Error('Database error'));

            const result = await profileService.profileExists('user-1');

            expect(result).toBe(false);
        });
    });

    describe('utility methods', () => {
        it('should generate correct resume file path', () => {
            const result = profileService.getResumeFilePath('resume-123.pdf');
            expect(result).toContain('resume-123.pdf');
        });

        it('should generate correct resume URL', () => {
            const result = profileService.getResumeUrl('resume-123.pdf');
            expect(result).toBe('/api/profile/resume/resume-123.pdf');
        });
    });
});