import type { Flight } from '@aloft/types';
import Fastify from 'fastify';
import { authPlugin } from './auth.js';
import { readUserFlights, writeUserFlights } from './data.js';

interface FlightsBody {
    flights: Flight[];
}

const server = Fastify({ logger: true });

await server.register(authPlugin);

server.get('/api/data', { preHandler: server.authenticate }, async (request) => {
    return readUserFlights(request.user.id);
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

server.put<{ Body: FlightsBody }>('/api/data', { schema: bodySchema, preHandler: server.authenticate }, async (request) => {
    await writeUserFlights(request.user.id, request.body.flights);
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
