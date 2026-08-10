import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getOnboardingData, setOnboardingData } from '../services/StorageService';

export interface UserLocationContextValue {
  activeCity: string;
  activeCityLat: number;
  activeCityLng: number;
  manualLocation: boolean;
  isLoaded: boolean;
  setActiveCity: (name: string, lat: number, lng: number) => Promise<void>;
}

const UserLocationContext = createContext<UserLocationContextValue>({
  activeCity: '',
  activeCityLat: 0,
  activeCityLng: 0,
  manualLocation: false,
  isLoaded: false,
  setActiveCity: async () => {},
});

export const useUserLocationContext = () => useContext(UserLocationContext);

export const UserLocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeCity, setActiveCityState] = useState('');
  const [activeCityLat, setActiveCityLat] = useState(0);
  const [activeCityLng, setActiveCityLng] = useState(0);
  const [manualLocation, setManualLocation] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load city from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      const data = await getOnboardingData();
      if (data?.activeCity) {
        setActiveCityState(data.activeCity);
        setActiveCityLat(data.activeCityLat ?? 0);
        setActiveCityLng(data.activeCityLng ?? 0);
        setManualLocation(data.manualLocation === true);
      }
      setIsLoaded(true);
    })();
  }, []);

  const setActiveCity = useCallback(async (name: string, lat: number, lng: number) => {
    // Update context state immediately (reactive)
    setActiveCityState(name);
    setActiveCityLat(lat);
    setActiveCityLng(lng);
    setManualLocation(true);

    // Persist to AsyncStorage
    await setOnboardingData({
      activeCity: name,
      activeCityLat: lat,
      activeCityLng: lng,
      manualLocation: true,
    });
  }, []);

  return (
    <UserLocationContext.Provider
      value={{ activeCity, activeCityLat, activeCityLng, manualLocation, isLoaded, setActiveCity }}
    >
      {children}
    </UserLocationContext.Provider>
  );
};
