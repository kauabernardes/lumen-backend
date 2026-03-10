import { PomodoroState } from './pomodoro-state';

export interface SessionState {
  hostId: string;
  participants: Map<string, { socketId: string }>;
  pomodoro: PomodoroState;
  pendingDestructionTimeout?: NodeJS.Timeout;
}
