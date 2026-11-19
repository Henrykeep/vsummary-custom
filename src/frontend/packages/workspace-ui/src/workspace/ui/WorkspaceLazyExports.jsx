import { lazy, Suspense } from "react";

const LazyGenerationOverlay = lazy(() =>
  import("./WorkspaceGenerationOverlay").then((module) => ({
    default: module.WorkspaceGenerationOverlay,
  })),
);
const LazyMarkdownMessage = lazy(() =>
  import("./shared/WorkspaceMarkdownMessage").then((module) => ({
    default: module.WorkspaceMarkdownMessage,
  })),
);
const LazyMindmapCanvas = lazy(() =>
  import("./MindmapCanvas").then((module) => ({
    default: module.MindmapCanvas,
  })),
);

/**
 * These renderers are exported for hosts that render them outside the workspace
 * shell. Keep the public component names synchronous, but load their heavy
 * dependencies only when a host actually mounts them.
 */
export function WorkspaceGenerationOverlay(props) {
  return (
    <Suspense fallback={null}>
      <LazyGenerationOverlay {...props} />
    </Suspense>
  );
}

export function WorkspaceMarkdownMessage(props) {
  return (
    <Suspense fallback={null}>
      <LazyMarkdownMessage {...props} />
    </Suspense>
  );
}

export function MindmapCanvas(props) {
  return (
    <Suspense fallback={<div className="absolute inset-0" aria-busy="true" />}>
      <LazyMindmapCanvas {...props} />
    </Suspense>
  );
}
