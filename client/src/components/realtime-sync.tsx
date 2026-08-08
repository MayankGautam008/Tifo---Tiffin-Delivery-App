import { useRealtimeOrders } from "@/hooks/use-realtime-orders";

// Renders nothing — just activates the realtime socket connection and
// wires its events into React Query cache invalidation for the whole app.
export function RealtimeSync() {
  useRealtimeOrders();
  return null;
}
