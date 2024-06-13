import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { MessageWsService } from './message-ws.service';
import { Server, Socket } from 'socket.io';
import { newMessageDto } from './dtos/new-message.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../auth/interfaces';

@WebSocketGateway({ cors: true })
export class MessageWsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() wss: Server;
  constructor(
    private readonly messageWsService: MessageWsService,
    private readonly jwtService: JwtService,
  ) {}

  handleConnection(client: Socket) {
    const token = client.handshake.headers.authentication as string;
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      client.disconnect();
      return;
    }

    console.log(payload);

    this.messageWsService.registerClient(client);

    this.wss.emit(
      'clients-updated',
      this.messageWsService.getConnectedClients(),
    );
  }
  handleDisconnect(client: Socket) {
    this.messageWsService.removeClient(client.id);
    this.wss.emit(
      'clients-updated',
      this.messageWsService.getConnectedClients(),
    );
  }

  @SubscribeMessage('message-from-client') handleMessageFromClient(
    client: Socket,
    payload: newMessageDto,
  ) {
    //emit message only to the initial client

    // client.emit('messages-from-server', {
    //   fullName: 'Soy yo',
    //   payload: payload.message || 'no-message!!',
    // });

    //emit message to all clients except the initial client
    // client.broadcast.emit('messages-from-server', {
    //   fullName: 'Soy yo',
    //   payload: payload.message || 'no-message!!',
    // });

    //emmot message to all clients
    this.wss.emit('message-from-server', {
      fullName: 'Soy yo',
      message: payload.message || 'no-message!!',
    });

    //client.join("ventas")
    //this.wss.to("venas").emit(...)
    //emits message only to clients connected to "ventas"
  }
}
