import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import App from "../App";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../query-client";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Yuniko" },
    ],
  }),
  component: RootDocument,
});

function RootDocument() {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <QueryClientProvider client={queryClient}>
          <App />
        </QueryClientProvider>
        <Scripts />
      </body>
    </html>
  );
}
