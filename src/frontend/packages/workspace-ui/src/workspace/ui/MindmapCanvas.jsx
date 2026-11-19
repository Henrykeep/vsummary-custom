import { useEffect, useId, useRef, useState } from "react";
import { Markmap } from "markmap-view";
import * as d3 from "d3";
import { Minus, Plus, Scan } from "lucide-react";

/**
 * markmap 默认值不适合这里的窄面板场景，统一在这里覆盖：
 *
 * - 初始取景按实际面板大小决定；手动移动或缩放后不再自动重置视角。
 * - fitRatio: 默认 0.95，配合外层卡片内边距会形成两层留白，收紧到 0.98。
 * - colorFreezeLevel: 默认按完整层级路径取色（如 0.2.1，每层都换色），
 *   导致橙/粉/紫/青混排、颜色无任何含义。截断路径再取色后，
 *   同一分支的子孙节点共色，颜色即"一级分类"。
 *
 *   注意取值是 2 而不是 1：根节点自身占第 0 段（path="0"），
 *   一级分支是 "0.1"、"0.2"…。freeze=1 会把所有一级分支截成同一个 "0"，
 *   结果是整张图只剩一种颜色；freeze=2 才能让每个一级分支各得一个颜色，
 *   且该分支下所有层级保持同色。
 */
export const MARKMAP_OPTIONS = {
  autoFit: false,
  fitRatio: 0.98,
  colorFreezeLevel: 2,
};

const zoomButtonClass = "inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-lg text-subtle hover:bg-soft hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60";

function layoutForWidth(width) {
  if (width >= 640) return { maxWidth: 0, spacingHorizontal: 80 };
  return { maxWidth: width < 360 ? 112 : 144, spacingHorizontal: 24 };
}

function frameInitialView(map, selectedId) {
  const { width, height } = map.svg.node().getBoundingClientRect();
  const { x1, x2, y1, y2 } = map.state.rect;
  const treeWidth = x2 - x1;
  const treeHeight = y2 - y1;
  if (!width || !height || !treeWidth || !treeHeight) return;
  const fitScale = Math.min(width / treeWidth, height / treeHeight) * map.options.fitRatio;
  if (width >= 640 || fitScale >= 0.875) {
    map.fit();
    return;
  }
  const selected = selectedId && map.g.selectAll("g.markmap-node").data().find((node) => node.payload?.id === selectedId);
  const anchor = (selected || map.state.data).state.rect;
  const x = treeWidth <= width ? (width - treeWidth) / 2 - x1 : Math.min(16 - x1, Math.max(width - 16 - x2, 16 - anchor.x));
  const y = treeHeight <= height ? (height - treeHeight) / 2 - y1 : Math.min(16 - y1, Math.max(height - 16 - y2, (height - anchor.height) / 2 - anchor.y));
  map.svg.call(map.zoom.transform, d3.zoomIdentity.translate(x, y));
}

