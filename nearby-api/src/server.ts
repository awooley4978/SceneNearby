// ── Nearby API Server ──
// Main entry point: starts Bun HTTP server on port 8080.
// Photo submission, moderation, gallery, and auto-publish workflow.

import { randomUUID } from "node:crypto";
import { Router } from "./router";
import {
  getSubmission,
  getSubmissions,
  getApprovedSubmissions,
  getApprovedByLocation,
  insertSubmission,
  approveSubmission,
  rejectSubmission,
  markRejectionEmail,
  getSubmissionCount,
  getPendingCount,
  getLocations,
  getLocationById,
  getLocationsByCity,
  getLocationsNearby,
  searchLocations,
  getRecentLocations,
} from "./db";
import { uploadSubmissionPhoto, approvePhoto } from "./r2";
import { sendEmail } from "./email";
import { REJECTION_REASONS } from "./types";
import { registerResearchRoutes } from "./research/routes";
import { startResearchWorker } from "./research/worker";
import { registerContributionRoutes } from "./contributions";
import { runMigrations } from "./migrations";
import type { PhotoSubmission, FilmingLocation, LocationSummary, LocationRecord, RejectionReason } from "./types";

const PORT = parseInt(process.env.PORT || "8080", 10);

// ── Helpers ──

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

function error(msg: string, status = 400): Response {
  return json({ error: msg }, status);
}

function corsPreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

/** Loose but strict enough email check for submitter notifications. */
function isEmail(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/** Pick the rejection-email tone per owner spec (see email.ts buildRejectionEmail). */
function rejectionKind(reason: string): "friendly" | "guidelines" | "other" {
  if (reason === "Inappropriate content") return "guidelines";
  if (reason === "Other") return "other";
  return "friendly";
}

// ── Router setup ──

const router = new Router();

// Health check
router.get("/health", () => {
  return json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/submissions — List submissions
router.get("/api/submissions", async (req) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") || undefined;
  const appName = url.searchParams.get("app_name") || undefined;
  const submissions = await getSubmissions(status, appName);
  return json(submissions);
});

// POST /api/submissions — Submit a photo
router.post("/api/submissions", async (req) => {
  try {
    const formData = await req.formData();
    const appName = formData.get("app_name") as string;
    const locationId = formData.get("location_id") as string;
    const locationName = formData.get("location_name") as string;
    const userInfo = formData.get("user_info") as string | null;
    const comment = formData.get("comment") as string | null;
    const photo = formData.get("photo") as File | null;

    if (!appName || !locationId || !locationName) {
      return error("app_name, location_id, and location_name are required");
    }
    if (!photo) return error("photo file is required");

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(photo.type)) {
      return error(`Invalid file type. Allowed: ${allowedTypes.join(", ")}`);
    }
    const maxSize = 10 * 1024 * 1024;
    if (photo.size > maxSize) {
      return error("File too large. Maximum size is 10 MB");
    }

    const submissionId = randomUUID();
    const timestamp = new Date().toISOString();
    const photoBuffer = new Uint8Array(await photo.arrayBuffer());
    const r2Key = await uploadSubmissionPhoto(appName, locationId, photoBuffer, photo.type, submissionId);

    const submission: PhotoSubmission = {
      id: submissionId,
      app_name: appName,
      location_id: locationId,
      location_name: locationName,
      user_info: userInfo || null,
      photo_path: r2Key,
      photo_public_url: null,
      comment: comment || null,
      submitted_at: timestamp,
      reviewed_by: null,
      reviewed_at: null,
      status: "pending",
    };
    await insertSubmission(submission);

    const publicUrl = `https://pub-d11c6004b03c42edb2633f3ec6a9317b.r2.dev/${r2Key}`;
    const notificationTo = process.env.NOTIFICATION_EMAIL_TO || "owner@scenenearby.dev";
    sendEmail("submission", notificationTo, {
      appName,
      locationName,
      locationId,
      submissionId,
      userInfo: userInfo || null,
      comment: comment || null,
      submittedAt: timestamp,
      photoUrl: publicUrl,
    });

    return json({ success: true, submission_id: submissionId, message: "Your photo has been submitted for review." }, 201);
  } catch (err) {
    console.error("Submission error:", err);
    return error("Internal server error during submission", 500);
  }
});

// POST /api/approve/:id — Approve a submission
router.post("/api/approve/:id", async (req, params) => {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const reviewedBy = (body as { reviewed_by?: string }).reviewed_by || "owner";
    const submission = await getSubmission(id);
    if (!submission) return error("Submission not found", 404);
    if (submission.status !== "pending") return error(`Submission is already ${submission.status}`, 400);

    const publicUrl = await approvePhoto(id, submission.photo_path, submission.location_id);
    await approveSubmission(id, reviewedBy, publicUrl);
    return json({ success: true, public_url: publicUrl });
  } catch (err) {
    console.error("Approval error:", err);
    return error("Internal server error during approval", 500);
  }
});

