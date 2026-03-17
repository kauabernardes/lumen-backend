export class SessionParticipant extends Map<
  string,
  {
    socketId: string;
    participantId: string;
    userId: string;
    username: string;
    joinedAt: Date;
  }
> {}
