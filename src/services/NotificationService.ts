import { PROXIMITY_PRESETS, ProximityMode } from '../models';

// ── Local notification service ──
// In a real app, this would use react-native-push-notification or Notifee
// For now, we use a state-based approach

export interface NotificationEvent {
  id: string;
  title: string;
  body: string;
  locationId: string;
  timestamp: number;
  read: boolean;
  /** Soft prompt: user can dismiss or take action */
  actions?: { label: string; action: 'view' | 'navigate' }[];
}

/** Current threshold in meters (defaults to Driving / 3 miles) */
let currentThreshold = PROXIMITY_PRESETS.driving.meters;

/** Active exploration city — notifications only fire for locations in this city */
let activeCity: string | null = null;

let notificationListeners: Array<(notification: NotificationEvent) => void> = [];

export const NotificationService = {
  // Register a listener for notification events
  addListener: (listener: (notification: NotificationEvent) => void) => {
    notificationListeners.push(listener);
    return () => {
      notificationListeners = notificationListeners.filter((l) => l !== listener);
    };
  },

  /** Get the current proximity threshold in meters */
  getThreshold: (): number => currentThreshold,

  /** Update the proximity threshold by travel mode */
  setProximityMode: (mode: ProximityMode) => {
    currentThreshold = PROXIMITY_PRESETS[mode].meters;
  },

  /** Update the proximity threshold to an arbitrary meter value */
  setThreshold: (meters: number) => {
    currentThreshold = meters;
  },

  /** Get the current proximity mode (best match) */
  getProximityMode: (): ProximityMode => {
    for (const [mode, preset] of Object.entries(PROXIMITY_PRESETS)) {
      if (preset.meters === currentThreshold) return mode as ProximityMode;
    }
    return 'driving';
  },

  /** Set the active exploration city — notifications only fire for locations in this city */
  setActiveCity: (city: string | null) => { activeCity = city; },
  getActiveCity: (): string | null => activeCity,

  // Fire a soft-prompt notification (gentle nudge)
  fireNotification: (
    locationName: string,
    movieOrShow: string,
    locationId: string,
  ) => {
    const notification: NotificationEvent = {
      id: `notif-${Date.now()}`,
      title: '📍 Scene Nearby',
      body: `You're near ${locationName} from ${movieOrShow}. Would you like to explore?`,
      locationId,
      timestamp: Date.now(),
      read: false,
      actions: [
        { label: 'View Details', action: 'view' },
        { label: 'Navigate', action: 'navigate' },
      ],
    };

    // Notify listeners (UI handles showing the soft prompt)
    notificationListeners.forEach((listener) => listener(notification));

    return notification;
  },

  // Simulate checking location proximity with configurable threshold
  checkProximity: (
    userLat: number,
    userLng: number,
    savedLocations: { id: string; title: string; movieOrShow: string; latitude: number; longitude: number; city?: string }[],
    thresholdMeters?: number,
  ): NotificationEvent | null => {
    const threshold = thresholdMeters ?? currentThreshold;
    // Only check locations within the active exploration city
    const filtered = activeCity
      ? savedLocations.filter((loc) => (loc.city || '').toLowerCase().includes(activeCity!.toLowerCase().split(' ')[0]))
      : savedLocations;
    for (const loc of filtered) {
      const distance = calculateDistance(userLat, userLng, loc.latitude, loc.longitude);
      if (distance <= threshold) {
        return NotificationService.fireNotification(
          loc.title,
          loc.movieOrShow,
          loc.id,
        );
      }
    }
    return null;
  },
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}