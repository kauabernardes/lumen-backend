export class AskDto {
  title: string;
  context: string;
  question: string;
  difficulty: 'fácil' | 'médio' | 'difícil';
}
