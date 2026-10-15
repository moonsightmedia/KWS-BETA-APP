// Unreleased: opt-in is restricted to the local development server. An old
// environment flag must never expose training in web or native release builds.
export const TRAINING_UI_ENABLED = import.meta.env.DEV && import.meta.env.VITE_TRAINING_UI_PREVIEW === 'true';
export const getAppUserRoutes = (trainingEnabled = true) => TRAINING_UI_ENABLED && trainingEnabled ? ['/', '/boulders', '/statistics', '/training'] : ['/', '/boulders', '/statistics'];
export const APP_USER_ROUTES = getAppUserRoutes();
