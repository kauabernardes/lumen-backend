import { SessionParticipant } from '../types/session-participant';
import { AIState } from './ai-state';
import { PomodoroState } from './pomodoro-state';
import { SessionMessage } from './session-message';

export interface SessionState {
  hostId: string;
  createdAt: Date;
  participants: SessionParticipant;
  pomodoro: PomodoroState;
  pendingDestructionTimeout?: NodeJS.Timeout;
  themes?: string[];
  messages: SessionMessage[];
  ai: AIState;
}
