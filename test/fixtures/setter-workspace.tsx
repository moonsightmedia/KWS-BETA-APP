// Real Setter pages with test-only, in-memory data. Never performs a production write.
import React from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import SetterCreatePage from "@/pages/setter/SetterCreatePage";
import SetterEditPage from "@/pages/setter/SetterEditPage";
import SetterStatusPage from "@/pages/setter/SetterStatusPage";
import SetterSchedulePage from "@/pages/setter/SetterSchedulePage";
import "@/index.css";

const pages = {
  create: [SetterCreatePage, "Erstellen"],
  edit: [SetterEditPage, "Bearbeiten"],
  status: [SetterStatusPage, "Status"],
  schedule: [SetterSchedulePage, "Planung"],
} as const;
const key = (new URLSearchParams(location.search).get("page") ||
  "create") as keyof typeof pages;
const [Page, title] = pages[key];
const client = new QueryClient({
  defaultOptions: {
    queries: { retry: false, staleTime: Infinity },
    mutations: { retry: false },
  },
});
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <header className="bg-white px-4 py-4 md:px-8">
        <div className="mx-auto max-w-[1116px]">
          <p className="text-xs text-muted-foreground">
            Setterbereich · Isolierte Testdaten
          </p>
          <h1 className="font-heading text-4xl font-semibold">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-[1180px] px-4 pt-4 pb-32 md:px-8 md:pt-6">
        <Page />
      </main>
      <Toaster />
    </BrowserRouter>
  </QueryClientProvider>,
);
