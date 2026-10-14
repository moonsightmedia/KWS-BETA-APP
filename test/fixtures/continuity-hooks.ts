export * from './filter-user-hooks';
import { useBouldersWithSectors as base } from './filter-user-hooks';
export const useAuth = () => ({user:new URLSearchParams(location.search).get('start') === '/guest' ? null : {id:'fixture-setter'},session:null,loading:false});
export function useBouldersWithSectors() {
  const query = base();
  return {...query, data: query.data?.map(b => ({...b, createdAt: new Date(), betaVideoUrl: '/test/fixtures/vertical-player.mp4', betaVideoUrls: {hd:'/test/fixtures/vertical-player.mp4?hd',sd:'/test/fixtures/vertical-player.mp4?sd',low:'/test/fixtures/vertical-player.mp4?low'}}))};
}
export const useMyTrackedBoulders = () => ({data:[],isLoading:false,isError:false});
export const useMyTrackingSessions = () => ({data:[],isLoading:false,isError:false});
