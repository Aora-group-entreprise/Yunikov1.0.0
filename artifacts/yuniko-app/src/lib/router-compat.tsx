import { isValidElement, type ReactNode } from "react";
import { useLocation as useTanLocation, useNavigate as useTanNavigate } from "@tanstack/react-router";

export function useLocation(): [string, (to: string) => void] {
  const location = useTanLocation({ select: (value) => value.pathname + value.search + value.hash });
  const navigate = useTanNavigate();
  return [location, (to) => { void navigate({ to: to as never }); }];
}

function matches(path: string, pattern: string) {
  if (pattern === "*" || pattern === "$") return true;
  const actual = path.split("?")[0].split("#")[0].split("/").filter(Boolean);
  const base = pattern.split("/").filter(Boolean);
  if (base.length !== actual.length) return false;
  return base.every((segment, i) => segment.startsWith(":") || segment === actual[i]);
}

export function Route({ path, component, children }: { path: string; component?: React.ComponentType<any>; children?: ReactNode }) {
  const [location] = useLocation();
  if (!matches(location, path)) return null;
  if (component) { const Component = component; return <Component />; }
  return <>{children}</>;
}

export function Switch({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (!isValidElement(child)) continue;
    const props = child.props as { path?: string };
    if (!props.path || matches(location, props.path)) return child;
  }
  return null;
}

export function Router({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useParams<T extends Record<string, string | undefined>>() {
  const [location] = useLocation();
  const parts = location.split("?")[0].split("#")[0].split("/").filter(Boolean);
  const params: Record<string, string | undefined> = {};
  if (parts[0] === "user" || parts[0] === "chat" || parts[0] === "followers" || parts[0] === "following") params.userId = parts[1];
  if (parts[0] === "story") params.id = parts[1];
  if (parts[0] === "post") params.postId = parts[1];
  if (parts[0] === "call") { params.userId = parts[1]; params.kind = parts[2]; }
  return params as T;
}
