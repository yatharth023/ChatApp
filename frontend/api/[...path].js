// Vercel Edge Function — catch-all proxy for /api/*.
// Runs on Vercel's edge network, forwards every request to the Render
// backend, and streams the response back. This makes /api/* look
// same-origin to the browser so the refresh cookie stops being treated
// as third-party and login persists across page reloads.
//
// Works independently of any `rewrites` in vercel.json — Vercel routes
// /api/<anything> to this file automatically because it lives under /api.

export const config = {
  runtime: 'edge',
};

const BACKEND_ORIGIN = 'https://chatapp-hsdt.onrender.com';

export default async function handler(request) {
  const incoming = new URL(request.url);
  const target = BACKEND_ORIGIN + incoming.pathname + incoming.search;

  // Copy headers but let fetch set the correct Host for the destination.
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete('host');
  forwardHeaders.delete('x-forwarded-host');

  const init = {
    method: request.method,
    headers: forwardHeaders,
    redirect: 'manual',
  };
  // Only include a body for methods that carry one. Also opt into
  // half-duplex streaming so POST/PATCH bodies aren't buffered.
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream;
  try {
    upstream = await fetch(target, init);
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'BACKEND_UNREACHABLE',
          message: 'The API server is not responding. Try again in a moment.',
          details: { reason: err?.message },
        },
      }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    );
  }

  // Stream the response through unchanged, including Set-Cookie headers.
  // Because Set-Cookie came from Render but the browser sees this response
  // as coming from the Vercel domain, cookies with no Domain attribute get
  // scoped to Vercel — which is exactly what we want.
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: upstream.headers,
  });
}
