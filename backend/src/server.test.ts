import request from 'supertest';
import app from './server';

describe('Server', () => {
    it('should respond to health check', async () => {
        const response = await request(app)
            .get('/api/health')
            .expect(200);

        expect(response.body).toHaveProperty('status', 'OK');
        expect(response.body).toHaveProperty('timestamp');
    });

    it('should return 404 for unknown routes', async () => {
        const response = await request(app)
            .get('/api/unknown')
            .expect(404);

        expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
});