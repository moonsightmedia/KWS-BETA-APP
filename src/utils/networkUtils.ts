/**
 * Network speed detection utilities for adaptive video quality selection
 */

export type NetworkSpeed = 'fast' | 'medium' | 'slow';
export type VideoQuality = 'hd' | 'sd' | 'low';

interface NetworkConnection {
  effectiveType?: string;
  downlink?: number;
  saveData?: boolean;
  onchange?: () => void;
}

declare global {
  interface Navigator {
    connection?: NetworkConnection;
    mozConnection?: NetworkConnection;
    webkitConnection?: NetworkConnection;
  }
}

/**
 * Detect network speed using browser APIs
 * @returns Network speed classification ('fast', 'medium', or 'slow')
 */
export function detectNetworkSpeed(): NetworkSpeed {
  // Check if browser is offline
  if (!navigator.onLine) {
    return 'slow';
  }

  // Try to use Network Information API (if available)
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (connection) {
    const effectiveType = connection.effectiveType;
    const downlink = connection.downlink;
    
    // Map effectiveType to network speed
    // More aggressive mapping for low-tier mobile devices
    if (effectiveType) {
      switch (effectiveType.toLowerCase()) {
        case '4g':
          // Only use fast if downlink is actually high enough
          if (downlink !== undefined && downlink >= 10) {
            return 'fast';
          }
          // Otherwise treat as medium even if it's "4g"
          return 'medium';
        case '3g':
          // 3G can be slow, check downlink
          if (downlink !== undefined && downlink < 2) {
            return 'slow';
          }
          return 'medium';
        case '2g':
        case 'slow-2g':
          return 'slow';
        default:
          // Fallback to downlink speed if effectiveType is unknown
          break;
      }
    }
    
    // Use downlink speed as fallback (Mbps)
    // Very aggressive thresholds for better experience on slow connections
    // Low-tier mobile typically has < 1 Mbps, so we need to be very conservative
    if (downlink !== undefined) {
      if (downlink >= 10) {
        return 'fast';
      } else if (downlink >= 3) {
        return 'medium';
      } else {
        // Anything below 3 Mbps is considered slow (including low-tier mobile)
        return 'slow';
      }
    }
  }
  
  // Fallback: assume slow speed if we can't detect
  // This is safer - will use Low quality by default, which works better on slow connections
  // Especially important for low-tier mobile devices
  return 'slow';
}

/**
 * Get optimal video quality based on network speed
 * @param networkSpeed - Detected network speed
 * @returns Recommended video quality ('hd', 'sd', or 'low')
 */
export function getOptimalVideoQuality(networkSpeed: NetworkSpeed = detectNetworkSpeed()): VideoQuality {
  switch (networkSpeed) {
    case 'fast':
      return 'hd';
    case 'medium':
      return 'sd';
    case 'slow':
      return 'low';
    default:
      return 'sd'; // Safe default
  }
}

/**
 * Check if data saver mode is enabled
 * @returns true if data saver is enabled
 */
export function isDataSaverEnabled(): boolean {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  return connection?.saveData === true;
}

/**
 * Get optimal video quality considering data saver mode
 * @param networkSpeed - Detected network speed (optional, will be detected if not provided)
 * @returns Recommended video quality, downgraded if data saver is enabled
 */
export function getOptimalVideoQualityWithDataSaver(
  networkSpeed?: NetworkSpeed
): VideoQuality {
  const speed = networkSpeed || detectNetworkSpeed();
  
  // If data saver is enabled, downgrade quality by one level
  if (isDataSaverEnabled()) {
    switch (speed) {
      case 'fast':
        return 'sd'; // Fast -> SD
      case 'medium':
        return 'low'; // Medium -> Low
      case 'slow':
        return 'low'; // Already at lowest
    }
  }
  
  return getOptimalVideoQuality(speed);
}

