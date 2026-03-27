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

  };

  return <ToastContainer />;
};

export default NotificationHandler;