export function MindmapCanvas({ root, selectedNodeId, onSelectNode, markmapRef, theme, children }) {
  const svgRef = useRef(null);
  const mmRef = useRef(null);
  const camera = useRef("initial");
  const selection = useRef({ selectedNodeId, onSelectNode });
  const [scale, setScale] = useState(1);
  const helpId = useId();

  useEffect(() => {
    selection.current = { selectedNodeId, onSelectNode };
  }, [selectedNodeId, onSelectNode]);

  useEffect(() => {
    if (!root || !svgRef.current) {
      mmRef.current?.destroy();
      mmRef.current = null;
      return;
    }

    mmRef.current?.destroy();

    const element = svgRef.current;
    const data = convertToMarkmapNode(root);
    const mm = Markmap.create(element, {
      ...MARKMAP_OPTIONS,
      ...layoutForWidth(element.clientWidth),
      duration: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? 0 : 200,
    });
    mmRef.current = mm;
    if (markmapRef) markmapRef.current = mm;
    camera.current = "initial";
    let ready = false;
    let resizeRevision = 0;
    const frameOnResize = async () => {
      if (!ready || mmRef.current !== mm || !element.clientWidth || !element.clientHeight) return;
      const revision = ++resizeRevision;
      const options = layoutForWidth(element.clientWidth);
      if (mm.options.maxWidth !== options.maxWidth) {
        mm.setOptions({ ...options, autoFit: false });
        await mm.renderData();
      }
      if (mmRef.current !== mm || revision !== resizeRevision) return;
      mm.options.autoFit = camera.current === "fit" || (camera.current === "initial" && element.clientWidth >= 640);
      if (camera.current === "fit") mm.fit();
      if (camera.current === "initial") frameInitialView(mm, selection.current.selectedNodeId);
    };
    mm.zoom.on("start.mindmap-view", (event) => {
      if (event.sourceEvent) {
        camera.current = "manual";
        mm.options.autoFit = false;
      }
    }).on("end.mindmap-view", (event) => setScale(event.transform.k));
    const observer = new ResizeObserver(frameOnResize);
    observer.observe(element);
    mm.setData(data).then(() => {
      ready = true;
      frameOnResize();
    });

    const preventTextSelection = (event) => {
      if (event.target.closest(".markmap-node")) {
        event.preventDefault();
      }
    };
    const selectNode = (nodeElement) => {
      if (!nodeElement || !selection.current.onSelectNode) return;
      const nodeData = d3.select(nodeElement).datum();
      if (!nodeData) return;
      selection.current.onSelectNode({
        id: nodeData.payload?.id,
        title: nodeData.content,
        summary: nodeData.payload?.summary,
        start_seconds: nodeData.payload?.startSeconds ?? 0,
        end_seconds: nodeData.payload?.endSeconds ?? 0,
        children: nodeData.children || [],
      });
    };
    element.addEventListener("mousedown", preventTextSelection, true);

    const svg = d3.select(svgRef.current);
    svg.on("mouseover.mindmap-hover", (event) => {
      event.target.closest(".markmap-node")?.classList.add("mindmap-hovered");
    });
    svg.on("mouseout.mindmap-hover", (event) => {
      const node = event.target.closest(".markmap-node");
      if (node && !node.contains(event.relatedTarget)) {
        node.classList.remove("mindmap-hovered");
      }
    });
    svg.on("click.mindmap-select", (event) => {
      if (event.target instanceof SVGCircleElement) {
        return;
      }
      const target = event.target.closest(".markmap-node");
      if (!target) return;
      event.preventDefault();
      selectNode(target);
    });

    return () => {
      observer.disconnect();
      mm.zoom.on(".mindmap-view", null);
      svg.interrupt().on(".mindmap-hover", null).on(".mindmap-select", null);
      element.removeEventListener("mousedown", preventTextSelection, true);
      mm.destroy();
      mmRef.current = null;
      if (markmapRef) markmapRef.current = null;
    };
  }, [root, markmapRef]);

  useEffect(() => {
    const svg = mmRef.current?.svg?.node();
    if (!svg || !root) return;
    const isDark = resolveDarkTheme(theme);
    if (isDark) {
      svg.classList.add("markmap-dark");
    } else {
      svg.classList.remove("markmap-dark");
    }
    applyMindmapTheme(svg);
  }, [root, theme]);

  useEffect(() => {
    if (!svgRef.current || !selectedNodeId) return;
    const svg = svgRef.current;
    svg.querySelectorAll(".mindmap-selected").forEach((el) =>
      el.classList.remove("mindmap-selected")
    );
    svg.querySelectorAll("g.markmap-node").forEach((g) => {
      const data = g.__data__;
      if (data?.payload?.id === selectedNodeId) {
        g.classList.add("mindmap-selected");
      }
    });
  }, [selectedNodeId, root]);

  if (!root) {
    return (
      <div className="p-8 text-subtle text-sm text-center">
        当前没有导图数据。
      </div>
    );
  }

  function zoomBy(factor) {
    const map = mmRef.current;
    if (!map) return;
    camera.current = "manual";
    map.options.autoFit = false;
    const svg = map.svg.interrupt();
    const current = d3.zoomTransform(svg.node()).k;
    const target = factor > 1 ? Math.max(current, Math.min(4, current * factor)) : Math.min(current, Math.max(0.1, current * factor));
    svg.call(map.zoom.scaleBy, target / current);
  }

  function fitMap() {
    const map = mmRef.current;
    if (!map) return;
    camera.current = "fit";
    map.options.autoFit = true;
    map.fit();
  }

  function panWithKeyboard(event) {
    const pan = { ArrowLeft: [64, 0], ArrowRight: [-64, 0], ArrowUp: [0, 64], ArrowDown: [0, -64] }[event.key];
    const map = mmRef.current;
    if (!pan || !map || event.target !== svgRef.current || event.altKey || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    camera.current = "manual";
    map.options.autoFit = false;
    const svg = map.svg.interrupt();
    const current = d3.zoomTransform(svg.node()).k;
    svg.call(map.zoom.translateBy, pan[0] / current, pan[1] / current);
  }

  return (
    <div className="flex h-full w-full min-h-0 min-w-0 flex-col">
      <div className="relative min-h-0 flex-1">
        <svg ref={svgRef} role="group" tabIndex={0} aria-label="思维导图画布" aria-describedby={helpId} onKeyDown={panWithKeyboard}
          className="mindmap-svg absolute inset-0 h-full w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60"
          style={{ background: "transparent", userSelect: "none", WebkitUserSelect: "none" }} />
      </div>
      <footer className="relative flex shrink-0 flex-wrap items-center justify-between gap-x-1 border-t border-line/70 bg-surface px-2 py-1 text-xs">
        <div role="group" aria-label="导图缩放" className="flex items-center">
          <button type="button" className={zoomButtonClass} aria-label="缩小导图" title="缩小导图" onClick={() => zoomBy(1 / 1.4)} disabled={scale <= 0.1}><Minus size={16} aria-hidden="true" /></button>
          <span className="min-w-[4ch] text-center font-medium tabular-nums text-subtle">{Math.round(scale * 100)}%</span>
          <button type="button" className={zoomButtonClass} aria-label="放大导图" title="放大导图" onClick={() => zoomBy(1.4)} disabled={scale >= 4}><Plus size={16} aria-hidden="true" /></button>
          <span className="mx-1 h-4 border-l border-line" aria-hidden="true" />
          <button type="button" className={`${zoomButtonClass} px-2`} aria-label="查看全图" title="缩放至整个导图" onClick={fitMap}><Scan size={16} aria-hidden="true" />全图</button>
        </div>
        <span id={helpId} className="sr-only">拖动或用方向键移动画布，点击全图可看到整个导图。</span>
        {children}
      </footer>
    </div>
  );
}

function convertToMarkmapNode(node) {
  return {
    content: node.title,
    payload: {
      id: node.id,
      summary: node.summary,
      startSeconds: node.start_seconds,
      endSeconds: node.end_seconds,
    },
    children: (node.children || []).map(convertToMarkmapNode),
  };
}

function resolveDarkTheme(theme) {
  return theme === "dark" || ((theme == null || theme === "system") && document.documentElement.classList.contains("dark"));
}

// The theme variables switch with the .dark class, so one set of values covers both modes.
function applyMindmapTheme(svg) {
  if (!svg.style?.setProperty) return;
  svg.style.setProperty("--markmap-text-color", "rgb(var(--strong))");
  svg.style.setProperty("--markmap-code-color", "rgb(var(--body))");
  svg.style.setProperty("--markmap-code-bg", "rgb(var(--soft))");
  svg.style.setProperty("--markmap-circle-open-bg", "rgb(var(--surface))");
}
