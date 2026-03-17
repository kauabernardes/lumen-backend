export interface PomodoroState {
  timeLeft: number;
  status: 'paused' | 'running';
  phase: 'study' | 'break';
  intervalId?: NodeJS.Timeout;
  cycle: 0 | 1 | 2 | 3 | 4;
}
