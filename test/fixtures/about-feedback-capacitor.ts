export const Capacitor = {
  getPlatform: () => new URLSearchParams(location.search).get('native') || 'web',
  isNativePlatform: () => new URLSearchParams(location.search).has('native'),
};
