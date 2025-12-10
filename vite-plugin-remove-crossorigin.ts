import type { Plugin } from 'vite';

/**
 * Vite plugin to remove crossorigin attributes from script and link tags
 * This is needed for Capacitor apps where crossorigin can cause issues
 */
export function removeCrossorigin(): Plugin {
  return {
    name: 'remove-crossorigin',
    transformIndexHtml(html) {
      // Remove crossorigin attribute from script and link tags
      return html
        .replace(/<script([^>]*)\scrossorigin([^>]*)>/gi, '<script$1$2>')
        .replace(/<link([^>]*)\scrossorigin([^>]*)>/gi, '<link$1$2>');
    },
  };
}

