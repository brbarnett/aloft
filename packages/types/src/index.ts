export interface Task {
    id: string;
    text: string;
    done: boolean;
    expedite?: boolean;
}

export interface Flight {
    id: string;
    callsign: string;
    name: string;
    tasks: Task[];
    note: string | null;
    dismissedOn: string | null;
    snoozedUntil: number | null;
}

export interface UserProfile {
    id: string;
    email: string;
    name: string;
    picture: string | null;
}

export interface UserRecord {
    profile: UserProfile;
    flights: Flight[];
}

export interface AppData {
    users: Record<string, UserRecord>;
}
