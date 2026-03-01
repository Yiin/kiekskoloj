interface ApiOptions {
  method?: string
  body?: unknown
}

class ApiError extends Error {
  constructor(public status: number, public data: any) {
    super(data?.message || `HTTP ${status}`)
  }
}

export function useApi() {
  async function request<T>(url: string, options: ApiOptions = {}): Promise<T> {
    const res = await fetch(`/api${url}`, {
      method: options.method || "GET",
      headers: options.body ? { "Content-Type": "application/json" } : undefined,
      body: options.body ? JSON.stringify(options.body) : undefined,
      credentials: "include",
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new ApiError(res.status, data)
    }

    if (res.status === 204) return undefined as T
    return res.json()
  }

  return {
    get: <T>(url: string) => request<T>(url),
    post: <T>(url: string, body?: unknown) => request<T>(url, { method: "POST", body }),
    put: <T>(url: string, body?: unknown) => request<T>(url, { method: "PUT", body }),
    del: <T>(url: string) => request<T>(url, { method: "DELETE" }),
  }
}
