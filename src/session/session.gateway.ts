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

@WebSocketGateway({ cors: true, namespace: '/session' })
export class SessionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  // O Gateway mantém apenas o mapeamento básico para saber quem é a conexão que caiu
  private socketToUserMap = new Map<
    string,
    { userId: string; sessionId: string }
  >();

  constructor(private readonly sessionService: SessionService) {}

  // 1. Injeta o servidor Socket no Service logo que ele inicializa
  afterInit(server: Server) {
    this.sessionService.injectWebSocketServer(server);
  }

  handleConnection(client: Socket) {
    console.log(`[Socket] Cliente conectado: ${client.id}`);
  }

  // 2. Quando a conexão cai, ele apenas avisa o Service para limpar o estado
  handleDisconnect(client: Socket) {
    const info = this.socketToUserMap.get(client.id);

    if (info) {
      console.log(
        `[Socket] Usuário ${info.userId} desconectou da sala ${info.sessionId}`,
      );

      // O Service cuida de remover o usuário do Map, iniciar timeout de 5 min, etc.
      this.sessionService.handleUserDisconnect(info.sessionId, info.userId);

      this.socketToUserMap.delete(client.id);
    }
  }

  // 3. O ingresso na sala
  @SubscribeMessage('join_session')
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinSessionDto,
  ) {
    try {
      // O Service toma a decisão de buscar no banco, criar nova, ou validar convidado
      const result = await this.sessionService.joinSession(
        payload.userId,
        client.id,
        payload.sessionId || null,
      );

      // O Gateway apenas executa a ação de colocar o socket na sala física do Socket.io
      client.join(result.sessionId);
      this.socketToUserMap.set(client.id, {
        userId: payload.userId,
        sessionId: result.sessionId,
      });

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
}
