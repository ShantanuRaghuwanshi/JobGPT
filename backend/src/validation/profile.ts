import Joi from 'joi';
import { ExperienceLevel } from '../types/database';

const experienceLevels: ExperienceLevel[] = ['entry', 'mid', 'senior', 'lead'];

export const profileUpdateSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 100 characters',
        }),
    age: Joi.number()
        .integer()
        .min(16)
        .max(100)
        .messages({
            'number.base': 'Age must be a number',
            'number.integer': 'Age must be a whole number',
            'number.min': 'Age must be at least 16',
            'number.max': 'Age cannot exceed 100',
        }),
    location: Joi.string()
        .min(2)
        .max(100)
        .messages({
            'string.min': 'Location must be at least 2 characters long',
            'string.max': 'Location cannot exceed 100 characters',
        }),
    skills: Joi.array()
        .items(Joi.string().min(1).max(50))
        .max(50)
        .messages({
            'array.max': 'Cannot have more than 50 skills',
            'string.min': 'Each skill must be at least 1 character long',
            'string.max': 'Each skill cannot exceed 50 characters',
        }),
    experienceLevel: Joi.string()
        .valid(...experienceLevels)
        .messages({
            'any.only': `Experience level must be one of: ${experienceLevels.join(', ')}`,
        }),
    preferences: Joi.object({
        locations: Joi.array()
            .items(Joi.string().min(2).max(100))
            .max(20)
            .messages({
                'array.max': 'Cannot have more than 20 preferred locations',
                'string.min': 'Each location must be at least 2 characters long',
                'string.max': 'Each location cannot exceed 100 characters',
            }),
        experienceLevels: Joi.array()
            .items(Joi.string().valid(...experienceLevels))
            .max(4)
            .messages({
                'array.max': 'Cannot select more than 4 experience levels',
                'any.only': `Each experience level must be one of: ${experienceLevels.join(', ')}`,
            }),
        keywords: Joi.array()
            .items(Joi.string().min(1).max(50))
            .max(30)
            .messages({
                'array.max': 'Cannot have more than 30 keywords',
                'string.min': 'Each keyword must be at least 1 character long',
                'string.max': 'Each keyword cannot exceed 50 characters',
            }),
        salaryRange: Joi.object({
            min: Joi.number()
                .integer()
                .min(0)
                .messages({
                    'number.base': 'Minimum salary must be a number',
                    'number.integer': 'Minimum salary must be a whole number',
                    'number.min': 'Minimum salary cannot be negative',
                }),
            max: Joi.number()
                .integer()
                .min(Joi.ref('min'))
                .messages({
                    'number.base': 'Maximum salary must be a number',
                    'number.integer': 'Maximum salary must be a whole number',
                    'number.min': 'Maximum salary must be greater than or equal to minimum salary',
                }),
        }).and('min', 'max'),
        remoteWork: Joi.boolean()
            .messages({
                'boolean.base': 'Remote work preference must be true or false',
            }),
    }),
});

export const validateInput = (schema: Joi.ObjectSchema) => {
    return (req: any, res: any, next: any) => {
        console.log('Validating request body:', JSON.stringify(req.body, null, 2));

        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
                value: detail.context?.value,
            }));

            console.error('Validation failed:', validationErrors);

            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: validationErrors,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        console.log('Validation passed');
        next();
    };
};