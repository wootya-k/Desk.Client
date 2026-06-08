import * as signalR from '@microsoft/signalr';
import { buildUrl } from 'config';

let connection: signalR.HubConnection | null = null;
let connectionPromise: Promise<signalR.HubConnection | null> | null = null;

export const startNotificationConnection = async (): Promise<signalR.HubConnection | null> => {
  // Если уже есть активное соединение
  if (connection?.state === signalR.HubConnectionState.Connected) {
    return connection;
  }
  
  // Если уже идет процесс подключения
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const url = await buildUrl('/api/schemas/events'); 
      connection = new signalR.HubConnectionBuilder()
        .withUrl(url)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (context) => {
            if (context.elapsedMilliseconds < 10000) {
              return 2000;
            }
            return 5000;
          }
        })
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      await connection.start();
      console.log('SignalR Connected');
      return connection;
    } catch (error) {
      console.error('SignalR Connection Error:', error);
      return null;
    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};

export const getConnection = () => connection;