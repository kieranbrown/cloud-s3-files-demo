export class HttpError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

export async function fetchJson<T>(
    url: string,
    init: RequestInit = {},
): Promise<T> {
    const response = await fetch(url, {
        ...init,
        credentials: 'same-origin',
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(init.headers as Record<string, string> | undefined),
        },
    });

    if (!response.ok) {
        let message = response.statusText || 'Request failed';

        try {
            const body = (await response.json()) as { message?: string };

            if (body.message) {
                message = body.message;
            }
        } catch {
            // Non-JSON error body; keep the status text.
        }

        throw new HttpError(response.status, message);
    }

    return (await response.json()) as T;
}
