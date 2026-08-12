// STUB (chunk1): in-memory onboarding storage — no AsyncStorage
let complete = false;
let data: any = null;

export const getOnboardingComplete = async () => complete;
export const setOnboardingComplete = async (v: boolean) => { complete = v; };
export const getOnboardingData = async () => data;
export const setOnboardingData = async (d: any) => { data = d; };
export const resetOnboarding = async () => { complete = false; data = null; };
