import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from 'src/schema/session.entity';
import { ParticipantSession } from 'src/schema/participant-session.entity';
import { SessionState } from './interface/session-state';
import { Server } from 'socket.io';
import { POMODORO } from './session.constants';
import { UserService } from 'src/user/user.service';
import { v7 } from 'uuid';
import { SessionParticipant } from './types/session-participant';
import { PomodoroState } from './interface/pomodoro-state';

@Injectable()
export class SessionService {
  public activeSessions: Map<string, SessionState> = new Map<
    string,
    SessionState
  >();
  private wsServer: Server;

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRepository(ParticipantSession)
    private readonly participantSessionRepository: Repository<ParticipantSession>,
    private readonly userService: UserService,
  ) {}

  injectWebSocketServer(server: Server) {
    this.wsServer = server;
  }

  async online(userId: string): Promise<string | null> {
    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.hostId === userId) {
        return sessionId;
      }
    }
    return null;
  }

  async saveFinishedSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (!session) return;

    try {
      await this.sessionRepository.update(sessionId, {
        finishedAt: new Date(),
      });
    } catch (error) {
      console.error('Erro ao salvar sessão finalizada:', error);
    }
  }

  async joinSession(
    userId: string,
    socketId: string,
    requestedSessionId: string | null = null,
  ) {
    let sessionId = requestedSessionId;

    if (!sessionId) {
      sessionId = v7();
      this.activeSessions.set(sessionId, {
        hostId: userId,
        participants: new SessionParticipant(),
        createdAt: new Date(),

        pomodoro: {
          timeLeft: POMODORO.TEMPO_ESTUDO,
          status: 'paused',
          phase: 'study',
          cycle: 0,
        },
      });

      try {
        const newSession = this.sessionRepository.create({
          id: sessionId,
          host: { id: userId },
          createdAt: new Date(),
        });
        await this.sessionRepository.save(newSession);
      } catch (error) {
        console.error('Erro ao salvar sessão finalizada:', error);
      }
    }

    if (!this.activeSessions.has(sessionId)) {
      throw new NotFoundException('Sessão não encontrada');
    }
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const sessionState = this.activeSessions.get(sessionId);

    if (sessionState && sessionState.pendingDestructionTimeout) {
      clearTimeout(sessionState.pendingDestructionTimeout);
      sessionState.pendingDestructionTimeout = undefined;
    }

    const sessionParticipantId = v7();

    try {
      const newParticipant = this.participantSessionRepository.create({
        sessionId: sessionId,
        userId: userId,
        time: 0,
        id: sessionParticipantId,
      });
      await this.participantSessionRepository.save(newParticipant);
    } catch (error) {
      console.error('Erro ao salvar participante da sessão:', error);
    }

    sessionState?.participants.set(userId, {
      socketId: socketId,
      participantId: sessionParticipantId,
      userId: userId,
      username: user.username,
      joinedAt: new Date(),
    });
    this.wsServer
      .to(sessionId)
      .emit('user_joined', { userId, username: user.username });

    // Notifica todos sobre a nova lista de participantes
    this.broadcastParticipants(sessionId);

    console.log(
      `[Socket] Usuário ${userId} ${user.username} ingressou na sala ${sessionId}`,
    );

    return {
      success: true,
      sessionId,
      pomodoro: { ...sessionState?.pomodoro, intervalId: undefined },
    };
  }

  async handleUserDisconnect(sessionId: string, userId: string) {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) return;

    const updateUser = sessionState.participants.get(userId);

    if (updateUser) {
      const timeInSession = Math.floor(
        (Date.now().valueOf() - updateUser.joinedAt.valueOf()) / 1000,
      );

      try {
        await this.participantSessionRepository.update(
          updateUser.participantId,
          {
            time: timeInSession,
          },
        );
      } catch (error) {
        console.error(
          'Erro ao atualizar tempo do participante da sessão:',
          error,
        );
      }
    }

    sessionState.participants.delete(userId);
    this.wsServer.to(sessionId).emit('user_left', { userId });

    // Notifica todos sobre a nova lista de participantes
    this.broadcastParticipants(sessionId);

    if (sessionState.participants.size === 0) {
      sessionState.pendingDestructionTimeout = setTimeout(async () => {
        const currentSession = this.activeSessions.get(sessionId);
        if (currentSession && currentSession.participants.size === 0) {
          await this.saveFinishedSession(sessionId);
          if (currentSession.pomodoro.intervalId) {
            clearInterval(currentSession.pomodoro.intervalId);
          }
          this.activeSessions.delete(sessionId);
          console.log(`[Socket] Sessão ${sessionId} permanentemente removida.`);
        }
      }, POMODORO.TEMPO_INATIVIDADE);
    }
  }

  toggleTimer(sessionId: string, userId: string) {
    const session = this.getSessionAndValidateHost(sessionId, userId);
    const pomodoro = session.pomodoro;

    if (pomodoro.status === 'running') {
      this.pauseTimer(pomodoro);
      this.broadcastTimerState(sessionId, pomodoro);
      return;
    }

    pomodoro.status = 'running';
    pomodoro.intervalId = setInterval(
      () => this.handleTick(sessionId, pomodoro),
      1000,
    );
    this.broadcastTimerState(sessionId, pomodoro);
    return;
  }

  forceBreak(sessionId: string, userId: string, type: 'short' | 'long') {
    const session = this.getSessionAndValidateHost(sessionId, userId);
    const pomodoro = session.pomodoro;

    this.pauseTimer(pomodoro);
    pomodoro.phase = 'break';

    if (type === 'long') {
      pomodoro.timeLeft = POMODORO.PAUSA_LONGA;
      pomodoro.cycle = 0;
    } else {
      pomodoro.timeLeft = POMODORO.PAUSA_CURTA;
    }

    this.broadcastTimerState(sessionId, pomodoro);
    return { success: true, status: 'break', timeLeft: pomodoro.timeLeft };
  }

  forceStudy(sessionId: string, userId: string) {
    const session = this.getSessionAndValidateHost(sessionId, userId);
    const pomodoro = session.pomodoro;

    this.pauseTimer(pomodoro);
    pomodoro.phase = 'study';
    pomodoro.timeLeft = POMODORO.TEMPO_ESTUDO;
    pomodoro.cycle = 0;

    this.broadcastTimerState(sessionId, pomodoro);
    return { success: true, status: 'paused', timeLeft: pomodoro.timeLeft };
  }

  private getSessionAndValidateHost(sessionId: string, userId: string) {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new NotFoundException('Sessão não encontrada');
    if (session.hostId !== userId) {
      throw new ForbiddenException(
        'Apenas o anfitrião pode realizar esta ação',
      );
    }
    return session;
  }

  private handleTick(sessionId: string, pomodoro: PomodoroState) {
    pomodoro.timeLeft -= 1;
    this.broadcastTimerState(sessionId, pomodoro);

    if (pomodoro.timeLeft <= 0) {
      this.changePhase(sessionId, pomodoro);
    }
  }

  private changePhase(sessionId: string, pomodoro: PomodoroState) {
    this.pauseTimer(pomodoro);

    if (pomodoro.phase === 'study') {
      pomodoro.phase = 'break';
      pomodoro.cycle += 1;
      pomodoro.timeLeft =
        pomodoro.cycle % POMODORO.CICLOS_PAUSA_LONGA === 0
          ? POMODORO.PAUSA_LONGA
          : POMODORO.PAUSA_CURTA;

      if (pomodoro.cycle % POMODORO.CICLOS_PAUSA_LONGA === 0) {
        pomodoro.cycle = 0;
      }
    } else {
      pomodoro.phase = 'study';
      pomodoro.timeLeft = POMODORO.TEMPO_ESTUDO;
    }

    this.broadcastTimerState(sessionId, pomodoro);
  }

  private pauseTimer(pomodoro: PomodoroState) {
    if (pomodoro.intervalId) clearInterval(pomodoro.intervalId);
    pomodoro.status = 'paused';
    pomodoro.intervalId = undefined;
  }

  private broadcastTimerState(sessionId: string, pomodoro: PomodoroState) {
    this.wsServer.to(sessionId).emit('timer_state', {
      timeLeft: pomodoro.timeLeft,
      phase: pomodoro.phase,
      cycle: pomodoro.cycle,
      status: pomodoro.status,
    });
  }

  /**
   * Retorna a lista de participantes de uma sessão.
   */
  async getParticipants(sessionId: string) {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) {
      throw new NotFoundException('Sessão não encontrada');
    }

    return Array.from(sessionState.participants.values()).map((p) => ({
      userId: p.userId,
      username: p.username,
    }));
  }

  /**
   * Envia a lista de participantes atualizada para todos na sala.
   */
  private broadcastParticipants(sessionId: string) {
    const sessionState = this.activeSessions.get(sessionId);
    if (!sessionState) return;

    const participants = Array.from(sessionState.participants.values()).map(
      (p) => ({
        userId: p.userId,
        username: p.username,
      }),
    );

    this.wsServer.to(sessionId).emit('participants_updated', participants);
  }
}
