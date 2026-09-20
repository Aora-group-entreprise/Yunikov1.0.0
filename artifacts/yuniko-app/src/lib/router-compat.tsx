import { isValidElement, useSyncExternalStore, type ComponentType, type ReactNode } from "react";

function getPath() {
  if (typeof window === "undefined") return "/";
  return window.location.pathname + window.location.search + window.location.hash;
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("popstate", callback);
  return () => window.removeEventListener("popstate", callback);
}

function navigateTo(to: string) {
  if (typeof window === "undefined") return;
  window.history.pushState({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function useLocation(): [string, (to: string) => void] {
  const location = useSyncExternalStore(subscribe, getPath, () => "/");
  return [location, navigateTo];
}

function matches(path: string, pattern: string) {
  if (pattern === "*" || pattern === "$") return true;
  const actual = path.split("?")[0].split("#")[0].split("/").filter(Boolean);
  const base = pattern.split("/").filter(Boolean);
  if (base.length !== actual.length) return false;
  return base.every((segment, i) => segment.startsWith(":") || segment === actual[i]);
}

function extractParams(path: string, pattern: string) {
  const actual = path.split("?")[0].split("#")[0].split("/").filter(Boolean);
  const base = pattern.split("/").filter(Boolean);
  const params: Record<string, string> = {};
  base.forEach((segment, i) => {
    if (segment.startsWith(":") && actual[i] !== undefined) params[segment.slice(1)] = actual[i];
  });
  return params;
}

export function Route({
  path,
  component,
  children,
}: {
  path?: string;
  component?: ComponentType<any>;
  children?: ReactNode | ((params: Record<string, string>) => ReactNode);
}) {
  const [location] = useLocation();
  if (path && !matches(location, path)) return null;
  if (component) {
    const Component = component;
    return <Component />;
  }
  if (typeof children === "function") {
    return <>{children(path ? extractParams(location, path) : {})}</>;
  }
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

export function Router({ children }: { children: ReactNode; base?: string }) {
  return <>{children}</>;
}

export function useParams<T extends Record<string, string | undefined>>() {
  const [location] = useLocation();
  const parts = location.split("?")[0].split("#")[0].split("/").filter(Boolean);
  const params: Record<string, string | undefined> = {};
  if (parts[0] === "user" || parts[0] === "chat" || parts[0] === "followers" || parts[0] === "following") params.userId = parts[1];
  if (parts[0] === "story") params.id = parts[1];
  if (parts[0] === "post") params.postId = parts[1];
  if (parts[0] === "call") {
    params.userId = parts[1];
    params.kind = parts[2];
  }
  return params as T;
}
