const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

function randomState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequest({ request, env }) {
  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Missing GITHUB_CLIENT_ID", { status: 500 });
  }

  const requestUrl = new URL(request.url);
  // Decap CMS passes its own state param — honour it so the value round-trips
  // back through GitHub unchanged. Fall back to a server-generated state if
  // nothing is provided (e.g. direct navigation).
  const state = requestUrl.searchParams.get("state") || randomState();
  const authorizeUrl = new URL(GITHUB_AUTHORIZE_URL);

  authorizeUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", `${requestUrl.origin}/callback`);
  authorizeUrl.searchParams.set("scope", "repo user");
  authorizeUrl.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Set-Cookie": `decap_oauth_state=${state}; Path=/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
}