// POST /api/reject/:id — Reject a submission
// Requires a rejection_reason (one of REJECTION_REASONS); an optional
// rejection_note (used when reason is "Other"). If the submitter's user_info
// is a valid email, an automatic rejection email is attempted and the outcome
// is recorded on the submission (rejection_email_sent / rejection_email_to).
router.post("/api/reject/:id", async (req, params) => {
  try {
    const id = params.id;
    const body = await req.json().catch(() => ({}));
    const reviewedBy = (body as { reviewed_by?: string }).reviewed_by || "owner";
    const rejectionReason = (body as { rejection_reason?: string }).rejection_reason;
    const rejectionNote = (body as { rejection_note?: string | null }).rejection_note ?? null;

    if (!rejectionReason) return error("rejection_reason is required", 400);
    if (!(REJECTION_REASONS as readonly string[]).includes(rejectionReason)) {
      return error(`invalid rejection_reason. Allowed: ${REJECTION_REASONS.join(", ")}`, 400);
    }
    if (rejectionReason === "Other" && rejectionNote && rejectionNote.length > 500) {
      return error("rejection_note must be 500 characters or fewer", 400);
    }

    const submission = await getSubmission(id);
    if (!submission) return error("Submission not found", 404);
    if (submission.status !== "pending") return error(`Submission is already ${submission.status}`, 400);

    await rejectSubmission(id, reviewedBy, rejectionReason, rejectionNote);

    // Automatic rejection email — only when we have a real submitter email.
    let emailSent = false;
    if (isEmail(submission.user_info)) {
      const emailTo = submission.user_info.trim();
      emailSent = await sendEmail("submission_rejected", emailTo, {
        appName: submission.app_name,
        locationName: submission.location_name,
        submissionId: submission.id,
        reason: rejectionReason as RejectionReason,
        adminNote: rejectionNote,
        kind: rejectionKind(rejectionReason),
      });
      await markRejectionEmail(id, emailSent, emailTo);
    } else {
      console.log(`ℹ️  No submitter email for ${id} (user_info=${submission.user_info ?? "null"}) — skipping rejection email`);
      await markRejectionEmail(id, false, null);
    }

    return json({ success: true, email_sent: emailSent });
  } catch (err) {
    console.error("Rejection error:", err);
    return error("Internal server error during rejection", 500);
  }
});

// GET /api/gallery/:locationId — Get approved photos for a location
router.get("/api/gallery/:locationId", async (req, params) => {
  const photos = await getApprovedByLocation(params.locationId);
  return json(photos.map((p) => ({ id: p.id, url: p.photo_public_url, submitted_by: p.user_info || "Anonymous", submitted_at: p.submitted_at, comment: p.comment })));
});

// GET /api/gallery — All approved photos grouped by location
router.get("/api/gallery", async () => {
  const photos = await getApprovedSubmissions();
  const grouped: Record<string, unknown[]> = {};
  for (const p of photos) {
    if (!grouped[p.location_id]) grouped[p.location_id] = [];
    grouped[p.location_id].push({ id: p.id, url: p.photo_public_url, submitted_by: p.user_info || "Anonymous", submitted_at: p.submitted_at, comment: p.comment });
  }
  return json(grouped);
});

