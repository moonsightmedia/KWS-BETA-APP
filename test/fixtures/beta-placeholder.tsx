import { createRoot } from "react-dom/client";
import { BetaPlaceholder } from "@/components/boulder/BetaPlaceholder";
import BoulderDetail from "@/pages/BoulderDetail";
import { BoulderDetailDialog } from "@/components/BoulderDetailDialog";
import { SidebarProvider } from "@/components/SidebarContext";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/index.css";
const params = new URLSearchParams(location.search);
const mode = params.get("mode");
const example = { id: "b-0", name: "Grüne Welle", sector: "Bug A", color: "Grün" as const, difficulty: 4 as const,
  createdAt: new Date("2026-10-01T10:00:00Z"), thumbnailUrl: "/src/assets/boulderkarte-original.png" };
createRoot(document.getElementById("root")!).render(
  mode ? <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={["/boulders/b-0"]}><SidebarProvider>
      {mode === "dialog" ? <BoulderDetailDialog boulder={example} open onOpenChange={() => {}} />
        : <Routes><Route path="/boulders/:id" element={<BoulderDetail />} /></Routes>}
    </SidebarProvider></MemoryRouter>
  </QueryClientProvider> :
  <main className="grid min-h-dvh place-items-center bg-background p-4">
    <section className="w-full max-w-md">
      <h1 className="mb-4 text-base font-semibold">Vorschau · Beta folgt</h1>
      <div className="aspect-[4/5] overflow-hidden rounded-kws-card shadow-soft">
        <BetaPlaceholder boulderName="Grüne Welle" thumbnailUrl={params.has("withThumbnail") ? "/src/assets/boulderkarte-original.png" : undefined} />
      </div>
    </section>
  </main>,
);
