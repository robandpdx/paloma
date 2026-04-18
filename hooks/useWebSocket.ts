import { useEffect, useState, useCallback, useRef } from 'react';
import io from 'socket.io-client';
import type { RepositoryMigration } from '@/lib/api';

type Socket = ReturnType<typeof io>;

interface MigrationUpdate {
  migrationId: string;
  state: string;
  failureReason?: string;
  repoId: string;
}

interface ExportUpdate {
  repoId: string;
  gitSourceExportState?: string;
  metadataExportState?: string;
  gitSourceArchiveUrl?: string;
  metadataArchiveUrl?: string;
}

interface RepositoryUpdate {
  repoId: string;
  repository: RepositoryMigration;
}

interface WebSocketCallbacks {
  onMigrationUpdate?: (update: MigrationUpdate) => void;
  onExportUpdate?: (update: ExportUpdate) => void;
  onRepositoryUpdate?: (update: RepositoryUpdate) => void;
}

export function useWebSocket(callbacks?: WebSocketCallbacks) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // Use ref to store callbacks to prevent infinite re-renders
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    // Connect directly to the namespace
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5005";
    const wsUrl = `${baseUrl}/migration-status`;
    console.log('Connecting to WebSocket at:', wsUrl);
    
    const newSocket = io(wsUrl, {
      forceNew: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 3,
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected to /migration-status namespace');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected from /migration-status namespace');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    newSocket.on('migration-update', (update: MigrationUpdate) => {
      console.log('Received migration update:', update);
      if (callbacksRef.current?.onMigrationUpdate) {
        callbacksRef.current.onMigrationUpdate(update);
      }
    });

    newSocket.on('export-update', (update: ExportUpdate) => {
      console.log('Received export update:', update);
      if (callbacksRef.current?.onExportUpdate) {
        callbacksRef.current.onExportUpdate(update);
      }
    });

    newSocket.on('repository-update', (update: RepositoryUpdate) => {
      console.log('Received repository update:', update);
      if (callbacksRef.current?.onRepositoryUpdate) {
        callbacksRef.current.onRepositoryUpdate(update);
      }
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up WebSocket connection');
      newSocket.close();
    };
  }, []); // Empty dependency array - only run once

  const subscribeToMigration = useCallback((migrationId: string) => {
    if (socket && isConnected) {
      console.log('Subscribing to migration:', migrationId);
      socket.emit('subscribe-migration', migrationId);
    }
  }, [socket, isConnected]);

  const unsubscribeFromMigration = useCallback((migrationId: string) => {
    if (socket && isConnected) {
      console.log('Unsubscribing from migration:', migrationId);
      socket.emit('unsubscribe-migration', migrationId);
    }
  }, [socket, isConnected]);

  const subscribeToExport = useCallback((repoId: string) => {
    if (socket && isConnected) {
      console.log('Subscribing to export:', repoId);
      socket.emit('subscribe-export', repoId);
    }
  }, [socket, isConnected]);

  const unsubscribeFromExport = useCallback((repoId: string) => {
    if (socket && isConnected) {
      console.log('Unsubscribing from export:', repoId);
      socket.emit('unsubscribe-export', repoId);
    }
  }, [socket, isConnected]);

  return {
    isConnected,
    subscribeToMigration,
    unsubscribeFromMigration,
    subscribeToExport,
    unsubscribeFromExport,
  };
}