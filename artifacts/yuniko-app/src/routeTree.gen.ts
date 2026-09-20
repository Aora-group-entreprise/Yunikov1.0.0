// Static route tree for Yuniko.
// The repository intentionally keeps this small so Cloudflare builds do not
// depend on a generated route-tree step.
import { Route as rootRoute } from "./routes/__root";
import { Route as indexRoute } from "./routes/index";
import { Route as splatRoute } from "./routes/$";

export const routeTree = (rootRoute as any).addChildren([
  indexRoute as any,
  splatRoute as any,
]) as any;
