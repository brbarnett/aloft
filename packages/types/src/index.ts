export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface Ball {
  id: string;
  name: string;
  tasks: Task[];
  dismissedOn: string | null;
  snoozedUntil: number | null;
}

export interface AppData {
  balls: Ball[];
}
