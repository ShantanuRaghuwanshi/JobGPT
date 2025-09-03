import Joi from 'joi';
import { validateRequest, commonValidations } from '../middleware/validation';

export const registerSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),
    password: Joi.string()
        .min(8)
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
        .required()
        .messages({
            'string.min': 'Password must be at least 8 characters long',
            'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
            'any.required': 'Password is required',
        }),
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 100 characters',
            'any.required': 'Name is required',
        }),
    location: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Location must be at least 2 characters long',
            'string.max': 'Location cannot exceed 100 characters',
            'any.required': 'Location is required',
        }),
});

export const loginSchema = Joi.object({
    email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required',
        }),
    password: Joi.string()
        .required()
        .messages({
            'any.required': 'Password is required',
        }),
});

export const validateInput = (schema: Joi.ObjectSchema) => {
    return (req: any, res: any, next: any) => {
        const { error } = schema.validate(req.body, { abortEarly: false });

        if (error) {
            const validationErrors = error.details.map(detail => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid input data',
                    details: validationErrors,
                    timestamp: new Date().toISOString(),
                },
            });
        }

        next();
    };
};
// New validation rules using the validation middleware
export const registerValidation = validateRequest([
    commonValidations.email,
    {
        field: 'password',
        required: true,
        type: 'string',
        minLength: 8,
        maxLength: 128,
        custom: (value: string) => {
            const hasUpperCase = /[A-Z]/.test(value);
            const hasLowerCase = /[a-z]/.test(value);
            const hasNumbers = /\d/.test(value);
            const hasSpecialChar = /[@$!%*?&]/.test(value);

            if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
                return 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character';
            }
            return true;
        }
    },
    commonValidations.name,
    {
        field: 'location',
        required: true,
        type: 'string',
        minLength: 2,
        maxLength: 100
    }
]);

export const loginValidation = validateRequest([
    commonValidations.email,
    {
        field: 'password',
        required: true,
        type: 'string'
    }
]);