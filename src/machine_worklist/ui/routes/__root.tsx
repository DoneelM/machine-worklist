import { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/apx/theme-provider";

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  component: () => (
    // Light by default: it reads best on a projector and a lit shop floor. Dark is one click away.
    <ThemeProvider defaultTheme="light" storageKey="machine-worklist-theme">
      <Outlet />
      <Toaster position="bottom-left" />
    </ThemeProvider>
  ),
});
