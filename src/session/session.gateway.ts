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

@WebSocketGateway({ cors: true, namespace: '/session' })
export class SessionGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

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
      console.log(`[Socket] Usuário ${userId} entrou na sala ${result.sessionId}`);

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
