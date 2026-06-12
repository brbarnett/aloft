import type { Flight } from '@aloft/types';
import Fastify from 'fastify';
import { authPlugin } from './auth.js';
import { readUserFlights, writeUserFlights } from './data.js';
import { connect, ping } from './db.js';

interface FlightsBody {
    flights: Flight[];
}

const server = Fastify({ logger: true });

await server.register(authPlugin);

server.get('/api/health', async (_request, reply) => {
    const db = await ping();
    return reply.status(db ? 200 : 503).send({ status: db ? 'ok' : 'error', db: db ? 'ok' : 'unreachable' });
});

server.get('/api/data', { preHandler: (req, reply) => server.authenticate(req, reply) }, async (request) => {
    const flights = await readUserFlights(request.user.id);
    return { flights };
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

server.put<{ Body: FlightsBody }>(
    '/api/data',
    { schema: bodySchema, preHandler: (req, reply) => server.authenticate(req, reply) },
    async (request) => {
        await writeUserFlights(request.user.id, request.body.flights);
        return request.body;
    },
);

const start = async () => {
    try {
        await connect();
        await server.listen({ port: 3001, host: '127.0.0.1' });
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
