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
import { SessionService } from './session.service';
import { SessionState } from './interface/session-state';

interface JoinSessionDto {
  userId: string;
  sessionId?: string;
}

@WebSocketGateway({ cors: true, namespace: '/session' })
export class SessionGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private activeSessions = new Map<string, SessionState>();
  private socketToUserMap = new Map<
    string,
    { userId: string; sessionId: string }
  >();

  constructor(private readonly sessionService: SessionService) {}

  handleConnection(client: Socket) {
    console.log(`[Socket] Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const info = this.socketToUserMap.get(client.id);

    if (info) {
      console.log(
        `[Socket] Usuário ${info.userId} desconectou da sala ${info.sessionId}`,
      );

      const sessionState = this.activeSessions.get(info.sessionId);

      if (sessionState) {
        // remove o usuário da lista de participantes
        sessionState.participants.delete(info.userId);
        this.server
          .to(info.sessionId)
          .emit('user_left', { userId: info.userId });

        // SE A SALA FICAR VAZIA: Inicia a contagem de 5 minutos
        if (sessionState.participants.size === 0) {
          console.log(
            `[Socket] Sessão ${info.sessionId} vazia. Aguardando 5 minutos para encerramento...`,
          );

          // cria um timeout de 5 minutos para destruir a sessão
          sessionState.pendingDestructionTimeout = setTimeout(
            () => {
              // verifica novamente se a sala continua vazia após os 5 minutos (por segurança)
              const currentSession = this.activeSessions.get(info.sessionId);
              if (currentSession && currentSession.participants.size === 0) {
                this.sessionService.revoke({ id: info.sessionId });

                if (currentSession.pomodoro.intervalId) {
                  clearInterval(currentSession.pomodoro.intervalId);
                }

                this.activeSessions.delete(info.sessionId);
                console.log(
                  `[Socket] Sessão ${info.sessionId} permanentemente removida por inatividade.`,
                );
              }
            },
            25 * 60 * 1000,
          );
        }
      }

      this.socketToUserMap.delete(client.id);
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinSessionDto,
  ) {
    try {
      let sessionId = payload.sessionId;

      // LÓGICA DE CONVIDADO E HOST
      if (sessionId) {
        // se o usuario enviou sessionId, ele está tentando entrar como convidado
        if (!this.activeSessions.has(sessionId)) {
          return { error: 'Sessão ativa não encontrada.' };
        }
      } else {
        // se não enviou sessionId, ele é o host. Busca no DB ou cria.
        const existSession = await this.sessionService.online(payload.userId);

        if (existSession) {
          sessionId = existSession;
        } else {
          const newSession = await this.sessionService.create({
            host: { connect: { id: payload.userId } },
          });
          sessionId = newSession.id;
        }

        // sessão não está em memória ainda, inicializa
        if (!this.activeSessions.has(sessionId)) {
          this.activeSessions.set(sessionId, {
            hostId: payload.userId,
            participants: new Map(),
            pomodoro: {
              timeLeft: 25 * 60,
              status: 'paused',
              phase: 'study',
              intervalId: undefined,
              cycle: 0,
            },
          });
        }
      }

      const sessionState = this.activeSessions.get(sessionId);

      if (sessionState && sessionState.pendingDestructionTimeout) {
        clearTimeout(sessionState.pendingDestructionTimeout);
        sessionState.pendingDestructionTimeout = undefined;
        console.log(
          `[Socket] Usuário entrou. Destruição da sessão ${sessionId} cancelada.`,
        );
      }

      client.join(sessionId);
      this.socketToUserMap.set(client.id, {
        userId: payload.userId,
        sessionId,
      });
      sessionState?.participants.set(payload.userId, { socketId: client.id });

      this.server.to(sessionId).emit('user_joined', { userId: payload.userId });

      return {
        success: true,
        sessionId,
        pomodoro: { ...sessionState?.pomodoro, intervalId: undefined },
      };
    } catch (error) {
      console.error('[Socket Error] Falha ao ingressar na sessão:', error);
      return { error: 'Erro interno ao tentar ingressar na sessão' };
    }
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
      if (pomodoro.intervalId) clearInterval(pomodoro.intervalId);
      pomodoro.status = 'paused';
      pomodoro.intervalId = undefined;

      this.server
        .to(payload.sessionId)
        .emit('timer_paused', { timeLeft: pomodoro.timeLeft });
      return { success: true, status: 'paused' };
    }

    if (pomodoro.intervalId) clearInterval(pomodoro.intervalId);

    pomodoro.status = 'running';
    pomodoro.intervalId = setInterval(() => {
      pomodoro.timeLeft -= 1;

      this.server.to(payload.sessionId).emit('timer_tick', {
        timeLeft: pomodoro.timeLeft,
        phase: pomodoro.phase,
        cycle: pomodoro.cycle,
      });

      // QUANDO O TEMPO ZERA
      if (pomodoro.timeLeft <= 0) {
        clearInterval(pomodoro.intervalId);

        // relógio pausa esperando o usuário iniciar a próxima fase
        pomodoro.status = 'paused';

        if (pomodoro.phase === 'study') {
          // terminou um bloco de estudo, inicia a pausa
          pomodoro.phase = 'break';
          pomodoro.cycle += 1;

          // completou 4 ciclos
          if (pomodoro.cycle >= 4) {
            pomodoro.timeLeft = 15 * 60; // pausa longa
            pomodoro.cycle = 0; // reinicia ciclo
          } else {
            pomodoro.timeLeft = 5 * 60; // pausa curta)
          }
        } else if (pomodoro.phase === 'break') {
          // Terminou a pausa, volta para o estudo
          pomodoro.phase = 'study';
          pomodoro.timeLeft = 25 * 60; // 25 minutos
        }

        // emite que o ciclo mudou
        this.server.to(payload.sessionId).emit('timer_ended', {
          nextPhase: pomodoro.phase,
          timeLeft: pomodoro.timeLeft,
          cycle: pomodoro.cycle,
        });
      }
    }, 1000);

    this.server
      .to(payload.sessionId)
      .emit('timer_started', { timeLeft: pomodoro.timeLeft });
    return { success: true, status: 'running' };
  }

  @SubscribeMessage('force_break')
  handleForceBreak(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { sessionId: string; userId: string; type: 'short' | 'long' },
  ) {
    const sessionState = this.activeSessions.get(payload.sessionId);

    if (!sessionState) return { error: 'Sessão não encontrada' };
    if (sessionState.hostId !== payload.userId) {
      return { error: 'Apenas o anfitrião pode forçar pausas' };
    }

    const pomodoro = sessionState.pomodoro;

    if (pomodoro.intervalId) {
      clearInterval(pomodoro.intervalId as any);
      pomodoro.intervalId = undefined;
    }

    pomodoro.status = 'paused';
    pomodoro.phase = 'break';

    if (payload.type === 'long') {
      pomodoro.timeLeft = 15 * 60;
      pomodoro.cycle = 0;
    } else {
      pomodoro.timeLeft = 5 * 60;
    }

    this.server.to(payload.sessionId).emit('timer_ended', {
      nextPhase: 'break',
      type: payload.type,
      timeLeft: pomodoro.timeLeft,
    });

    console.log(
      `[Socket] O anfitrião ${payload.userId} forçou uma pausa ${payload.type} na sala ${payload.sessionId}`,
    );

    return { success: true, status: 'break', timeLeft: pomodoro.timeLeft };
  }

  @SubscribeMessage('force_study')
  handleForceStudy(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sessionId: string; userId: string },
  ) {
    const sessionState = this.activeSessions.get(payload.sessionId);

    // validacões de seguranca
    if (!sessionState) return { error: 'Sessão não encontrada' };
    if (sessionState.hostId !== payload.userId) {
      return { error: 'Apenas o anfitrião pode forçar o modo de estudos' };
    }

    const pomodoro = sessionState.pomodoro;

    // se o timer está rodando, para ele
    if (pomodoro.intervalId) {
      clearInterval(pomodoro.intervalId as any);
      pomodoro.intervalId = undefined;
    }

    pomodoro.status = 'paused';
    pomodoro.phase = 'study';

    pomodoro.timeLeft = 25 * 60;
    pomodoro.cycle = 0;

    // emite o que mudou para os participantes
    this.server.to(payload.sessionId).emit('timer_paused', {
      timeLeft: pomodoro.timeLeft,
      type: 'study', // Informa que é uma mudança para modo de estudo
    });

    console.log(
      `[Socket] O anfitrião ${payload.userId} forçou o tempo de estudos (25m) na sala ${payload.sessionId}`,
    );

    return { success: true, status: 'paused', timeLeft: pomodoro.timeLeft };
  }
}
