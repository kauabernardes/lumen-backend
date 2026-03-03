import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JoinSessionDto } from './dto/join-session.dto';
import { SessionService } from './session.service';

@WebSocketGateway({ cors: true, namespace: '/session' })
export class SessionGateway
  implements OnGatewayDisconnect, OnGatewayConnection
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly sessionService: SessionService) {}

  private activeSessions = new Map<string, any>();

  private socketToUserMap = new Map<
    string,
    { userId: string; sessionId: string }
  >();

  handleConnection(client: Socket) {
    console.log(`Novo cliente conectado: ${client.id}`);
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinSessionDto,
  ) {
    let sessionId: string | null = null;

    for (const [id, session] of this.activeSessions.entries()) {
      if (session.hostId === payload.userId) {
        sessionId = id;
        break;
      }
    }

    if (!sessionId) {
      const existSession = await this.sessionService.online(payload.userId);

      if (existSession) {
        sessionId = existSession;
      } else {
        const newSession = await this.sessionService.create({
          host: { connect: { id: payload.userId } },
        });
        sessionId = newSession.id;
      }

      this.activeSessions.set(sessionId, {
        hostId: payload.userId,
        participants: new Map(),
        pomodoro: {
          timeLeft: 25 * 60,
          status: 'paused',
          intervalId: null,
        },
      });
    }

    client.join(sessionId);

    this.socketToUserMap.set(client.id, { userId: payload.userId, sessionId });
    const sessionState = this.activeSessions.get(sessionId);
    sessionState.participants.set(payload.userId, { socketId: client.id });

    this.server.to(sessionId).emit('user_joined', { userId: payload.userId });

    console.log(
      `[Socket] Usuário ${payload.userId} entrou na sala: ${sessionId}`,
    );

    return {
      success: true,
      sessionId: sessionId,
      pomodoro: sessionState.pomodoro,
    };
  }

  @SubscribeMessage('toggle_timer')
  handleToggleTimer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string; userId: string },
  ) {
    const sessionState = this.activeSessions.get(payload.sessionId);
    if (!sessionState) return { error: 'Sessão não encontrada' };

    if (sessionState.hostId !== payload.userId)
      return { error: 'Apenas o anfitrião pode controlar o relógio' };

    const pomodoro = sessionState.pomodoro;

    if (pomodoro.status === 'running') {
      clearInterval(pomodoro.intervalId);
      pomodoro.status = 'paused';
      pomodoro.intervalId = null;
      this.server
        .to(payload.sessionId)
        .emit('timer_paused', { timeLeft: pomodoro.timeLeft });
      return { success: true, status: 'paused' };
    }

    pomodoro.status = 'running';
    pomodoro.intervalId = setInterval(() => {
      pomodoro.timeLeft -= 1;

      this.server
        .to(payload.sessionId)
        .emit('timer_tick', { timeLeft: pomodoro.timeLeft });

      if (pomodoro.timeLeft <= 0) {
        clearInterval(pomodoro.intervalId);
        pomodoro.status = 'break';
        pomodoro.timeLeft = 5 * 60;
        this.server.to(payload.sessionId).emit('timer_ended', {
          nextPhase: 'break',
          timeLeft: pomodoro.timeLeft,
        });
      }
    }, 1000);

    this.server
      .to(payload.sessionId)
      .emit('timer_started', { timeLeft: pomodoro.timeLeft });
    return { success: true, status: 'running' };
  }

  handleDisconnect(client: Socket) {
    const info = this.socketToUserMap.get(client.id);

    if (info) {
      console.log(
        `[Socket] Usuário ${info.userId} desconectou da sala ${info.sessionId}`,
      );

      this.server.to(info.sessionId).emit('user_left', { userId: info.userId });

      this.socketToUserMap.delete(client.id);
    } else {
      console.log(`Cliente desconectado (sem sala vinculada): ${client.id}`);
    }
  }
}
