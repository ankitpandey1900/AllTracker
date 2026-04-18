type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
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
    });

    clearTimeout(id);


    if (!response.ok) {
      let errorMessage = `${response.status} ${response.statusText}`;
      let errorCode: string | undefined;
      try {
        const payload = await response.json();
        if (payload?.error) {
          errorMessage = payload.error;
        }
        if (payload?.code) {
          errorCode = payload.code;
        }
      } catch {
        // Ignore malformed error bodies.
      }
      throw new ApiError(errorMessage, response.status, errorCode);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new ApiError("Protocol timeout: The server took too long to respond.", 408, 'TIMEOUT');
    }
    throw error;
  }
}

