'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface PAIOSSystemEvent {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  data: any;
  traceId: string;
}

interface LiveSystemContextType {
  events: PAIOSSystemEvent[];
  isConnected: boolean;
  activeWorkflows: number;
}

const LiveSystemContext = createContext<LiveSystemContextType>({
  events: [],
  isConnected: false,
  activeWorkflows: 0,
});

export function LiveSystemProvider({ children }: { children: React.ReactNode }) {
  const [events, setEvents] = useState<PAIOSSystemEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeWorkflows, setActiveWorkflows] = useState(0);

  useEffect(() => {
    let evtSource: EventSource;

    const connect = () => {
      evtSource = new EventSource('/api/paios/events');

      evtSource.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.type === 'connected') {
            setIsConnected(true);
            return;
          }

          setEvents((prev) => {
            const next = [parsed, ...prev].slice(0, 50);
            return next;
          });

          if (parsed.type.includes('start') || parsed.type.includes('running')) {
            setActiveWorkflows(prev => prev + 1);
          } else if (parsed.type.includes('end') || parsed.type.includes('success') || parsed.type.includes('fail')) {
            setActiveWorkflows(prev => Math.max(0, prev - 1));
          }
        } catch (err) {
          console.error('Failed to parse SSE', err);
        }
      };

      evtSource.onerror = () => {
        setIsConnected(false);
        evtSource.close();
        setTimeout(connect, 5000); // Reconnect
      };
    };

    connect();

    return () => {
      if (evtSource) {
        evtSource.close();
      }
    };
  }, []);

  return (
    <LiveSystemContext.Provider value={{ events, isConnected, activeWorkflows }}>
      {children}
    </LiveSystemContext.Provider>
  );
}

export const useLiveSystem = () => useContext(LiveSystemContext);
