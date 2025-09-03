import { ProfileService } from '../profile';
import { LLMService } from '../llm/llmService';
import { UserProfileRepository } from '../../database/repositories/userProfile';
import { mockLLMResponses, createMockProfile } from '../../test/helpers/testData';

jest.mock('../llm/llmService');
jest.mock('../../database/repositories/userProfile');

const MockedLLMService = LLMService as jest.MockedClass<typeof LLMService>;
const MockedUserProfileRepository = UserProfileRepository as jest.MockedClass<typeof UserProfileRepository>;

describe('ProfileService - LLM Integration', () => {
    let profileService: ProfileService;
    let mockLLMService: jest.Mocked<LLMService>;
    let mockUserProfileRepository: jest.Mocked<UserProfileRepository>;

    beforeEach(() => {
        jest.clearAllMocks();

        profileService = new ProfileService();
        mockLLMService = MockedLLMService.prototype as jest.Mocked<LLMService>;
        mockUserProfileRepository = MockedUserProfileRepository.prototype as jest.Mocked<UserProfileRepository>;
    });

    describe('parseResumeWithAI', () => {
        const mockResumeBuffer = Buffer.from('Mock PDF content');
        const mockUserId = 'user-123';

        it('should successfully parse resume using LLM', async () => {
            const mockParsedData = mockLLMResponses.resumeParsing;
            const mockProfile = createMockProfile({ userId: mockUserId });

            mockLLMService.parseResume.mockResolvedValue(mockParsedData);
            mockUserProfileRepository.findByUserId.mockResolvedValue(null);
            mockUserProfileRepository.create.mockResolvedValue(mockProfile);

            const result = await profileService.parseResumeWithAI(mockUserId, mockResumeBuffer);

            expect(mockLLMService.parseResume).toHaveBeenCalledWith(mockResumeBuffer);
            expect(mockUserProfileRepository.create).toHaveBeenCalledWith({
                userId: mockUserId,
                name: mockParsedData.name,
                location: mockParsedData.location,
                skills: mockParsedData.skills,
                experienceLevel: 'mid', // Inferred from experience
                preferences: {
                    locations: [mockParsedData.location],
                    experienceLevels: ['entry', 'mid'],
                    keywords: [],
                    remoteWork: false,
                },
            });
            expect(result).toEqual(mockProfile);
        });

        it('should update existing profile with parsed data', async () => {
            const mockParsedData = mockLLMResponses.resumeParsing;
            const existingProfile = createMockProfile({ userId: mockUserId });
            const updatedProfile = { ...existingProfile, name: mockParsedData.name };

            mockLLMService.parseResume.mockResolvedValue(mockParsedData);
            mockUserProfileRepository.findByUserId.mockResolvedValue(existingProfile);
            mockUserProfileRepository.update.mockResolvedValue(updatedProfile);

            const result = await profileService.parseResumeWithAI(mockUserId, mockResumeBuffer);

            expect(mockUserProfileRepository.update).toHaveBeenCalledWith(existingProfile.id, {
                name: mockParsedData.name,
                location: mockParsedData.location,
                skills: mockParsedData.skills,
                experienceLevel: 'mid',
            });
            expect(result).toEqual(updatedProfile);
        });

        it('should handle LLM parsing errors', async () => {
            mockLLMService.parseResume.mockRejectedValue(new Error('LLM service unavailable'));

            await expect(
                profileService.parseResumeWithAI(mockUserId, mockResumeBuffer)
            ).rejects.toThrow('Failed to parse resume with AI: LLM service unavailable');

            expect(mockUserProfileRepository.create).not.toHaveBeenCalled();
            expect(mockUserProfileRepository.update).not.toHaveBeenCalled();
        });

        it('should infer experience level from work history', async () => {
            const mockParsedDataSenior = {
                ...mockLLMResponses.resumeParsing,
                experience: [
                    {
                        company: 'Company A',
                        title: 'Senior Developer',
                        duration: '2018-2021',
                        description: 'Led development team',
                    },
                    {
                        company: 'Company B',
                        title: 'Tech Lead',
                        duration: '2021-2024',
                        description: 'Managed multiple projects',
                    },
                ],
            };

            mockLLMService.parseResume.mockResolvedValue(mockParsedDataSenior);
            mockUserProfileRepository.findByUserId.mockResolvedValue(null);
            mockUserProfileRepository.create.mockResolvedValue(createMockProfile());

            await profileService.parseResumeWithAI(mockUserId, mockResumeBuffer);

            expect(mockUserProfileRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    experienceLevel: 'senior',
                })
            );
        });
    });

    describe('generateProfileSummary', () => {
        it('should generate AI-powered profile summary', async () => {
            const mockProfile = createMockProfile();
            const mockSummary = 'Experienced full-stack developer with expertise in React and Node.js...';

            mockLLMService.generateText.mockResolvedValue(mockSummary);

            const result = await profileService.generateProfileSummary(mockProfile);

            expect(mockLLMService.generateText).toHaveBeenCalledWith(
                expect.stringContaining('Generate a professional summary')
            );
            expect(result).toBe(mockSummary);
        });

        it('should handle summary generation errors', async () => {
            const mockProfile = createMockProfile();
            mockLLMService.generateText.mockRejectedValue(new Error('Generation failed'));

            await expect(
                profileService.generateProfileSummary(mockProfile)
            ).rejects.toThrow('Failed to generate profile summary');
        });
    });

    describe('suggestSkillsFromResume', () => {
        it('should suggest additional skills based on resume content', async () => {
            const resumeText = 'Worked with React, Node.js, and PostgreSQL. Built REST APIs and responsive UIs.';
            const suggestedSkills = ['REST API', 'Responsive Design', 'PostgreSQL', 'Web Development'];

            mockLLMService.extractSkills.mockResolvedValue(suggestedSkills);

            const result = await profileService.suggestSkillsFromResume(resumeText);

            expect(mockLLMService.extractSkills).toHaveBeenCalledWith(resumeText);
            expect(result).toEqual(suggestedSkills);
        });

        it('should filter out duplicate skills', async () => {
            const resumeText = 'React developer with React experience';
            const suggestedSkills = ['React', 'JavaScript', 'React', 'Frontend'];

            mockLLMService.extractSkills.mockResolvedValue(suggestedSkills);

            const result = await profileService.suggestSkillsFromResume(resumeText);

            expect(result).toEqual(['React', 'JavaScript', 'Frontend']);
        });
    });

    describe('optimizeProfileForJobs', () => {
        it('should suggest profile optimizations based on job market', async () => {
            const mockProfile = createMockProfile();
            const jobTrends = ['TypeScript', 'AWS', 'Docker', 'Microservices'];
            const optimizations = {
                suggestedSkills: ['TypeScript', 'AWS'],
                missingKeywords: ['cloud', 'scalability'],
                recommendations: [
                    'Add TypeScript to your skills',
                    'Consider learning AWS for cloud development',
                ],
            };

            mockLLMService.analyzeJobTrends.mockResolvedValue(jobTrends);
            mockLLMService.generateOptimizations.mockResolvedValue(optimizations);

            const result = await profileService.optimizeProfileForJobs(mockProfile);

            expect(mockLLMService.analyzeJobTrends).toHaveBeenCalledWith(mockProfile.skills);
            expect(mockLLMService.generateOptimizations).toHaveBeenCalledWith(mockProfile, jobTrends);
            expect(result).toEqual(optimizations);
        });
    });
});