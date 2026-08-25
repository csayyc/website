const RESEND_URL = "https://api.resend.com/emails";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_URL = "https://www.linkedin.com/groups/18361060/";
const MEMBERSHIP_FROM = "CSA Calgary Membership <membership@csacalgary.org>";
const MEMBERSHIP_REPLY_TO = "membership@csacalgary.org";

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function renderEmailHtml(name) {
  const safeName = escapeHtml(name);
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d9642d;margin:0 0 12px;">CSA Calgary Chapter</p>
      <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">Thanks for requesting membership, ${safeName}!</h1>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">We've received your request to join CSA Calgary as a member. A member of our team will follow up shortly with next steps.</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">In the meantime, feel free to <a href="${LINKEDIN_URL}" style="color:#d9642d;font-weight:600;">join our LinkedIn group</a> to start connecting with the community right away.</p>
      <p style="font-size:15px;line-height:1.6;margin:0 0 24px;">If you have any questions, just reply to this email.</p>
      <p style="font-size:14px;line-height:1.6;margin:0;color:#475569;">— CSA Calgary Chapter</p>
    </div>
  </body>
</html>`;
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "Email service is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const origin = request.headers.get("Origin");
  const requestUrl = new URL(request.url);
  if (origin && new URL(origin).host !== requestUrl.host) {
    return new Response(JSON.stringify({ error: "Invalid origin" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { name, email, botcheck } = body || {};

  if (botcheck) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return new Response(JSON.stringify({ error: "A valid name and email are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const trimmedName = name.trim().slice(0, 200);

  const resendResponse = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: MEMBERSHIP_FROM,
      to: [email.trim()],
      reply_to: MEMBERSHIP_REPLY_TO,
      subject: `Welcome, ${trimmedName} — your CSA Calgary membership request`,
      html: renderEmailHtml(trimmedName),
    }),
  });

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    return new Response(JSON.stringify({ error: "Failed to send email", detail }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
