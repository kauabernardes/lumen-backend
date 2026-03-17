import { SessionParticipant } from '../types/session-participant';
import { PomodoroState } from './pomodoro-state';

export interface SessionState {
  hostId: string;
  createdAt: Date;
  participants: SessionParticipant;
  pomodoro: PomodoroState;
  pendingDestructionTimeout?: NodeJS.Timeout;
}
