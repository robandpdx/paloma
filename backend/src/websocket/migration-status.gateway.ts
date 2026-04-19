import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN 
      ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()).filter(Boolean)
      : true, // Allow all origins when CORS_ORIGIN is not configured (same as HTTP CORS)
    credentials: true,
  },
  namespace: '/migration-status',
  transports: ['websocket', 'polling'],
})
export class MigrationStatusGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(MigrationStatusGateway.name);

  constructor(private readonly configService: ConfigService) {
    const corsOrigin = this.configService.get('corsOrigin') || [];
    if (corsOrigin.length === 0) {
      this.logger.warn('WARNING: CORS_ORIGIN is not set for WebSocket. All origins will be allowed. Set CORS_ORIGIN in production.');
    }
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-migration')
  handleSubscription(client: Socket, migrationId: string) {
    this.logger.log(`Client ${client.id} subscribing to migration ${migrationId}`);
    client.join(`migration-${migrationId}`);
    return { success: true, message: `Subscribed to migration ${migrationId}` };
  }

  @SubscribeMessage('unsubscribe-migration')
  handleUnsubscription(client: Socket, migrationId: string) {
    this.logger.log(`Client ${client.id} unsubscribing from migration ${migrationId}`);
    client.leave(`migration-${migrationId}`);
    return { success: true, message: `Unsubscribed from migration ${migrationId}` };
  }

  @SubscribeMessage('subscribe-export')
  handleExportSubscription(client: Socket, repoId: string) {
    this.logger.log(`Client ${client.id} subscribing to export ${repoId}`);
    client.join(`export-${repoId}`);
    return { success: true, message: `Subscribed to export ${repoId}` };
  }

  @SubscribeMessage('unsubscribe-export')
  handleExportUnsubscription(client: Socket, repoId: string) {
    this.logger.log(`Client ${client.id} unsubscribing from export ${repoId}`);
    client.leave(`export-${repoId}`);
    return { success: true, message: `Unsubscribed from export ${repoId}` };
  }

  // Emit migration status update to all subscribed clients
  notifyMigrationUpdate(migrationId: string, status: any) {
    this.logger.log(`Notifying migration update for ${migrationId}: ${status.state}`);
    this.server.to(`migration-${migrationId}`).emit('migration-update', {
      migrationId,
      ...status,
    });
  }

  // Emit export status update to all subscribed clients
  notifyExportUpdate(repoId: string, exportStatus: any) {
    this.logger.log(`Notifying export update for ${repoId}`);
    this.server.to(`export-${repoId}`).emit('export-update', {
      repoId,
      ...exportStatus,
    });
  }

  // Emit repository update (for CRUD operations)
  notifyRepositoryUpdate(repoId: string, repository: any) {
    this.logger.log(`Notifying repository update for ${repoId}`);
    this.server.emit('repository-update', {
      repoId,
      repository,
    });
  }
}