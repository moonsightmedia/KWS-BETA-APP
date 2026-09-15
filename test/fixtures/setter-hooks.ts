import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import snapshot from "./hall-hierarchy-snapshot.json";
import { resolveSectorArea } from "@/lib/sectorAreas";
const state = {
  writes: [] as Array<{ kind: string; payload: unknown }>,
  fail: false,
  delay: 0,
  uploads: [] as string[],
  readError: null as string | null,
  readDelay: 0,
  refetch: async () => {},
};
declare global {
  interface Window {
    setterQA: typeof state;
  }
}
window.setterQA = state;
const params = new URLSearchParams(location.search);
const sectors = snapshot.sectors.map((s) => {
  const resolved = resolveSectorArea(s);
  return {
    ...s,
    legacyName: s.name,
    name: resolved.publicName,
    area: resolved.area,
    subareaCode: resolved.subareaCode,
    boulderCount: s.boulder_count,
  };
});
const colors = [
  { id: "green", name: "Grün", hex: "#36B531" },
  { id: "blue", name: "Blau", hex: "#336dcc" },
  { id: "white", name: "Weiß", hex: "#ffffff" },
  { id: "red", name: "Rot", hex: "#d33030" },
];
const attributes = [
  {
    id: "dual",
    key: "dual_color",
    label: "Zweifarbig",
    icon: "palette",
    is_active: true,
    sort_order: 1,
  },
  {
    id: "balance",
    key: "balance",
    label: "Balance",
    icon: "footprints",
    is_active: true,
    sort_order: 2,
  },
];
let boulders = Array.from(
  { length: params.has("many") ? 125 : params.has("empty") ? 0 : 12 },
  (_, i) => ({
    id: `b-${i}`,
    name:
      ["Grüne Welle", "Kleine Kante", "Blauer Horizont", "Roter Faden"][i % 4] +
      (i > 3 ? ` ${i + 1}` : ""),
    sector: sectors[i % 3].name,
    sectorId: sectors[i % 3].id,
    color: colors[i % 4].name,
    color2: i === 0 ? "Weiß" : null,
    difficulty: (i % 8) + 1,
    status: i % 3 === 0 ? "abgeschraubt" : "haengt",
    note: "",
    thumbnailUrl: "/src/assets/boulderkarte-original.png",
    betaVideoUrl: "/fixture-video.mp4",
  }),
);
let schedules = params.has("empty")
  ? []
  : [1, 2, -2].map((days, i) => ({
      id: `s-${i}`,
      sector_id: sectors[i].id,
      scheduled_at: new Date(Date.now() + days * 86400000).toISOString(),
      note: null,
    }));
if (params.has("calendar")) {
  schedules = [
    [2, "2026-09-16T08:00:00Z"], [18, "2026-09-16T08:00:00Z"],
    [0, "2026-09-16T09:30:00Z"], [1, "2026-09-16T11:00:00Z"],
    [0, "2026-09-17T22:30:00Z"], [1, "2026-08-31T08:00:00Z"],
    [0, "2026-10-01T08:00:00Z"], [1, "2026-12-31T08:00:00Z"],
  ].map(([sector, date], i) => ({ id: `cal-${i}`, sector_id: sectors[Number(sector)].id, scheduled_at: String(date), note: null }));
}
const read = <T>(key: string, value: T) =>
  useQuery({
    queryKey: [key],
    queryFn: async () => {
      if (state.readDelay || params.has('slow')) await new Promise(resolve => setTimeout(resolve, state.readDelay || 500));
      if (params.has("error") || state.readError === key) throw new Error("Isolierter Ladefehler");
      return value;
    },
  });
const record = async (kind: string, payload: unknown) => {
  state.writes.push({ kind, payload });
  await new Promise((r) => setTimeout(r, state.delay));
  if (state.fail) throw new Error("Isolierter Testfehler");
};
const mutation = <T>(kind: string, update: (payload: T) => void = () => {}) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: T) => {
      await record(kind, payload);
      update(payload);
      return payload;
    },
    onSuccess: () => qc.invalidateQueries(),
  });
};
export const useAuth = () => ({
  user: { id: "fixture-setter" },
  session: { access_token: "fixture-only-not-a-credential" },
  loading: false,
});
export const useColors = () => read("colors", colors);
export const useSectorsTransformed = () => read("sectors-transformed", sectors);
export const useSectors = () => read("sectors", snapshot.sectors);
export const useBouldersWithSectors = () =>
  useQuery({
    queryKey: ["boulders"],
    queryFn: async () => {
      if (state.readDelay || params.has('slow')) await new Promise(resolve => setTimeout(resolve, state.readDelay || 500));
      if (params.has("error") || state.readError === 'boulders') throw new Error("Isolierter Ladefehler");
      return [...boulders];
    },
  });
export const useUpdateBoulder = () => mutation("update-boulder");
export const useDeleteBoulder = () =>
  mutation<string>("delete-boulder", (id) => {
    boulders = boulders.filter((b) => b.id !== id);
  });
export const useBulkUpdateBoulderStatus = () =>
  mutation<{ ids: string[]; status: string }>("update-status", (p) => {
    boulders = boulders.map((b) =>
      p.ids.includes(b.id) ? { ...b, status: p.status } : b,
    );
  });
export const useBoulderAttributeCatalog = () => read("attributes", attributes);
export const useBoulderAttributeAssignments = (id: string) =>
  read(`attributes-${id}`, id === "b-0" ? ["dual"] : []);
export const useSetBoulderAttributes = () => mutation("attributes");
export const logBoulderOperation = async () => {};
export const useSectorSchedule = () =>
  useQuery({
    queryKey: ["schedule"],
    queryFn: async () => {
      if (params.has("error")) throw new Error("Isolierter Ladefehler");
      return [...schedules];
    },
  });
export const useCreateSectorScheduleGroup = () =>
  mutation<{ sectorIds: string[]; scheduledAt: string }>(
    "create-schedule",
    (p) => {
      schedules = [
        ...schedules,
        ...p.sectorIds.map((id, i) => ({
          id: `new-${i}`,
          sector_id: id,
          scheduled_at: p.scheduledAt,
          note: null,
        })),
      ];
    },
  );
export const useDeleteSectorScheduleGroup = () =>
  mutation<string[]>("delete-schedule", (ids) => {
    schedules = schedules.filter((s) => !ids.includes(s.id));
  });
export const useUpload = () => ({
  uploads: params.has('uploadState') ? [{
    sessionId: 'fixture-overview', fileName: 'Desktop-Upload.mp4', type: 'video',
    status: params.get('uploadState') === 'active' ? 'uploading' : params.get('uploadState'),
    progress: 42,
  }] : [],
  isUploading: params.get('uploadState') === 'active',
  resumeUpload: async () => {},
  cancelUpload: async () => {},
  removeUpload: async () => {},
  startUpload: async (id: string, _file: unknown, kind: string) => {
    await record("upload-start", { id, kind });
    state.uploads.push(kind);
    return `${id}-${kind}`;
  },
  waitForUploadSessions: async (ids: string[]) => {
    await record("upload-wait", ids);
  },
});
export const useActiveHallMap = () => read("hall_map", snapshot.map);
export const useSectorMapRegions = () => read("regions", snapshot.regions);
