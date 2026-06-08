import type { AppData } from '@aloft/types';
import Fastify from 'fastify';
import { authPlugin } from './auth.js';
import { readAppData, writeAppData } from './data.js';

const server = Fastify({ logger: true });

await server.register(authPlugin);

server.get('/api/data', async () => {
    return readAppData();
});

const bodySchema = {
    body: {
        type: 'object',
        required: ['flights'],
        properties: {
            flights: { type: 'array' },
        },
    },
};

server.put<{ Body: AppData }>('/api/data', { schema: bodySchema }, async (request) => {
    await writeAppData(request.body);
    return request.body;
});

const start = async () => {
    try {
        await server.listen({ port: 3001, host: '127.0.0.1' });
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
