// Static root route tree for Yuniko.
 // App owns the existing in-app navigation, so TanStack Start only needs the
 // root document route for SSR and Cloudflare runtime handling.
import { Route as rootRoute } from "./routes/__root";

export const routeTree = rootRoute as any;
