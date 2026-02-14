import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { DarkmodeToggle } from "@/components/ui/darkmode-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import App from "./App";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";

const container = document.getElementById("root");

const root = createRoot(container!);

root.render(
  <React.StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="lunarscribe-theme">
      <TooltipProvider delayDuration={300} skipDelayDuration={150}>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex h-screen w-full flex-col overflow-hidden p-2">
            <header className="mb-4 flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger />
                </TooltipTrigger>
                <TooltipContent>Toggle sidebar</TooltipContent>
              </Tooltip>
              <DarkmodeToggle />
            </header>
            <App />
          </main>
          <Toaster />
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
