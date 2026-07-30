import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;

    // ✅ BUG FIX: the server responds with JSON like {"message":"Invalid OTP"}
    // or express-validator's {"errors":[{"msg":"..."}]}. Previously we threw
    // the raw "400: {\"message\":...}" string, so every error toast in the
    // app (login, register, OTP verify/resend, etc.) showed unparsed JSON
    // instead of a readable message. Parse it and extract the real message.
    let message = text;
    try {
      const parsed = JSON.parse(text);
      if (parsed?.message) {
        message = parsed.message;
      } else if (Array.isArray(parsed?.errors) && parsed.errors.length > 0) {
        message = parsed.errors[0].msg || parsed.errors[0].message || text;
      }
    } catch {
      // Not JSON (e.g. plain text/HTML error page) — fall back to raw text.
    }

    throw new Error(message);
  }
}

export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<T> {
  const token = localStorage.getItem("token");
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = localStorage.getItem("token");
    const headers: Record<string, string> = {};
    
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