// GET /api/stats — System statistics
router.get("/api/stats", async () => {
  return json({ total_submissions: await getSubmissionCount(), pending_moderation: await getPendingCount() });
});

// ── Location helpers ──

function transformLocation(rec: LocationRecord): FilmingLocation {
  let actors: string[] = [];
  try { actors = rec.actors_json ? JSON.parse(rec.actors_json) : []; } catch { /* keep [] */ }
  
  let remoteDestination = null;
  try { remoteDestination = rec.remote_destination_json ? JSON.parse(rec.remote_destination_json) : null; } catch { /* keep null */ }

  return {
    id: rec.id,
    title: rec.title,
    movieOrShow: rec.movie_or_show,
    year: rec.year,
    category: rec.category,
    latitude: rec.latitude,
    longitude: rec.longitude,
    address: rec.address,
    city: rec.city,
    country: rec.country,
    sceneDescription: rec.scene_description,
    funFact: rec.fun_fact,
    quote: rec.quote,
    quoteAttribution: rec.quote_attribution,
    thenAndNow: rec.then_and_now,
    isMovie: rec.is_movie === 1,
    imageUrl: rec.image_url,
    focalPoint: (rec.focal_point_x != null && rec.focal_point_y != null) ? { x: rec.focal_point_x, y: rec.focal_point_y } : null,
    remoteDestination,
    actors,
    estimatedVisitTime: rec.estimated_visit_time,
    worthItPercentage: rec.worth_it_percentage,
    worthItVotes: rec.worth_it_votes,
    distance: (rec as any).distance,
    addedAt: (rec as any).added_at ?? null,
    source: (rec as any).source ?? "manual",
    approvedBy: (rec as any).approved_by ?? null,
  };
}

function toSummary(loc: FilmingLocation): LocationSummary {
  return {
    id: loc.id,
    title: loc.title,
    movieOrShow: loc.movieOrShow,
    year: loc.year,
    category: loc.category,
    latitude: loc.latitude,
    longitude: loc.longitude,
    address: loc.address,
    city: loc.city,
    country: loc.country,
    sceneDescription: loc.sceneDescription,
    actors: loc.actors,
    imageUrl: loc.imageUrl,
    focalPoint: loc.focalPoint,
    isMovie: loc.isMovie,
    distance: loc.distance,
  };
}

// ── Location endpoints ──

// GET /api/locations — All locations (supports ?limit, ?offset, ?fields=summary)
router.get("/api/locations", async (req) => {
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "50", 10);
  const offset = parseInt(url.searchParams.get("offset") || "0", 10);
  const fields = url.searchParams.get("fields") || "full";

  if (isNaN(limit) || limit < 1 || limit > 200) return error("limit must be 1-200", 400);
  if (isNaN(offset) || offset < 0) return error("offset must be >= 0", 400);

  const rows = await getLocations(limit, offset);
  const transformed = rows.map(transformLocation);
  if (fields === "summary") {
    return json(transformed.map(toSummary));
  }
  return json(transformed);
});

// GET /api/locations/city/:city — Locations by city
router.get("/api/locations/city/:city", async (req, params) => {
  const rows = await getLocationsByCity(params.city);
  return json(rows.map(transformLocation));
});

// GET /api/locations/nearby — Locations near coordinates
router.get("/api/locations/nearby", async (req) => {
  const url = new URL(req.url);
  const lat = parseFloat(url.searchParams.get("lat") || "");
  const lng = parseFloat(url.searchParams.get("lng") || "");
  const radius = parseFloat(url.searchParams.get("radius") || "5");
  const fields = url.searchParams.get("fields") || "full";

  if (isNaN(lat) || lat < -90 || lat > 90) return error("lat must be a valid latitude (-90 to 90)", 400);
  if (isNaN(lng) || lng < -180 || lng > 180) return error("lng must be a valid longitude (-180 to 180)", 400);
  if (isNaN(radius) || radius < 0.1 || radius > 100) return error("radius must be 0.1-100 miles", 400);

  const rows = await getLocationsNearby(lat, lng, radius);
  const transformed = rows.map(transformLocation);
  if (fields === "summary") {
    return json(transformed.map(toSummary));
  }
  return json(transformed);
});

