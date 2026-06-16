import { AskDto } from 'src/ai/dto/ask.dto';

export interface AIState {
  lastAsk: AskDto | null;
  isGenerating?: boolean;
}
