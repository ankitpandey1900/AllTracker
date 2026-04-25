type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  keepalive?: boolean;
};

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  const timeout = 10000; // 10 seconds timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(path, {
      method: options.method || "GET",
      credentials: "include",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
      keepalive: options.keepalive,
    });

    clearTimeout(id);

    if (!response.ok) {
      // Retry logic for transient server errors (500, 503) or timeouts
      const isTransientError = response.status === 408 || response.status === 503 || response.status === 500;
      if (retries > 0 && isTransientError) {
        console.warn(`[API] Transient Error ${response.status}. Retrying in ${delay}ms... (${retries} attempts left)`);
        await new Promise(res => setTimeout(res, delay));
        return apiRequest(path, options, retries - 1, delay * 2);
      }

      let errorMessage = `${response.status} ${response.statusText}`;
      let errorCode: string | undefined;
      try {
        const payload = await response.json();
        if (payload?.error) errorMessage = payload.error;
        if (payload?.code) errorCode = payload.code;
      } catch { /* ignore malformed error bodies */ }
      
      throw new ApiError(errorMessage, response.status, errorCode);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    clearTimeout(id);
    
    // Retry on network flapping or unexpected aborts
    if (retries > 0 && (error.name === 'AbortError' || error.name === 'TypeError')) {
      console.warn(`[API] Network or Timeout error. Retrying in ${delay}ms... (${retries} attempts left)`);
      await new Promise(res => setTimeout(res, delay));
      return apiRequest(path, options, retries - 1, delay * 2);
    }

    if (error.name === 'AbortError') {
      throw new ApiError("Protocol timeout: The server took too long to respond.", 408, 'TIMEOUT');
    }
    throw error;
  }
}

