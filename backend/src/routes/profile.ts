import express from 'express';
import multer from 'multer';
import { ProfileService } from '../services/profile';
import { authenticateToken } from '../middleware/auth';
import { validateInput, profileUpdateSchema } from '../validation/profile';
import path from 'path';
import { UserProfile } from '@/database';

const router = express.Router();
const profileService = new ProfileService();

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only PDF and Word documents are allowed.'));
        }
    },
});

// Create user profile
router.post('/', authenticateToken, validateInput(profileUpdateSchema), async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Check if profile already exists
        const existingProfile = await profileService.getProfile(userId);
        if (existingProfile) {
            return res.status(409).json({
                error: {
                    code: 'PROFILE_EXISTS',
                    message: 'User profile already exists. Use PUT to update.',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const profileData = req.body;
        const newProfile = await profileService.createProfile(userId, profileData);

        return res.status(201).json(newProfile);
    } catch (error) {
        console.error('Error creating profile:', error);
        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create profile',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Get user profile
router.get('/', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const profile = await profileService.getProfile(userId);

        if (!profile) {
            return res.status(404).json({
                error: {
                    code: 'PROFILE_NOT_FOUND',
                    message: 'User profile not found',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        return res.json(profile);
    } catch (error) {
        console.error('Error fetching profile:', error);
        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch profile',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Update user profile
router.put('/', authenticateToken, validateInput(profileUpdateSchema), async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const updates = req.body;

        // Check if profile exists, if not create it first
        const existingProfile = await profileService.getProfile(userId);
        let updatedProfile: UserProfile;

        if (!existingProfile) {
            // Create profile if it doesn't exist
            updatedProfile = await profileService.createProfile(userId, updates);
        } else {
            // Update existing profile
            updatedProfile = await profileService.updateProfile(userId, updates);
        }

        return res.json(updatedProfile);
    } catch (error) {
        console.error('Error updating profile:', error);

        if (error instanceof Error && error.message === 'User profile not found') {
            return res.status(404).json({
                error: {
                    code: 'PROFILE_NOT_FOUND',
                    message: 'User profile not found',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update profile',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Upload resume
router.post('/resume', authenticateToken, upload.single('resume'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: {
                    code: 'NO_FILE_UPLOADED',
                    message: 'No resume file uploaded',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const resumeId = await profileService.uploadResume(userId, req.file);

        return res.json({
            resumeId,
            message: 'Resume uploaded successfully',
            url: profileService.getResumeUrl(resumeId),
        });
    } catch (error) {
        console.error('Error uploading resume:', error);

        if (error instanceof Error) {
            if (error.message.includes('Invalid file type') || error.message.includes('File size too large')) {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_FILE',
                        message: error.message,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to upload resume',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Get resume file
router.get('/resume/:resumeId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { resumeId } = req.params;

        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Verify that the resume belongs to the authenticated user
        const profile = await profileService.getProfile(userId);
        if (!profile || profile.resumeId !== resumeId) {
            return res.status(403).json({
                error: {
                    code: 'FORBIDDEN',
                    message: 'Access denied to this resume',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const fileBuffer = await profileService.getResumeFile(resumeId);
        const fileExtension = path.extname(resumeId);

        // Set appropriate content type
        let contentType = 'application/octet-stream';
        if (fileExtension === '.pdf') {
            contentType = 'application/pdf';
        } else if (fileExtension === '.doc') {
            contentType = 'application/msword';
        } else if (fileExtension === '.docx') {
            contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        }

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `inline; filename="resume${fileExtension}"`,
        });

        return res.send(fileBuffer);
    } catch (error) {
        console.error('Error fetching resume:', error);

        if (error instanceof Error && error.message === 'Resume file not found') {
            return res.status(404).json({
                error: {
                    code: 'RESUME_NOT_FOUND',
                    message: 'Resume file not found',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch resume',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Delete resume
router.delete('/resume', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        await profileService.deleteResume(userId);

        return res.json({
            message: 'Resume deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting resume:', error);

        if (error instanceof Error && error.message === 'No resume found for user') {
            return res.status(404).json({
                error: {
                    code: 'RESUME_NOT_FOUND',
                    message: 'No resume found for user',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete resume',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Upload and parse resume with AI
router.post('/resume/upload-and-parse', authenticateToken, upload.single('resume'), async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        if (!req.file) {
            return res.status(400).json({
                error: {
                    code: 'NO_FILE_UPLOADED',
                    message: 'No resume file uploaded',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const result = await profileService.uploadAndParseResume(userId, req.file);

        return res.json({
            resumeId: result.resumeId,
            parsedData: result.parsedData,
            parseError: result.parseError,
            message: 'Resume uploaded successfully',
            url: profileService.getResumeUrl(result.resumeId),
        });
    } catch (error) {
        console.error('Error uploading and parsing resume:', error);

        if (error instanceof Error) {
            if (error.message.includes('Invalid file type') || error.message.includes('File size too large')) {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_FILE',
                        message: error.message,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to upload and parse resume',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Parse existing resume with AI
router.post('/resume/parse', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const parsedData = await profileService.parseResumeWithAI(userId);

        return res.json({
            parsedData,
            message: 'Resume parsed successfully',
        });
    } catch (error) {
        console.error('Error parsing resume:', error);

        if (error instanceof Error) {
            if (error.message.includes('No resume found')) {
                return res.status(404).json({
                    error: {
                        code: 'RESUME_NOT_FOUND',
                        message: error.message,
                        timestamp: new Date().toISOString(),
                    },
                });
            }

            if (error.message.includes('AI service not configured')) {
                return res.status(400).json({
                    error: {
                        code: 'AI_SERVICE_NOT_CONFIGURED',
                        message: error.message,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to parse resume',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Update profile from parsed resume data
router.post('/resume/apply-parsed-data', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const { parsedData } = req.body;
        if (!parsedData) {
            return res.status(400).json({
                error: {
                    code: 'MISSING_PARSED_DATA',
                    message: 'Parsed resume data is required',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const updatedProfile = await profileService.updateProfileFromParsedResume(userId, parsedData);

        return res.json({
            profile: updatedProfile,
            message: 'Profile updated from parsed resume data',
        });
    } catch (error) {
        console.error('Error updating profile from parsed data:', error);

        if (error instanceof Error) {
            if (error.message.includes('must contain')) {
                return res.status(400).json({
                    error: {
                        code: 'INVALID_PARSED_DATA',
                        message: error.message,
                        timestamp: new Date().toISOString(),
                    },
                });
            }
        }

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to update profile from parsed data',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Get resume parsing status
router.get('/resume/parsing-status', authenticateToken, async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const status = await profileService.getResumeParsingStatus(userId);

        return res.json(status);
    } catch (error) {
        console.error('Error getting resume parsing status:', error);

        return res.status(500).json({
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to get resume parsing status',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

export default router;