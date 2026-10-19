import * as actual from '../../src/lib/backendConfig';
export {backendStorageKey,isReviewAvailable,isReviewEnvironment,switchBackendEnvironment} from '../../src/lib/backendConfig';
// QA transport adapter only: real HTTPS upstreams with validated certificates.
// URL spelling changes at the local proxy boundary; no API results are invented.
export const backendConfig = actual.isReviewEnvironment ? {
  ...actual.backendConfig,supabaseUrl:'http://127.0.0.1:4198/__review-api',
  videoUrl:'http://127.0.0.1:4198/__review-video',nativeVideoUrl:'http://127.0.0.1:4198/__review-video',
  legacyUploadUrl:'http://127.0.0.1:4198/__review-video',
}:actual.backendConfig;
