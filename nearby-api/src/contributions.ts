// ── Community contribution flow (V1) ──
// Guided photo -> movie/show -> filming-location -> description submission.
//
// Every submission is stored PENDING-ONLY in photo_submissions and flows
// through admin moderation. Nothing user-created here becomes public on its
// own. This module reuses the existing R2 upload pipeline and the existing
// photo_submissions table (additive columns via src/migrations.ts).
//
// Security / data-safety rules enforced here:
//   - a photo is REQUIRED (no skip, no photo-less records)
//   - no direct public DB writes bypassing review (all rows start "pending")
//   - no arbitrary remote image URLs — only the R2 upload pipeline is used
//   - authenticated uid is preserved for ownership/audit; emails are never
//     exposed to the app publicly
//   - submissions can never overwrite existing approved location records
import { randomUUID } from "node:crypto";
import type { Router } from "./router";
import { esc, runQuery } from "./db";
import { insertContribution } from "./db";
import { getContributions, getSubmission, approveContributionStatus, rejectContributionStatus } from "./db";
import { uploadSubmissionPhoto } from "./r2";
import { sendEmail } from "./email";
import type { PhotoSubmission } from "./types";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
}
function error(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

interface ProposedMovie {
  movie_title: string;
  year?: number | null;
  type: "movie" | "show";
}
interface ProposedLocation {
  place_name?: string;
  address?: string;
  city?: string;
  scene_description?: string;
  source_evidence?: string;
}

function parseJSON<T>(raw: FormDataEntryValue | null): T | null {
  if (!raw || typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function registerContributionRoutes(router: Router): void {
  // ── Movie/show list for the picker ──
  // Returns distinct known titles (from the live locations DB) so the user can
  // pick an existing movie/show or fall into the "missed one" new-title path.
  router.get("/api/contributions/titles", async (req) => {
    try {
      const url = new URL(req.url);
      const q = (url.searchParams.get("q") || "").trim().toLowerCase();
      const rows = (await runQuery(
        "SELECT DISTINCT movie_or_show FROM locations WHERE movie_or_show IS NOT NULL AND movie_or_show != '' ORDER BY movie_or_show"
      )) as { movie_or_show: string }[];
      const filtered = q
        ? rows.filter((r) => r.movie_or_show.toLowerCase().includes(q)).slice(0, 50)
        : rows.slice(0, 50);
      return json(filtered.map((r) => ({ title: r.movie_or_show })));
    } catch (err) {
      console.error("titles error:", err);
      return error("Internal error reading titles", 500);
    }
  });

  // ── Filming-location list for a given title ──
  // Existing Scene Nearby locations associated with a movie/show, so the user
  // can attach their photo to a known spot or fall into "Know a spot we missed?".
  router.get("/api/contributions/locations", async (req) => {
    try {
      const url = new URL(req.url);
      const title = (url.searchParams.get("title") || "").trim();
      if (!title) return error("title is required", 400);
      const rows = (await runQuery(
        `SELECT id, title, city, address, movie_or_show FROM locations WHERE lower(movie_or_show) = lower(${esc(title)}) ORDER BY title`
      )) as { id: string; title: string; city: string; address: string; movie_or_show: string }[];
      return json(rows.map((r) => ({
        locationId: r.id,
        title: r.title,
        city: r.city,
        address: r.address,
      })));
    } catch (err) {
      console.error("locations-by-title error:", err);
      return error("Internal error reading locations", 500);
    }
  });

  // ── Submit a community contribution ──
  router.post("/api/contributions", async (req) => {
    try {
      const formData = await req.formData();
      const photo = formData.get("photo") as File | null;
      // ── Photo is REQUIRED (core product rule) ──
      if (!photo) return error("A photo is required.", 400);
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
      if (!allowedTypes.includes(photo.type)) {
        return error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
      }
      const maxSize = 10 * 1024 * 1024;
      if (photo.size > maxSize) return error("File too large. Maximum size is 10 MB");

      const appName = (formData.get("app_name") as string) || "Scene Nearby";
      const locationId = (formData.get("location_id") as string) || "";
      const locationName = (formData.get("location_name") as string) || "";
      const movieOrShow = (formData.get("movie_or_show") as string) || null; // EXISTING title
      const proposedMovie = parseJSON<ProposedMovie>(formData.get("proposed_movie_json")); // NEW title
      const proposedLocation = parseJSON<ProposedLocation>(formData.get("proposed_location_json")); // NEW location
      const description = (formData.get("description") as string) || null;
      const comment = (formData.get("comment") as string) || description;
      const userInfo = (formData.get("user_info") as string) || null;
      const uid = (formData.get("submitter_uid") as string) || null;
      const displayName = (formData.get("display_name") as string) || null;
      const allowPublicCredit = (formData.get("allow_public_credit") as string) !== "false";
      const rightsConfirmed = (formData.get("rights_confirmed") as string) === "true";
      const sourceEvidence = (formData.get("source_evidence") as string) || null;
      const license = (formData.get("license") as string)?.trim() || null;
      const licenseUrl = (formData.get("license_url") as string)?.trim() || null;

      // ── Rights affirmation is required before submission ──
      if (!rightsConfirmed) {
        return error("Please confirm you took this photo or have permission to share it.", 400);
      }

      // A contribution must resolve to either an existing title+location OR
      // propose missing data — but never drop both to unidentifiable "unknown".
      if (!movieOrShow && !proposedMovie) {
        return error("Please select or add a movie/show.", 400);
      }
      if (!locationId && !proposedLocation) {
        return error("Please select or add a filming location.", 400);
      }

      const submissionId = randomUUID();
      const timestamp = new Date().toISOString();
      const photoBuffer = new Uint8Array(await photo.arrayBuffer());
      const r2Key = await uploadSubmissionPhoto(appName, locationId || "pending", photoBuffer, photo.type, submissionId);
      const publicUrl = `https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/${r2Key}`;

      const sub: PhotoSubmission = {
        id: submissionId,
        app_name: appName,
        location_id: locationId || "pending",
        location_name: locationName || (proposedLocation?.place_name ?? "Pending location"),
        user_info: null, // never store raw public email in this path; uid is the identity
        photo_path: r2Key,
        photo_public_url: null,
        comment,
        description,
        submitted_at: timestamp,
        reviewed_by: null,
        reviewed_at: null,
        status: "pending",
        movie_or_show: movieOrShow || proposedMovie?.movie_title || null,
        proposed_movie_json: proposedMovie ? JSON.stringify(proposedMovie) : null,
        proposed_location_json: proposedLocation ? JSON.stringify(proposedLocation) : null,
        submitter_uid: uid,
        display_name: allowPublicCredit ? displayName : null,
        allow_public_credit: allowPublicCredit ? 1 : 0,
        rights_confirmed: 1,
        photo_kind: "community",
        source_evidence: sourceEvidence,
        source: "community",
        license,
        license_url: licenseUrl,
      };

      await insertContribution(sub);

      // Notify owner for moderation (reuse the existing submission email type;
      // extra contribution context is folded into the comment field).
      try {
        const extra = [
          `movie/show: ${sub.movie_or_show || "PROPOSED"}`,
          sub.proposed_movie_json ? `proposed movie: ${sub.proposed_movie_json}` : null,
          sub.proposed_location_json ? `proposed location: ${sub.proposed_location_json}` : null,
        ].filter(Boolean).join(" | ");
        sendEmail("submission", process.env.NOTIFICATION_EMAIL_TO || "owner@scenenearby.dev", {
          appName,
          locationName: sub.location_name,
          locationId: sub.location_id,
          submissionId,
          userInfo: sub.display_name || null,
          comment: [sub.description, extra].filter(Boolean).join("\n"),
          submittedAt: timestamp,
          photoUrl: publicUrl,
        });
      } catch (e) {
        console.warn("contribution email notify failed:", e);
      }

      return json(
        {
          success: true,
          submission_id: submissionId,
          message: "Thanks! Scene Nearby received your photo and will review it.",
        },
        201
      );
    } catch (err) {
      console.error("Contribution error:", err);
      return error("Internal server error during contribution", 500);
    }
  });

  // ── Stage B: Admin review queue ──
  // Community contributions are reviewed here by moderation status only.
  // Approve/reject NEVER publish a proposed title/location, never change hero
  // imagery, and never surface a photo in the live app. Rejection preserves the
  // audit record (never deletes).

  const R2_PUBLIC = "https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev";

  // GET /api/contributions/review?status=pending
  router.get("/api/contributions/review", async (req) => {
    try {
      const url = new URL(req.url);
      const status = url.searchParams.get("status") || undefined;
      const rows = await getContributions(status);
      return json(
        rows.map((r) => ({
          id: r.id,
          status: r.status,
          photo_url: r.photo_path ? `${R2_PUBLIC}/${r.photo_path}` : null,
          movie_or_show: r.movie_or_show,
          proposed_movie_json: r.proposed_movie_json ? JSON.parse(r.proposed_movie_json) : null,
          location_id: r.location_id,
          location_name: r.location_name,
          proposed_location_json: r.proposed_location_json ? JSON.parse(r.proposed_location_json) : null,
          description: r.description,
          display_name: r.display_name,
          allow_public_credit: r.allow_public_credit === 1,
          rights_confirmed: r.rights_confirmed === 1,
          submitter_uid: r.submitter_uid,
          submitted_at: r.submitted_at,
          reviewed_by: r.reviewed_by,
          reviewed_at: r.reviewed_at,
          rejection_reason: r.rejection_reason,
          rejection_note: r.rejection_note,
        }))
      );
    } catch (err) {
      console.error("Contribution review list error:", err);
      return error("Internal error reading contributions", 500);
    }
  });

  // POST /api/contributions/review/:id/approve — status -> approved ONLY.
  router.post("/api/contributions/review/:id/approve", async (req, params) => {
    try {
      const body = await req.json().catch(() => ({}));
      const reviewedBy = (body as { reviewed_by?: string }).reviewed_by || "owner";
      const sub = await getSubmission(params.id);
      if (!sub) return error("Contribution not found", 404);
      if (sub.status !== "pending") return error(`Contribution is already ${sub.status}`, 400);
      await approveContributionStatus(params.id, reviewedBy);
      return json({ success: true, message: "Approved (moderation only — not published)." });
    } catch (err) {
      console.error("Contribution approve error:", err);
      return error("Internal error approving contribution", 500);
    }
  });

  // POST /api/contributions/review/:id/reject — status -> rejected (record kept).
  router.post("/api/contributions/review/:id/reject", async (req, params) => {
    try {
      const body = await req.json().catch(() => ({}));
      const reviewedBy = (body as { reviewed_by?: string }).reviewed_by || "owner";
      const reason = (body as { rejection_reason?: string | null }).rejection_reason ?? null;
      const note = (body as { rejection_note?: string | null }).rejection_note ?? null;
      const sub = await getSubmission(params.id);
      if (!sub) return error("Contribution not found", 404);
      if (sub.status !== "pending") return error(`Contribution is already ${sub.status}`, 400);
      await rejectContributionStatus(params.id, reviewedBy, reason, note);
      return json({ success: true, message: "Rejected (audit record retained)." });
    } catch (err) {
      console.error("Contribution reject error:", err);
      return error("Internal error rejecting contribution", 500);
    }
  });
}