// GET /api/locations/search — Search locations
router.get("/api/locations/search", async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const type = url.searchParams.get("type") || "all";

  if (!q || q.trim().length < 2) return error("q must be at least 2 characters", 400);
  if (!["movie", "actor", "all"].includes(type)) return error("type must be movie, actor, or all", 400);

  const rows = await searchLocations(q.trim(), type);
  return json(rows.map(transformLocation));
});

// GET /api/locations/recent — Recently added locations (provenance feed)
// ?hours=120 (default) — newest first. Only records with an added_at timestamp
// (legacy pre-provenance records have none and are excluded by design).
router.get("/api/locations/recent", async (req) => {
  const url = new URL(req.url);
  const hours = Number(url.searchParams.get("hours") || "120");
  const rows = await getRecentLocations(hours);
  return json(rows.map(transformLocation));
});
// GET /api/locations/:id — Single location by ID
router.get("/api/locations/:id", async (req, params) => {
  const row = await getLocationById(params.id);
  if (!row) return error("Location not found", 404);
  return json(transformLocation(row));
});

// GET /api/places/:placeId — Proxy Google Places API
router.get("/api/places/:placeId", async (req, params) => {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return error("Google Places API key not configured", 503);

  try {
    const url = `https://places.googleapis.com/v1/places/${params.placeId}?fields=rating,userRatingCount,displayName,googleMapsUri&key=${apiKey}`;
    const resp = await fetch(url);
    if (!resp.ok) return error("Google Places API error", resp.status);
    const data: any = await resp.json();
    return json({
      rating: data.rating ?? null,
      reviewCount: data.userRatingCount ?? 0,
      placeId: params.placeId,
      displayName: data.displayName?.text ?? null,
      googleMapsUri: data.googleMapsUri ?? null,
    });
  } catch {
    return error("Failed to fetch from Google Places API", 502);
  }
});

// ── Server handler ──

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const method = req.method;
  if (method === "OPTIONS") return corsPreflight();

  const match = router.match(method, url.pathname);
  if (match) {
    try {
      return await match.handler(req, match.params);
    } catch (err) {
      // A single route error must NEVER kill the whole API (historically an
      // unhandled rejection here crashed the process and took /api down until a
      // manual restart). Isolate it and surface a clean 500 instead.
      console.error(`Route error: ${method} ${url.pathname}`, err);
      return error("Internal server error", 500);
    }
  }
  return error("Not found", 404);
}

// ── Start server ──
registerResearchRoutes(router);
registerContributionRoutes(router);
startResearchWorker();
// Apply additive schema migrations at boot (idempotent, never destructive).
runMigrations().catch((err) => {
  console.error("Migration failed (continuing):", err);
});

// Crash-proofing: never let a stray top-level rejection/exception kill the API.
// The watchdog restarts the process if it truly wedges, so logging and keeping
// the listener alive is the safer default for an HTTP API.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection (ignored):", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception (ignored):", err);
});

console.log(`
  ╔══════════════════════════════════════════╗
  ║        Nearby API Server v2              ║
  ║  Photo Submission · Moderation · Gallery ║
  ╚══════════════════════════════════════════╝
  Server: http://0.0.0.0:${PORT}
  R2: ${process.env.R2_ACCOUNT_ID ? "✅ Configured" : "⚠️  Mock mode (no R2 credentials)"}
  DB: ${process.env.DB_DRIVER === "libsql" ? "Turso SQLite (direct libsql client)" : "Turso SQLite (via team-db CLI)"}
`);

Bun.serve({
  port: PORT,
  hostname: "0.0.0.0",
  fetch: handleRequest,
});