// UI preview is opt-in and does not enable a production training service.
export const TRAINING_UI_ENABLED = import.meta.env.VITE_TRAINING_UI_PREVIEW === 'true';
export const getAppUserRoutes = (trainingEnabled = true) => TRAINING_UI_ENABLED && trainingEnabled ? ['/', '/boulders', '/statistics', '/training'] : ['/', '/boulders', '/statistics'];
export const APP_USER_ROUTES = getAppUserRoutes();
