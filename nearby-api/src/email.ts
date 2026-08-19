// ── Email Module ──
// Single entry point: sendEmail(type, recipient, data)
// Providers are swappable behind the EmailProvider interface.
import { readFileSync } from "node:fs";
import { join } from "node:path";
const TEMPLATES_DIR = join(import.meta.dir, "email-templates");
// ── Public types ──
export type EmailType = "submission" | "submission_rejected";
export interface SubmissionData {
  appName: string;
  locationName: string;
  locationId: string;
  submissionId: string;
  userInfo: string | null;
  comment: string | null;
  submittedAt: string;
  photoUrl: string;
}
export interface RejectionData {
  appName: string;
  locationName: string;
  submissionId: string;
  /** The admin-selected rejection reason (one of REJECTION_REASONS). */
  reason: string;
  /** Optional short admin note (typically when reason is "Other"). */
  adminNote: string | null;
  /** Email strategy chosen by the caller based on the reason. */
  kind: "friendly" | "guidelines" | "other";
}
// ── Internal: what the provider sees ──
interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}
// ── Email Provider Interface ──
export interface EmailProvider {
  send(message: EmailMessage): Promise<boolean>;
}
// ── Resend Provider ──
class ResendProvider implements EmailProvider {
  private apiKey: string;
  private from: string;
  constructor() {
    this.apiKey = process.env.RESEND_API_KEY || "";
    this.from = process.env.NOTIFICATION_EMAIL_FROM || "notifications@scenenearby.dev";
  }
  async send(msg: EmailMessage): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const resp = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `Scene Nearby <${this.from}>`,
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        }),
      });
      if (resp.ok) {
        console.log(`✅ Email sent via Resend to ${msg.to}`);
        return true;
      }
      const err = await resp.text();
      console.error(`❌ Resend API error (${resp.status}):`, err.slice(0, 200));
      return false;
    } catch (err: any) {
      console.error("❌ Failed to send email:", err.message);
      return false;
    }
  }
}
// ── Console Provider (fallback) ──
class ConsoleProvider implements EmailProvider {
  async send(msg: EmailMessage): Promise<boolean> {
    console.log(`📧 Email (console) → ${msg.to}`);
    console.log(`   Subject: ${msg.subject}`);
    console.log(msg.text);
    console.log("⚠️  Set RESEND_API_KEY to enable real email delivery");
    console.log("────────────────────────");
    return false;
  }
}
// ── Provider plumbing ──
let _provider: EmailProvider | null = null;
function getProvider(): EmailProvider {
  if (_provider) return _provider;
  if (process.env.RESEND_API_KEY) {
    console.log("📧 Email: Resend provider active");
    _provider = new ResendProvider();
  } else {
    console.log("📧 Email: Console provider active (RESEND_API_KEY not set)");
    _provider = new ConsoleProvider();
  }
  return _provider;
}
/** Swap the provider at runtime (useful for testing). */
export function setEmailProvider(provider: EmailProvider): void {
  _provider = provider;
}
// ── Template helpers ──
function loadTemplate(name: string): string {
  return readFileSync(join(TEMPLATES_DIR, name), "utf-8");
}
function populateHTML(html: string, vars: Record<string, string | undefined>): string {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    const escaped = (value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
    result = result.replaceAll(`{{${key}}}`, escaped);
  }
  return result;
}
// ── Email builders (one per type) ──
function buildSubmissionEmail(data: SubmissionData): EmailMessage {
  const subject = `🎬 [${data.appName}] Photo Submission – ${data.locationName}`;
  const text = [
    "📸 New Photo Submission",
    "──────────────────────",
    `App: ${data.appName}`,
    `Location: ${data.locationName} (${data.locationId})`,
    `Submitted by: ${data.userInfo || "Anonymous"}`,
    `Date: ${data.submittedAt}`,
    data.comment ? `Comment: ${data.comment}` : null,
    `Photo: ${data.photoUrl}`,
    `Moderation links:`,
    `  Approve: POST /api/approve/${data.submissionId}`,
    `  Reject:  POST /api/reject/${data.submissionId}`,
  ].filter(Boolean).join("\n");
  const template = loadTemplate("notification.html");
  const html = populateHTML(template, {
    app_name: data.appName,
    location_name: data.locationName,
    location_id: data.locationId,
    submission_id: data.submissionId,
    user_info: data.userInfo || "",
    comment: data.comment || "",
    submitted_at: data.submittedAt,
    photo_url: data.photoUrl,
    approve_url: `https://api.scenediscover.com/api/approve/${data.submissionId}`,
    reject_url: `https://api.scenediscover.com/api/reject/${data.submissionId}`,
    unsubscribe_url: "https://scenediscover.com/unsubscribe?type=moderation",
  });
  return { to: "", subject, text, html };
}

function buildRejectionEmail(data: RejectionData): EmailMessage {
  const subject = `📷 Update on your photo submission to ${data.appName}`;
  // Copy strategy per owner spec:
  //  - "friendly"  → try-again language + location name + selected reason
  //  - "guidelines"→ generic moderation language (Inappropriate content)
  //  - "other"     → admin note if provided, else a friendly generic line
  const friendlyReasons = new Set([
    "Blurry / out of focus",
    "Wrong location",
    "Poor / unclear view of the location",
    "Duplicate photo",
  ]);
  let body: string[] = [];
  if (data.kind === "guidelines") {
    body = [
      `Thanks for submitting a photo of ${data.locationName} to ${data.appName}.`,
      "This photo didn't meet our community submission guidelines, so we weren't able to accept it this time.",
      "We'd love to see another shot of a filming location you've visited — every great photo makes the app better for everyone.",
      "Thanks again for contributing!",
    ];
  } else if (data.kind === "other") {
    body = [
      `Thanks for submitting a photo of ${data.locationName} to ${data.appName}.`,
      data.adminNote
        ? `Our team left a note with your submission: “${data.adminNote}”`
        : "We weren't able to accept this photo, but we'd love to see another shot next time you're at a filming location.",
      "Every contribution helps make Scene Nearby better — thanks for being part of it!",
    ];
  } else {
    body = [
      `Thanks for submitting a photo of ${data.locationName} to ${data.appName}.`,
      "We couldn't accept this one this time, but we'd love for you to try again — your next shot might be perfect.",
      `Reason: ${data.reason}`,
      "If you're back at this location, snap another photo and submit it right from the app.",
      "Thanks again for contributing!",
    ];
  }
  const text = body.join("\n\n");
  const template = loadTemplate("rejection.html");
  const html = populateHTML(template, {
    app_name: data.appName,
    location_name: data.locationName,
    reason: data.kind === "guidelines" ? "community submission guidelines" : data.reason,
    note: data.adminNote || "",
    body_paragraphs: body
      .map((p) => `<p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#3c3c3c;">${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")}</p>`)
      .join(""),
  });
  return { to: "", subject, text, html };
}
// ── Public API ──
/**
 * Send an email.
 *
 *   await sendEmail("submission", "owner@example.com", {
 *     appName, locationName, locationId, submissionId,
 *     userInfo, comment, submittedAt, photoUrl,
 *   });
 *
 *   await sendEmail("submission_rejected", submitterEmail, {
 *     appName, locationName, submissionId, reason, adminNote, kind,
 *   });
 */
export async function sendEmail(
  type: EmailType,
  recipient: string,
  data: SubmissionData | RejectionData,
): Promise<boolean> {
  const msg = type === "submission_rejected"
    ? buildRejectionEmail(data as RejectionData)
    : buildSubmissionEmail(data as SubmissionData);
  msg.to = recipient;
  return getProvider().send(msg);
}
