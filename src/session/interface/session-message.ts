export interface SessionMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  title?: string;
  subtitle?: string;
  timestamp?: string;
  isAi: boolean;
}
