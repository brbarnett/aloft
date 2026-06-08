import type { AppData, Flight } from '@aloft/types';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const file = join(dir, 'appdata.json');

export const readAppData = async (): Promise<AppData> => {
    try {
        const raw = await readFile(file, 'utf-8');
        return JSON.parse(raw) as AppData;
    } catch {
        return { users: {} };
    }
};

export const writeAppData = async (data: AppData): Promise<void> => {
    await mkdir(dir, { recursive: true });
    await writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
};

export const readUserFlights = async (userId: string): Promise<Flight[]> => {
    const data = await readAppData();
    return data.users[userId]?.flights ?? [];
};

export const writeUserFlights = async (userId: string, flights: Flight[]): Promise<void> => {
    const data = await readAppData();
    if (!data.users[userId]) {
        throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }
    data.users[userId].flights = flights;
    await writeAppData(data);
};
