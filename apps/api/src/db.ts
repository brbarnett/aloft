import { type Db, MongoClient } from 'mongodb';

let db: Db | null = null;

export const connect = async (): Promise<void> => {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('Missing required env var: MONGODB_URI');
    const client = new MongoClient(uri);
    await client.connect();
    db = client.db();
};

export const getDb = (): Db => {
    if (!db) throw new Error('Database not connected');
    return db;
};

export const ping = async (): Promise<boolean> => {
    try {
        await getDb().command({ ping: 1 });
        return true;
    } catch {
        return false;
    }
};
