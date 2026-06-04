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

export interface AppData {
    flights: Flight[];
}
