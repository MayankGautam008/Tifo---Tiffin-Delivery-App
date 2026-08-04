import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { connectSocket, disconnectSocket, getSocket } from "@/lib/socket";

/**
 * Keeps the Seller Dashboard and Customer Dashboard live:
 * - new orders show up on the Seller Dashboard instantly
 * - status changes show up on the Customer Dashboard instantly
 * - the seller never has to reopen/refresh the tab (auto-reconnect)
 *
 * No UI changes: this only triggers the same query-invalidations the
 * existing polling/mutation code already used, so the pages re-render
 * through their normal data-fetching path.
 */
export function useRealtimeOrders() {
  const { token, isAuthenticated, isSeller, isCustomer } = useAuth();
  const queryClient = useQueryClient();
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      disconnectSocket();
      tokenRef.current = null;
      return;
    }

    if (tokenRef.current === token && getSocket()?.connected) {
      return;
    }
    tokenRef.current = token;

    const socket = connectSocket(token);

    const invalidateByPrefix = (prefixes: string[]) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && prefixes.some((p) => key.startsWith(p));
        },
      });
    };

    // New order placed → Seller Dashboard should show it right away.
    const handleNewOrder = () => {
      invalidateByPrefix(["/api/seller/bookings", "/api/seller/subscriptions"]);
    };

    // ✅ Pending sync — delivered in bulk after seller reconnects. Same
    // cache-invalidation as a single order:new, just triggered once for
    // the whole batch so we don't needlessly hammer React Query.
    const handlePendingSync = () => {
      invalidateByPrefix(["/api/seller/bookings", "/api/seller/subscriptions"]);
    };

    // Order status changed (by the seller) → Customer Dashboard should
    // reflect it right away, including the per-subscription schedule view.
    const handleStatusUpdated = () => {
      invalidateByPrefix(["/api/bookings/customer", "/api/bookings/"]);
    };

    // Order changed on the seller's side too (e.g. a customer cancellation)
    // → Seller Dashboard should reflect it right away.
    const handleOrderUpdated = () => {
      invalidateByPrefix(["/api/seller/bookings", "/api/seller/subscriptions"]);
    };

    socket.on("order:new", handleNewOrder);
    socket.on("order:pending-sync", handlePendingSync);
    socket.on("order:status-updated", handleStatusUpdated);
    socket.on("order:updated", handleOrderUpdated);

    socket.on("connect_error", (err) => {
      console.warn("⚠️ Realtime connection issue:", err.message);
    });

    return () => {
      socket.off("order:new", handleNewOrder);
      socket.off("order:pending-sync", handlePendingSync);
      socket.off("order:status-updated", handleStatusUpdated);
      socket.off("order:updated", handleOrderUpdated);
    };
  }, [token, isAuthenticated, isSeller, isCustomer, queryClient]);

  useEffect(() => {
    return () => {
      // Only torn down when the whole app unmounts (browser tab closes).
      disconnectSocket();
    };
  }, []);
}
