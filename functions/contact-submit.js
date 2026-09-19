const RESEND_URL = "https://api.resend.com/emails";
const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LINKEDIN_URL = "https://www.linkedin.com/groups/18361060/";
const WEBSITE_FROM = "CSA Calgary Website <hello@csacalgary.org>";
const FALLBACK_TO = "hello@csacalgary.org";

const MAX_NAME = 200;
const MAX_EMAIL = 254;
const MAX_ORGANIZATION = 200;
const MAX_MESSAGE = 5000;

// Routing table — server-side only. The browser sends a topic slug, never an address.
// An unrecognised or missing slug routes to general. If a topic's destination variable
// is unset, that topic falls back to the general address rather than failing.
const TOPICS = {
  membership: {
    label: "Membership",
    envVar: "CONTACT_MEMBERSHIP_TO",
    ackSubject: "Your CSA Calgary membership inquiry",
    ackLines: [
      "Thanks for your interest in joining the chapter — we've received your message and a member of our team will follow up.",
      "In the meantime, feel free to join our LinkedIn group to start connecting with the community right away.",
      "If you have any questions, just reply to this email.",
    ],
    ackLinkedin: true,
  },
  sponsorship: {
    label: "Sponsorship",
    envVar: "CONTACT_SPONSORSHIP_TO",
    ackSubject: "Your CSA Calgary sponsorship inquiry",
    ackLines: [
      "Thanks for your interest in partnering with CSA Calgary — we've received your message and a member of our team will follow up.",
      "If you'd like to add anything in the meantime, just reply to this email.",
    ],
    ackLinkedin: false,
  },
  speaking: {
    label: "Speaking",
    envVar: "CONTACT_PROGRAMS_TO",
    ackSubject: "Your CSA Calgary speaking proposal",
    ackLines: [
      "Thanks for proposing a talk or program — we've received your proposal and a member of our team will follow up.",
      "If you'd like to add anything in the meantime, just reply to this email.",
    ],
    ackLinkedin: false,
  },
  volunteer: {
    label: "Volunteer",
    envVar: "CONTACT_MEMBERSHIP_TO",
    ackSubject: "Your CSA Calgary volunteer inquiry",
    ackLines: [
      "Thanks for offering to help the chapter — we've received your message and a member of our team will follow up.",
      "If you have any questions, just reply to this email.",
    ],
    ackLinkedin: false,
  },
  events: {
    label: "Events",
    envVar: "CONTACT_PROGRAMS_TO",
    ackSubject: "Your CSA Calgary event question",
    ackLines: [
      "Thanks for your question — we've received your message and a member of our team will follow up.",
      "If you'd like to add anything in the meantime, just reply to this email.",
    ],
    ackLinkedin: false,
  },
  general: {
    label: "General",
    envVar: "CONTACT_GENERAL_TO",
    ackSubject: "Your message to CSA Calgary",
    ackLines: [
      "Thanks for reaching out — we've received your message and a member of our team will follow up.",
      "If you'd like to add anything in the meantime, just reply to this email.",
    ],
    ackLinkedin: false,
  },
};

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

async function verifyTurnstile(token, secret, remoteIp) {
  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("response", token);
  if (remoteIp) {
    formData.set("remoteip", remoteIp);
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    return false;
  }

  const result = await response.json();
  return Boolean(result.success);
}

async function sendEmail(apiKey, payload) {
  const response = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend returned ${response.status}: ${detail}`);
  }
}

function renderTeamEmailHtml({ label, name, email, organization, message, timestamp, inquiryId }) {
  const safeLabel = escapeHtml(label);
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeOrganization = escapeHtml(organization);
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");
  const organizationRow = safeOrganization
    ? `<tr><td style="padding:4px 16px 4px 0;font-size:13px;font-weight:700;color:#475569;vertical-align:top;">Organization</td><td style="padding:4px 0;font-size:14px;color:#1f2937;">${safeOrganization}</td></tr>`
    : "";
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d9642d;margin:0 0 12px;">CSA Calgary Website</p>
      <h1 style="font-size:20px;margin:0 0 16px;color:#0f172a;">New ${safeLabel} inquiry</h1>
      <table style="border-collapse:collapse;margin:0 0 20px;">
        <tr><td style="padding:4px 16px 4px 0;font-size:13px;font-weight:700;color:#475569;vertical-align:top;">Topic</td><td style="padding:4px 0;font-size:14px;color:#1f2937;">${safeLabel}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;font-size:13px;font-weight:700;color:#475569;vertical-align:top;">Name</td><td style="padding:4px 0;font-size:14px;color:#1f2937;">${safeName}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;font-size:13px;font-weight:700;color:#475569;vertical-align:top;">Email</td><td style="padding:4px 0;font-size:14px;color:#1f2937;">${safeEmail}</td></tr>
        ${organizationRow}
        <tr><td style="padding:4px 16px 4px 0;font-size:13px;font-weight:700;color:#475569;vertical-align:top;">Sent at</td><td style="padding:4px 0;font-size:14px;color:#1f2937;">${timestamp}</td></tr>
        <tr><td style="padding:4px 16px 4px 0;font-size:13px;font-weight:700;color:#475569;vertical-align:top;">Inquiry ID</td><td style="padding:4px 0;font-size:14px;color:#1f2937;">${inquiryId}</td></tr>
      </table>
      <p style="font-size:13px;font-weight:700;color:#475569;margin:0 0 8px;">Message</p>
      <div style="font-size:14px;line-height:1.6;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;padding:16px;">${safeMessage}</div>
      <p style="font-size:13px;line-height:1.6;margin:20px 0 0;color:#475569;">Replying to this email goes directly to the visitor.</p>
    </div>
  </body>
</html>`;
}

