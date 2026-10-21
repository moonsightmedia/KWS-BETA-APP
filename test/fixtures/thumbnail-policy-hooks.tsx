/** Test-only identities and transports. No live keys or accounts are used. */
const user={id:'thumbnail-policy-user',email:'qa@example.invalid'};
const session={user,access_token:'fixture-only'};
export const useAuth=()=>({user,session,loading:false});
export const useHasRole=()=>({hasRole:true,loading:false});
export const getCurrentSession=async()=>session;
export const authenticatedFetch: typeof fetch=(...args)=>window.fetch(...args);
export const createAuthenticatedUploadFetch=()=>authenticatedFetch;
export const getVideoApiBase=()=>location.origin+'/__forbidden-upload';
export const resumableUpload=async()=>{throw new Error('Uploads are forbidden in this isolated policy fixture.');};
const review=new URLSearchParams(location.search).has('review');
export const backendConfig={supabaseUrl:review?'https://review-api.kletterwelt-sauerland.de':'https://beta-api.kletterwelt-sauerland.de',publicKey:'fixture-only',environment:review?'review':'production'};
export const Capacitor={isNativePlatform:()=>new URLSearchParams(location.search).has('native')};
