import { Request, Response, NextFunction } from 'express';
import { validateRequest, ValidationRule } from '../validation';

describe('Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            body: {},
            query: {},
            params: {}
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        mockNext = jest.fn();
    });

    describe('validateRequest', () => {
        it('should pass validation for valid data', () => {
            const rules: ValidationRule[] = [
                { field: 'email', required: true, type: 'email' },
                { field: 'name', required: true, type: 'string', minLength: 2 }
            ];

            mockRequest.body = {
                email: 'test@example.com',
                name: 'John Doe'
            };

            const middleware = validateRequest(rules);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should fail validation for missing required fields', () => {
            const rules: ValidationRule[] = [
                { field: 'email', required: true, type: 'email' },
                { field: 'name', required: true, type: 'string' }
            ];

            mockRequest.body = {
                email: 'test@example.com'
                // name is missing
            };

            const middleware = validateRequest(rules);

            expect(() => {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }).toThrow('Validation failed: name is required');
        });

        it('should fail validation for invalid email format', () => {
            const rules: ValidationRule[] = [
                { field: 'email', required: true, type: 'email' }
            ];

            mockRequest.body = {
                email: 'invalid-email'
            };

            const middleware = validateRequest(rules);

            expect(() => {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }).toThrow('Validation failed: email must be of type email');
        });

        it('should fail validation for string length constraints', () => {
            const rules: ValidationRule[] = [
                { field: 'name', required: true, type: 'string', minLength: 5, maxLength: 10 }
            ];

            mockRequest.body = {
                name: 'Jo' // Too short
            };

            const middleware = validateRequest(rules);

            expect(() => {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }).toThrow('Validation failed: name must be at least 5 characters long');
        });

        it('should fail validation for number range constraints', () => {
            const rules: ValidationRule[] = [
                { field: 'age', required: true, type: 'number', min: 18, max: 65 }
            ];

            mockRequest.body = {
                age: 16 // Too young
            };

            const middleware = validateRequest(rules);

            expect(() => {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }).toThrow('Validation failed: age must be at least 18');
        });

        it('should fail validation for pattern mismatch', () => {
            const rules: ValidationRule[] = [
                { field: 'phone', required: true, type: 'string', pattern: /^\d{10}$/ }
            ];

            mockRequest.body = {
                phone: '123-456-7890' // Doesn't match pattern
            };

            const middleware = validateRequest(rules);

            expect(() => {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }).toThrow('Validation failed: phone format is invalid');
        });

        it('should fail validation for custom validation function', () => {
            const rules: ValidationRule[] = [
                {
                    field: 'password',
                    required: true,
                    type: 'string',
                    custom: (value: string) => {
                        if (!/[A-Z]/.test(value)) {
                            return 'Password must contain at least one uppercase letter';
                        }
                        return true;
                    }
                }
            ];

            mockRequest.body = {
                password: 'lowercase123'
            };

            const middleware = validateRequest(rules);

            expect(() => {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }).toThrow('Validation failed: Password must contain at least one uppercase letter');
        });

        it('should validate array fields', () => {
            const rules: ValidationRule[] = [
                { field: 'skills', required: true, type: 'array', minLength: 1, maxLength: 5 }
            ];

            mockRequest.body = {
                skills: [] // Empty array
            };

            const middleware = validateRequest(rules);

            expect(() => {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }).toThrow('Validation failed: skills must contain at least 1 items');
        });

        it('should skip validation for optional empty fields', () => {
            const rules: ValidationRule[] = [
                { field: 'email', required: true, type: 'email' },
                { field: 'phone', required: false, type: 'string', pattern: /^\d{10}$/ }
            ];

            mockRequest.body = {
                email: 'test@example.com'
                // phone is optional and not provided
            };

            const middleware = validateRequest(rules);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });

        it('should validate query parameters when location is set to query', () => {
            const rules: ValidationRule[] = [
                { field: 'page', required: true, type: 'number', min: 1 }
            ];

            mockRequest.query = {
                page: '0' // Invalid page number
            };

            const middleware = validateRequest(rules, 'query');

            expect(() => {
                middleware(mockRequest as Request, mockResponse as Response, mockNext);
            }).toThrow('Validation failed: page must be of type number');
        });
    });
});