const GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const OAUTH_BRIDGE_CHANNEL = "decap-cms-oauth";
const OAUTH_BRIDGE_STORAGE_KEY = "decap_cms_oauth_message";

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
        var bridgePayload = {
          type: "decap-cms-oauth",
          provider: "github",
          message: message,
          createdAt: Date.now()
        };
        var sent = false;

        function sendToBridge() {
          try {
            if ("BroadcastChannel" in window) {
              var channel = new BroadcastChannel("${OAUTH_BRIDGE_CHANNEL}");
              channel.postMessage(bridgePayload);
              channel.close();
            }
          } catch (error) {}

          try {
            localStorage.setItem("${OAUTH_BRIDGE_STORAGE_KEY}", JSON.stringify(bridgePayload));
            setTimeout(function () {
              localStorage.removeItem("${OAUTH_BRIDGE_STORAGE_KEY}");
            }, 1000);
          } catch (error) {}
        }

        function sendToOpener(targetOrigin) {
          if (sent) return;
          sent = true;
          window.removeEventListener("message", receiveMessage, false);
          window.opener.postMessage(message, targetOrigin);
        }

        function receiveMessage(e) {
          sendToOpener(e.origin);
        }

        sendToBridge();

        if (window.opener) {
          window.addEventListener("message", receiveMessage, false);
          window.opener.postMessage("authorizing:github", "*");
          // If Decap's handshake response does not arrive, send directly. Decap
          // still validates the message origin against the configured base_url.
          setTimeout(function () { sendToOpener("*"); }, 1000);
        } else {
          document.body.innerHTML =
            "<p>Authentication finished. Return to the CMS tab to continue.</p>";
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

function allowedGithubUsers(env) {
  return (env.CMS_ALLOWED_GITHUB_USERS || "")
    .split(",")
    .map((login) => login.trim().toLowerCase())
    .filter(Boolean);
}

async function getGithubUser(token) {
  const response = await fetch(GITHUB_USER_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "csayyc-decap-cms",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  const result = await response.json();

  if (!response.ok || !result.login) {
    throw new Error(result.message || "Unable to verify GitHub user");
  }

  return result;
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

  const allowlist = allowedGithubUsers(env);

  if (allowlist.length === 0) {
    return htmlResponse(renderAuthResponse("error", {
      error: "CMS_ALLOWED_GITHUB_USERS is not configured",
    }), 500);
  }

  let user;

  try {
    user = await getGithubUser(result.access_token);
  } catch (error) {
    return htmlResponse(renderAuthResponse("error", {
      error: error.message,
    }), 401);
  }

  if (!allowlist.includes(user.login.toLowerCase())) {
    return htmlResponse(renderAuthResponse("error", {
      error: `GitHub user ${user.login} is not allowed to access the CMS`,
    }), 403);
  }

  return htmlResponse(renderAuthResponse("success", {
    token: result.access_token,
    provider: "github",
    login: user.login,
  }));
}
