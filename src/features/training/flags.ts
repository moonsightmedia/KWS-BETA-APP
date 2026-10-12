// UI preview is opt-in and does not enable a production training service.
export const TRAINING_UI_ENABLED = import.meta.env.VITE_TRAINING_UI_PREVIEW === 'true';
export const APP_USER_ROUTES = TRAINING_UI_ENABLED ? ['/', '/boulders', '/statistics', '/training'] : ['/', '/boulders', '/statistics'];
