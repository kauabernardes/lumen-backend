export interface PomodoroState {
  timeLeft: number;
  status: 'paused' | 'running'; // Apenas o estado do relógio
  phase: 'study' | 'break'; // A fase atual do ciclo
  intervalId: NodeJS.Timeout | undefined | string | number;
  cycle: 0 | 1 | 2 | 3 | 4; // Vai de 0 a 4
}
