import { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { startNotificationConnection } from '@services/NotificationService';

const NotificationHandler = () => {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);

  useEffect(() => {
    let isMounted = true;
    
    const setupConnection = async () => {
      try {
        const conn = await startNotificationConnection();
        if (isMounted && conn) {
          setConnection(conn);
          setupNotificationHandler(conn);
        }
      } catch (error) {
        console.error('Failed to setup notification handler', error);
      }
    };

    setupConnection();

    return () => {
      isMounted = false;
      connection?.off("ReceiveNotification");
      // Удалена отписка от SchemaUpdated
    };
  }, []);

  const setupNotificationHandler = (conn: signalR.HubConnection) => {
    // Только уведомления
    conn.on("ReceiveNotification", (message: string) => {
      toast.info(message, {
        position: "bottom-right",
        autoClose: 5000
      });
    });

    // Удалена обработка обновлений схем
    
    // Обработка событий подключения
    conn.onreconnecting((error) => {
      console.warn('SignalR reconnecting due to error:', error);
    });

    conn.onreconnected((connectionId) => {
      console.log('SignalR reconnected. New connection ID:', connectionId);
    });

    conn.onclose((error) => {
      console.error('SignalR connection closed', error);
    });
  };

  return <ToastContainer />;
};

export default NotificationHandler;