import { createFileRoute } from "@tanstack/react-router";
import App from "../App";

const fileRoute = createFileRoute as any;

export const Route = fileRoute("/$")({
  component: App,
});
