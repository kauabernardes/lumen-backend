import { SessionMessage } from './interface/session-message';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { SessionService } from './session.service';
import { JoinSessionDto } from './dto/join-session.dto';
import * as jwt from 'jsonwebtoken';
import { v7 } from 'uuid';
import { SendMessageDto } from './dto/send-message.dto';
import { info } from 'console';

@WebSocketGateway({ cors: true, namespace: '/session' })
export class SessionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private socketToUserMap = new Map<
    string,
    { userId: string; sessionId: string }
  >();

  constructor(private readonly sessionService: SessionService) {}

  afterInit(server: Server) {
    this.sessionService.injectWebSocketServer(server);
  }

  handleConnection(client: Socket) {
    console.log(`[Socket] Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    const info = this.socketToUserMap.get(client.id);

    if (info) {
      console.log(
        `[Socket] Usuário ${info.userId} desconectou da sala ${info.sessionId}`,
      );
      this.sessionService.handleUserDisconnect(info.sessionId, info.userId);
      this.socketToUserMap.delete(client.id);
    }
  }

  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinSessionDto,
  ) {
    try {
      let userId: string;
      try {
        const decoded = jwt.verify(payload.token, 'segredo') as any;
        userId = decoded.sub;
      } catch (err) {
        console.error('[Socket Error] Token inválido ou expirado');
        return { error: 'Acesso negado. Faça login novamente.' };
      }

      const result = await this.sessionService.joinSession(
        userId,
        client.id,
        payload.sessionId || null,
      );

      client.join(result.sessionId);
      this.socketToUserMap.set(client.id, {
        userId: userId,
        sessionId: result.sessionId,
      });
      console.log(
        `[Socket] Usuário ${userId} entrou na sala ${result.sessionId}`,
      );

      return {
        success: true,
        sessionId: result.sessionId,
        pomodoro: result.pomodoro,
      };
    } catch (error) {
      console.error('[Socket Error] Falha ao ingressar na sessão:', error);
      return { error: 'Erro interno ao tentar ingressar na sessão' };
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageDto,
  ) {
    const info = this.socketToUserMap.get(client.id);
    if (!info) {
      return { error: 'Usuário não conectado a uma sessão.' };
    }

    const session = this.sessionService.activeSessions.get(info.sessionId);
    if (!session) {
      return { error: 'Sessão não encontrada.' };
    }
    const participant = session.participants.get(info.userId);

    if (!session || !participant) {
      return { error: 'Sessão ou participante não encontrado.' };
    }

    if (!payload.text || payload.text.trim() === '') {
      return { error: 'O texto da mensagem não pode ser vazio.' };
    }

    if (payload.text.length > 500) {
      return { error: 'O texto da mensagem é muito longo.' };
    }

    const message: SessionMessage = {
      id: v7(),
      userId: info.userId,
      username: participant.username,
      text: payload.text,
      timestamp: new Date().toISOString(),
      isAi: false,
    };
    console.log(message);
    this.sessionService.saveMessage(message, info.sessionId);
    this.server.to(info.sessionId).emit('receive_message', message);

    return { success: true };
  }
}
