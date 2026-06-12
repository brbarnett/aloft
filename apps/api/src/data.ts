import type { Flight, UserProfile } from '@aloft/types';
import { getDb } from './db.js';

interface UserDocument {
    _id: string;
    profile: UserProfile;
    flights: Flight[];
}

const users = () => getDb().collection<UserDocument>('users');

export const readUserFlights = async (userId: string): Promise<Flight[]> => {
    const doc = await users().findOne({ _id: userId });
    return doc?.flights ?? [];
};

export const writeUserFlights = async (userId: string, flights: Flight[]): Promise<void> => {
    const result = await users().updateOne({ _id: userId }, { $set: { flights } });
    if (result.matchedCount === 0) {
        throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
};

export const upsertUserProfile = async (profile: UserProfile): Promise<void> => {
    await users().updateOne(
        { _id: profile.id },
        { $set: { profile }, $setOnInsert: { flights: [] } },
        { upsert: true },
    );
};
