import React, { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';

interface MaintenanceContextType {
  isConnected: boolean;
  maintenance: any;
}

const MaintenanceContext = React.createContext<MaintenanceContextType>({
  isConnected: false,
  maintenance: null
});

interface MaintenanceProviderProps {
  children: React.ReactNode;
}

const MaintenanceProvider: React.FC<MaintenanceProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [maintenance, setMaintenance] = useState(null);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('connect', () => {
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
      });

      socket.on('maintenance', (data: any) => {
        setMaintenance(data);
      });

      return () => {
        socket.off('connect');
        socket.off('disconnect');
        socket.off('maintenance');
      };
    }
  }, []);

  return (
    <MaintenanceContext.Provider value={{ isConnected, maintenance }}>
      {children}
    </MaintenanceContext.Provider>
  );
};

const useMaintenance = () => {
  const context = React.useContext(MaintenanceContext);
  if (context === undefined) {
    throw new Error('useMaintenance must be used within a MaintenanceProvider');
  }
  return context;
};

export { MaintenanceProvider, useMaintenance }; 