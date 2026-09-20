// Static route tree for Yuniko.
// The application uses its existing in-app router compatibility layer for
// internal screens, so TanStack Start only needs the root index route here.
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";

export const routeTree = (rootRoute as any).addChildren([
  indexRoute as any,
]) as any;
