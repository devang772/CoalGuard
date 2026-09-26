/**
 * WebSocket hook for real-time notifications from the backend.
 * Connects to ws://<api-host>/ws/notifications?token=<token> after REST screens load.
 * Only keeps the latest 50 notifications in state.
 */
import { useEffect, useRef } from "react";
import { getAuthToken, getApiBase } from "@/lib/api";

interface WsNotification {
  id: number;
  kind: string;
  level: string;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  created_at: string;
}

type Handler = (notification: WsNotification) => void;

export function useNotificationSocket(onNotification: Handler) {
  const handlerRef = useRef(onNotification);
  handlerRef.current = onNotification;

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    const baseUrl = getApiBase().replace(/^http/, "ws");
    const ws = new WebSocket(`${baseUrl}/ws/notifications?token=${encodeURIComponent(token)}`);
    let alive = true;

    ws.onmessage = (event: MessageEvent) => {
      if (!alive) return;
      try {
        const data = JSON.parse(String(event.data)) as WsNotification;
        handlerRef.current(data);
      } catch {
        // malformed frame — ignore
      }
    };

    ws.onerror = () => {
      // Silently swallow — WS may not be available in all deployments.
    };

    return () => {
      alive = false;
      if (ws.readyState < 2) ws.close();
    };
  }, []);
}
