export class ValidateResponseDto {
  answerBy: {
    userId: string;
    username: string;
    isCorrect: boolean;
  }[];
  feedback: string;
}
