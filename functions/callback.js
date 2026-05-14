const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";

function readCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const prefix = `${name}=`;
  const cookie = cookies.find((item) => item.startsWith(prefix));
  return cookie ? cookie.slice(prefix.length) : null;
}

function renderAuthResponse(status, content) {
  const payload = JSON.stringify(content).replace(/</g, "\\u003c");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>Authorizing Decap CMS</title>
  </head>
  <body>
    <script>
      (function () {
        var message = 'authorization:github:${status}:${payload}';
        var sent = false;

        function sendToOpener(targetOrigin) {
          if (sent) return;
          sent = true;
          window.removeEventListener("message", receiveMessage, false);
          window.opener.postMessage(message, targetOrigin);
        }

        function receiveMessage(e) {
          sendToOpener(e.origin);
        }

        if (window.opener) {
          window.addEventListener("message", receiveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
          // Fallback: Decap CMS ignores postMessages from the same origin, so if
          // the handshake gets no response within 1s, send directly to any origin.
          setTimeout(function () { sendToOpener("*"); }, 1000);
        } else {
          document.body.innerHTML =
            "<p>Authentication error: this page must be opened as a popup. " +
            "Please close this tab and try again from the CMS.</p>";
        }
      })();
    </script>
  </body>
</html>`;
}

function htmlResponse(body, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html;charset=UTF-8",
      "Set-Cookie": "decap_oauth_state=; Path=/callback; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}

export async function onRequest({ request, env }) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return htmlResponse("Missing GitHub OAuth environment variables", 500);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = readCookie(request, "decap_oauth_state");

  if (!code) {
    return htmlResponse(renderAuthResponse("error", { error: "Missing OAuth code" }), 400);
  }

  // Only enforce state check when /auth set the cookie. If the cookie is absent
  // (Functions not reached and Decap went to GitHub directly), trust that Decap
  // validates its own state client-side.
  if (expectedState && state !== expectedState) {
    return htmlResponse(renderAuthResponse("error", { error: "Invalid OAuth state" }), 400);
  }

  const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "csayyc-decap-cms",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const result = await tokenResponse.json();

  if (!tokenResponse.ok || result.error) {
    return htmlResponse(renderAuthResponse("error", result), 401);
  }

  return htmlResponse(renderAuthResponse("success", {
    token: result.access_token,
    provider: "github",
  }));
}
