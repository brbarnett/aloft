import type { UserProfile } from '@aloft/types';
import FastifyCookie from '@fastify/cookie';
import FastifyJwt from '@fastify/jwt';
import FastifyOAuth2 from '@fastify/oauth2';
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { readAppData, writeAppData } from './data.js';

declare module 'fastify' {
    interface FastifyInstance {
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        payload: { id: string; email: string; name: string; picture: string | null };
        user: { id: string; email: string; name: string; picture: string | null };
    }
}

interface GoogleUserInfo {
    id: string;
    email: string;
    name: string;
    picture: string | null;
}

export const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
    // Validate required env vars before registering any sub-plugins
    for (const key of ['JWT_SECRET', 'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI']) {
        if (!process.env[key]) throw new Error(`Missing required env var: ${key}`);
    }

    await fastify.register(FastifyCookie);

    await fastify.register(FastifyJwt, {
        secret: process.env.JWT_SECRET!,
        cookie: {
            cookieName: 'token',
            signed: false,
        },
    });

    await fastify.register(FastifyOAuth2, {
        name: 'googleOAuth2',
        scope: ['profile', 'email'],
        credentials: {
            client: {
                id: process.env.GOOGLE_CLIENT_ID!,
                secret: process.env.GOOGLE_CLIENT_SECRET!,
            },
            // Workaround: @fastify/oauth2 exports GOOGLE_CONFIGURATION on the default export
            // but the TypeScript types don't reflect it, so we cast to access it.
            auth: (
                FastifyOAuth2 as unknown as { GOOGLE_CONFIGURATION: import('@fastify/oauth2').ProviderConfiguration }
            ).GOOGLE_CONFIGURATION,
        },
        startRedirectPath: '/api/auth/google',
        callbackUri: process.env.GOOGLE_REDIRECT_URI!,
    });

    fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            await request.jwtVerify({ onlyCookie: true });
        } catch {
            return reply.status(401).send({ error: 'Unauthorized' });
        }
    });

    fastify.get('/api/auth/google/callback', async (request, reply) => {
        try {
            const oauthToken = await (
                fastify as FastifyInstance & { googleOAuth2: import('@fastify/oauth2').OAuth2Namespace }
            ).googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request, reply);

            const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${oauthToken.token.access_token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch Google user info');

            const googleUser = (await response.json()) as GoogleUserInfo;

            const appData = await readAppData();

            const profile: UserProfile = {
                id: googleUser.id,
                email: googleUser.email,
                name: googleUser.name,
                picture: googleUser.picture ?? null,
            };
            if (appData.users[profile.id]) {
                appData.users[profile.id].profile = profile;
            } else {
                appData.users[profile.id] = { profile, flights: [] };
            }

            await writeAppData(appData);

            const jwtPayload = {
                id: googleUser.id,
                email: googleUser.email,
                name: googleUser.name,
                picture: googleUser.picture ?? null,
            };

            const token = fastify.jwt.sign(jwtPayload, { expiresIn: '7d' });

            reply.setCookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });

            return reply.redirect('/');
        } catch {
            return reply.redirect('/login?error=auth_failed');
        }
    });

    fastify.post('/api/auth/logout', async (_request, reply) => {
        reply.clearCookie('token', { path: '/' });
        return reply.redirect('/login');
    });

    fastify.get('/api/me', { preHandler: fastify.authenticate }, async (request) => {
        return request.user;
    });
};
