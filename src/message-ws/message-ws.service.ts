import { Injectable } from '@nestjs/common';
import { User } from '../auth/entities/user.entity';
import { Socket } from 'socket.io';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

interface ConnectedClients {
  //use this object only if there is a few users, but use bd when the number of users increases
  [id: string]: {
    socket: Socket;
    user: User;
  };
}
@Injectable()
export class MessageWsService {
  private connectedClients: ConnectedClients = {};

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async registerClient(client: Socket, userId: string) {
    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) throw new Error('User not found');
    if (!user.isActive) throw new Error('User inactive');

    this.connectedClients[client.id] = { socket: client, user: user };
  }

  removeClient(clientId: string) {
    delete this.connectedClients[clientId];
  }

  getConnectedClients(): string[] {
    return Object.keys(this.connectedClients);
  }

  getUserFullName(socketId: string) {
    return this.connectedClients[socketId].user.fullName;
  }
}
