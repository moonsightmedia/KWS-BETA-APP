export const App = { getInfo: async () => {
  if (new URLSearchParams(location.search).has('nativeError')) throw new Error('Synthetic native read error');
  return { id: 'com.kletterwelt.beta', name: 'KWS Beta App', version: '1.0.251', build: '85' };
} };
