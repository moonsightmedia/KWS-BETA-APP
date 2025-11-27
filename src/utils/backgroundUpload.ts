/**
 * Background Upload Utility
 * Uses Service Worker and Background Sync API to upload files even when tab is closed
 */

interface UploadData {
  url: string;
  method?: string;
  headers: Record<string, string>;
  fileData: ArrayBuffer;
  chunkIndex?: number;
  totalChunks?: number;
  uploadSessionId?: string;
  onProgress?: (progress: number) => void;
}

/**
 * Queue an upload to be processed by the service worker
 * This allows uploads to continue even when the tab is closed
 */
export async function queueBackgroundUpload(uploadData: UploadData): Promise<{ id: number; success: boolean }> {
  return new Promise((resolve, reject) => {
    if (!('serviceWorker' in navigator)) {
      reject(new Error('Service Worker not supported'));
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (!registration.active) {
        reject(new Error('Service Worker not active'));
        return;
      }

      // Create a message channel for response
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.success) {
          resolve({ id: event.data.id, success: true });
        } else {
          reject(new Error(event.data.error || 'Failed to queue upload'));
        }
      };

      // Send upload data to service worker
      registration.active!.postMessage(
        {
          type: 'QUEUE_UPLOAD',
          uploadData: {
            ...uploadData,
            // Convert ArrayBuffer to array for IndexedDB storage
            fileData: Array.from(new Uint8Array(uploadData.fileData)),
          },
        },
        [messageChannel.port2]
      );
    }).catch(reject);
  });
}

/**
 * Get status of queued uploads
 */
export async function getUploadQueueStatus(): Promise<Array<{
  id: number;
  status: string;
  error?: string;
  result?: any;
}>> {
  return new Promise((resolve, reject) => {
    if (!('serviceWorker' in navigator)) {
      reject(new Error('Service Worker not supported'));
      return;
    }

    navigator.serviceWorker.ready.then((registration) => {
      if (!registration.active) {
        reject(new Error('Service Worker not active'));
        return;
      }

      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.items || []);
        }
      };

      registration.active!.postMessage(
        { type: 'GET_QUEUE_STATUS' },
        [messageChannel.port2]
      );
    }).catch(reject);
  });
}

/**
 * Listen for upload completion/error events from service worker
 */
export function listenForUploadEvents(
  onComplete: (uploadId: number, result: any) => void,
  onError: (uploadId: number, error: string) => void
): () => void {
  if (!('serviceWorker' in navigator)) {
    return () => {};
  }

  const handleMessage = (event: MessageEvent) => {
    if (event.data.type === 'UPLOAD_COMPLETE') {
      onComplete(event.data.uploadId, event.data.result);
    } else if (event.data.type === 'UPLOAD_ERROR') {
      onError(event.data.uploadId, event.data.error);
    }
  };

  navigator.serviceWorker.addEventListener('message', handleMessage);

  // Return cleanup function
  return () => {
    navigator.serviceWorker.removeEventListener('message', handleMessage);
  };
}




