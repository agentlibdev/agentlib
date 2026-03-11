const jsonHeaders = {
  "content-type": "application/json"
};

function json(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      ...jsonHeaders,
      ...(init.headers ?? {})
    }
  });
}

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return json({
      ok: true,
      service: "agentlib-api"
    });
  }

  return json(
    {
      error: {
        code: "not_found",
        message: "Route not found"
      }
    },
    { status: 404 }
  );
}

const worker: ExportedHandler = {
  async fetch(request): Promise<Response> {
    return handleRequest(request);
  }
};

export default worker;
