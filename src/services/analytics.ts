// ── Firebase Analytics Service
import { Platform } from "react-native";

let analyticsModule: any = null;

async function getAnalytics() {
  if (analyticsModule !== null) return analyticsModule;
  try {
    const expoFirebase = await import("expo-firebase-analytics");
    analyticsModule = expoFirebase;
    return analyticsModule;
  } catch {
    return null;
  }
}

async function logEvent(name: string, params?: Record<string, any>) {
  const analytics = await getAnalytics();
  if (analytics) {
    try {
      await analytics.logEvent(name, { platform: Platform.OS, app_version: "1.0.0", ...params });
    } catch (e) { console.warn("[Analytics] logEvent failed:", e); }
  }
  if (__DEV__) console.log("[Analytics]", name, params ?? "");
}

export async function logOnboardingComplete(data: { activeCity?: string; travelStyle?: string; mediaInterests?: string[] }) {
  await logEvent("onboarding_complete", { active_city: data.activeCity ?? "unknown", travel_style: data.travelStyle ?? "unknown", media_interests: data.mediaInterests?.join(",") ?? "" });
}

export async function logLocationViewed(data: { locationId: string; movieTitle: string; category: string; city: string }) {
  await logEvent("location_view", { location_id: data.locationId, movie_title: data.movieTitle, category: data.category, city: data.city });
}

export async function logLocationSaved(data: { locationId: string; movieTitle: string }) {
  await logEvent("location_save", { location_id: data.locationId, movie_title: data.movieTitle });
}

export async function logLocationUnsaved(data: { locationId: string; movieTitle: string }) {
  await logEvent("location_unsave", { location_id: data.locationId, movie_title: data.movieTitle });
}

export async function logLocationNavigate(data: { locationId: string; appName: string }) {
  await logEvent("location_navigate", { location_id: data.locationId, navigate_app: data.appName });
}

export async function logLocationShared(data: { locationId: string; movieTitle: string }) {
  await logEvent("location_share", { location_id: data.locationId, movie_title: data.movieTitle });
}

export async function logSearchPerformed(data: { query: string; resultCount: number }) {
  await logEvent("search_performed", { search_query: data.query, result_count: data.resultCount });
}

export async function logMovieTapped(data: { movieTitle: string; source: string }) {
  await logEvent("movie_tap", { movie_title: data.movieTitle, source: data.source });
}

export async function logActorTapped(data: { actorName: string }) {
  await logEvent("actor_tap", { actor_name: data.actorName });
}

export async function logNotificationPrefsUpdated(data: { frequency: string; maxPerDay: number; proximityMode: string; quietHoursEnabled: boolean }) {
  await logEvent("notification_prefs_update", { frequency: data.frequency, max_per_day: data.maxPerDay, proximity_mode: data.proximityMode, quiet_hours: data.quietHoursEnabled ? "enabled" : "disabled" });
}

export async function logPremiumUpgrade() {
  await logEvent("premium_upgrade", {});
}

export async function logUserRating(data: { locationId: string; rating: number }) {
  await logEvent("user_rating", { location_id: data.locationId, rating: data.rating });
}

export async function logPhotoGalleryViewed(data: { locationId: string; photoCount: number }) {
  await logEvent("photo_gallery_view", { location_id: data.locationId, photo_count: data.photoCount });
}
