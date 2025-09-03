import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';

export interface ValidationRule {
    field: string;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'email' | 'array' | 'object';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    custom?: (value: any) => boolean | string;
}

export const validateRequest = (rules: ValidationRule[], location: 'body' | 'query' | 'params' = 'body') => {
    return (req: Request, res: Response, next: NextFunction) => {
        const data = req[location];
        const errors: string[] = [];

        for (const rule of rules) {
            const value = data[rule.field];
            const fieldName = rule.field;

            // Check required fields
            if (rule.required && (value === undefined || value === null || value === '')) {
                errors.push(`${fieldName} is required`);
                continue;
            }

            // Skip validation if field is not required and empty
            if (!rule.required && (value === undefined || value === null || value === '')) {
                continue;
            }

            // Type validation
            if (rule.type) {
                if (!validateType(value, rule.type)) {
                    errors.push(`${fieldName} must be of type ${rule.type}`);
                    continue;
                }
            }

            // String validations
            if (rule.type === 'string' && typeof value === 'string') {
                if (rule.minLength && value.length < rule.minLength) {
                    errors.push(`${fieldName} must be at least ${rule.minLength} characters long`);
                }
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push(`${fieldName} must be no more than ${rule.maxLength} characters long`);
                }
                if (rule.pattern && !rule.pattern.test(value)) {
                    errors.push(`${fieldName} format is invalid`);
                }
            }

            // Number validations
            if (rule.type === 'number' && typeof value === 'number') {
                if (rule.min !== undefined && value < rule.min) {
                    errors.push(`${fieldName} must be at least ${rule.min}`);
                }
                if (rule.max !== undefined && value > rule.max) {
                    errors.push(`${fieldName} must be no more than ${rule.max}`);
                }
            }

            // Array validations
            if (rule.type === 'array' && Array.isArray(value)) {
                if (rule.minLength && value.length < rule.minLength) {
                    errors.push(`${fieldName} must contain at least ${rule.minLength} items`);
                }
                if (rule.maxLength && value.length > rule.maxLength) {
                    errors.push(`${fieldName} must contain no more than ${rule.maxLength} items`);
                }
            }

            // Custom validation
            if (rule.custom) {
                const customResult = rule.custom(value);
                if (customResult !== true) {
                    errors.push(typeof customResult === 'string' ? customResult : `${fieldName} is invalid`);
                }
            }
        }

        if (errors.length > 0) {
            throw new ValidationError(`Validation failed: ${errors.join(', ')}`);
        }

        next();
    };
};

const validateType = (value: any, type: string): boolean => {
    switch (type) {
        case 'string':
            return typeof value === 'string';
        case 'number':
            return typeof value === 'number' && !isNaN(value);
        case 'boolean':
            return typeof value === 'boolean';
        case 'email':
            return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        case 'array':
            return Array.isArray(value);
        case 'object':
            return typeof value === 'object' && value !== null && !Array.isArray(value);
        default:
            return true;
    }
};

// Common validation rules
export const commonValidations = {
    email: {
        field: 'email',
        required: true,
        type: 'email' as const,
        maxLength: 255
    },
    password: {
        field: 'password',
        required: true,
        type: 'string' as const,
        minLength: 8,
        maxLength: 128
    },
    name: {
        field: 'name',
        required: true,
        type: 'string' as const,
        minLength: 1,
        maxLength: 255
    },
    id: {
        field: 'id',
        required: true,
        type: 'string' as const,
        pattern: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    }
};