import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import { TooltipProvider } from "./components/ui/tooltip";
import { FileRename } from "./file-rename";

const container = document.getElementById("root");

const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="lunarscribe-theme">
      <TooltipProvider delayDuration={300} skipDelayDuration={150}>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex h-screen w-full flex-col overflow-hidden">
            <header className="flex items-center gap-2 p-2">
              <SidebarTrigger />
              <FileRename />
            </header>
            <App />
          </main>
          <Toaster />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
