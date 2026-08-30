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

function jsonResponse(status, content) {
  return new Response(JSON.stringify(content), {
    status,
    headers: { "Content-Type": "application/json" },
  });
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

function renderEmailText(name) {
  return `CSA Calgary Chapter

Thanks for requesting membership, ${name}!

We've received your request to join CSA Calgary as a member. A member of our team will follow up shortly with next steps.

In the meantime, feel free to join our LinkedIn group to start connecting with the community right away:
${LINKEDIN_URL}

If you have any questions, just reply to this email.

— CSA Calgary Chapter`;
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) {
    return false;
  }

  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.MEMBERSHIP_NOTIFY_SECRET) {
    console.error("membership-notify: missing RESEND_API_KEY or MEMBERSHIP_NOTIFY_SECRET");
    return jsonResponse(500, { error: "Email service is not configured" });
  }

  if (!sameOrigin(request)) {
    return jsonResponse(403, { error: "Invalid origin" });
  }

  if (request.headers.get("X-Membership-Secret") !== env.MEMBERSHIP_NOTIFY_SECRET) {
    return jsonResponse(403, { error: "Invalid request" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid request body" });
  }

  const { name, email, botcheck } = body || {};

  if (botcheck) {
    return jsonResponse(200, { success: true });
  }

  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return jsonResponse(400, { error: "A valid name and email are required" });
  }

  const trimmedName = name.trim().slice(0, 200);
  const trimmedEmail = email.trim().slice(0, 254);

  let resendResponse;
  try {
    resendResponse = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: MEMBERSHIP_FROM,
        to: [trimmedEmail],
        reply_to: MEMBERSHIP_REPLY_TO,
        subject: `Welcome, ${trimmedName} — your CSA Calgary membership request`,
        html: renderEmailHtml(trimmedName),
        text: renderEmailText(trimmedName),
      }),
    });
  } catch (error) {
    console.error("membership-notify: Resend request failed", error);
    return jsonResponse(502, { error: "Failed to send email" });
  }

  if (!resendResponse.ok) {
    const detail = await resendResponse.text();
    console.error(`membership-notify: Resend returned ${resendResponse.status}`, detail);
    return jsonResponse(502, { error: "Failed to send email" });
  }

  return jsonResponse(200, { success: true });
}