function renderTeamEmailText({ label, name, email, organization, message, timestamp, inquiryId }) {
  const organizationLine = organization ? `Organization: ${organization}\n` : "";
  return `New ${label} inquiry via the CSA Calgary website

Topic: ${label}
Name: ${name}
Email: ${email}
${organizationLine}Sent at: ${timestamp}
Inquiry ID: ${inquiryId}

Message:
${message}

Replying to this email goes directly to the visitor.`;
}

function renderAckEmailHtml(entry, name) {
  const safeName = escapeHtml(name);
  const paragraphs = entry.ackLines.map((line) => {
    const linked = entry.ackLinkedin && line.includes("LinkedIn group")
      ? escapeHtml(line).replace("LinkedIn group", `<a href="${LINKEDIN_URL}" style="color:#d9642d;font-weight:600;">LinkedIn group</a>`)
      : escapeHtml(line);
    return `<p style="font-size:15px;line-height:1.6;margin:0 0 16px;">${linked}</p>`;
  }).join("\n      ");
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#d9642d;margin:0 0 12px;">CSA Calgary Chapter</p>
      <h1 style="font-size:22px;margin:0 0 16px;color:#0f172a;">Thanks for reaching out, ${safeName}!</h1>
      ${paragraphs}
      <p style="font-size:14px;line-height:1.6;margin:8px 0 0;color:#475569;">— CSA Calgary Chapter</p>
    </div>
  </body>
</html>`;
}

function renderAckEmailText(entry, name) {
  const lines = entry.ackLines.map((line) => {
    if (entry.ackLinkedin && line.includes("LinkedIn group")) {
      return `${line}\n${LINKEDIN_URL}`;
    }
    return line;
  }).join("\n\n");
  return `CSA Calgary Chapter

Thanks for reaching out, ${name}!

${lines}

— CSA Calgary Chapter`;
}

export async function onRequestPost({ request, env }) {
  if (!env.RESEND_API_KEY || !env.TURNSTILE_SECRET_KEY) {
    console.error("contact-submit: missing RESEND_API_KEY or TURNSTILE_SECRET_KEY");
    return jsonResponse(500, { error: "Email service is not configured" });
  }

  if (!sameOrigin(request)) {
    return jsonResponse(403, { error: "Invalid origin" });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid request body" });
  }

  const { topic, name, email, organization, message, botcheck, turnstileToken } = body || {};

  // Honeypot: treat a filled field as a successful no-op and send nothing.
  if (botcheck) {
    return jsonResponse(200, { success: true });
  }

  if (typeof turnstileToken !== "string" || !turnstileToken) {
    return jsonResponse(400, { error: "Verification failed" });
  }

  let turnstileOk = false;
  try {
    turnstileOk = await verifyTurnstile(turnstileToken, env.TURNSTILE_SECRET_KEY, request.headers.get("CF-Connecting-IP"));
  } catch (error) {
    console.error("contact-submit: Turnstile verification request failed", error);
  }
  if (!turnstileOk) {
    return jsonResponse(403, { error: "Verification failed" });
  }

  if (typeof name !== "string" || !name.trim()) {
    return jsonResponse(400, { error: "Name is required" });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return jsonResponse(400, { error: "A valid email is required" });
  }
  if (typeof message !== "string" || !message.trim()) {
    return jsonResponse(400, { error: "Message is required" });
  }

  const trimmedName = name.trim().slice(0, MAX_NAME);
  const trimmedEmail = email.trim().slice(0, MAX_EMAIL);
  const trimmedOrganization = typeof organization === "string" ? organization.trim().slice(0, MAX_ORGANIZATION) : "";
  const trimmedMessage = message.trim().slice(0, MAX_MESSAGE);
  const topicSlug = typeof topic === "string" ? topic.trim().toLowerCase() : "";

  const entry = TOPICS[topicSlug] || TOPICS.general;
  const generalTo = env.CONTACT_GENERAL_TO || FALLBACK_TO;
  const teamTo = env[entry.envVar] || generalTo;

  const inquiryId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const subjectName = trimmedName.replace(/[\r\n]+/g, " ");
  const subjectOrganization = trimmedOrganization.replace(/[\r\n]+/g, " ");
  const subject = `[Website][${entry.label}] ${subjectName}${subjectOrganization ? ` — ${subjectOrganization}` : ""}`;

  const teamEmail = {
    label: entry.label,
    name: trimmedName,
    email: trimmedEmail,
    organization: trimmedOrganization,
    message: trimmedMessage,
    timestamp,
    inquiryId,
  };

  // Team notification — mandatory. If it fails, the inquiry would be silently lost,
  // so return an error and let the visitor fall back to emailing hello@ directly.
  try {
    await sendEmail(env.RESEND_API_KEY, {
      from: WEBSITE_FROM,
      to: [teamTo],
      reply_to: trimmedEmail,
      subject,
      html: renderTeamEmailHtml(teamEmail),
      text: renderTeamEmailText(teamEmail),
    });
  } catch (error) {
    console.error("contact-submit: team notification failed", error);
    return jsonResponse(502, { error: "Failed to send your message" });
  }

  // Visitor acknowledgement — best-effort. A failure here must not trigger a
  // duplicate resubmission, so log it and still report success.
  try {
    await sendEmail(env.RESEND_API_KEY, {
      from: `CSA Calgary <${teamTo}>`,
      to: [trimmedEmail],
      reply_to: teamTo,
      subject: entry.ackSubject,
      html: renderAckEmailHtml(entry, trimmedName),
      text: renderAckEmailText(entry, trimmedName),
    });
  } catch (error) {
    console.error("contact-submit: acknowledgement failed", error);
  }

  return jsonResponse(200, { success: true });
}

export function onRequest() {
  return jsonResponse(405, { error: "Method not allowed" });
}
