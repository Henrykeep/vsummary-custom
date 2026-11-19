import { ChevronLeft } from "lucide-react";

/**
 * 工具页里所有「返回」类按钮的唯一实现。
 *
 * 这个按钮此前在四个地方各写了一份，圆角从 rounded-lg / rounded-full / rounded-xl
 * 不等，字号 12px / 14px 混杂，有的带边框有的不带，视频预览页甚至用的是字符 `←`
 * 而不是图标组件 —— 同一件事渲染出四种样子。
 *
 * 现在统一为「裸文字」形态：常态无边框、无底色，只有 hover 时浮出一层浅底。
 * 这是刻意的选择 —— 工具页头部已经有一个导出菜单，再叠两个描边方块会让
 * 头部视觉重量过载；裸文字让返回动作退到次要位置，符合它的层级。
 *
 * 变体：
 *   leading — 工具页头左侧；窄面板只显示 32×32 图标，@[480px] 后才显示文字
 *   breadcrumb — 面板头与嵌入式工具页：父级名称始终可读，窄容器缩成短名称
 *   compact — 嵌在标题行里（AI 对话头），12px，间距更紧
 *   panel — 嵌在工作区面板标题栏，28×28 图标，对齐相邻操作
 *   chevron — 笔记列表内部返回，保留 ChevronLeft 的方向语义
 */
export function WorkspaceBackButton({
  onClick,
  label = "返回工具页",
  variant = "default",
  visibleLabel = null,
  compactLabel = null,
  icon: IconOverride,
  className = "",
}) {
  const isLeading = variant === "leading";
  const isPanel = variant === "panel";
  const isBreadcrumb = variant === "breadcrumb";
  const Icon = IconOverride ?? ChevronLeft;
  const gap = variant === "compact" ? "gap-1" : "gap-1.5";
  const padding = isBreadcrumb
    ? "h-8 gap-1 rounded-lg px-1.5"
    : isLeading
      ? "h-9 w-9 justify-center p-0 @[480px]:w-auto @[480px]:px-2.5"
      : variant === "compact"
        ? "px-1.5 py-0.5"
        : isPanel
          ? "h-8 w-8 justify-center p-0"
          : "px-2.5 py-1.5";
  const rounded = isBreadcrumb ? "" : "rounded-full";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`workspace-back-button ${isBreadcrumb ? "workspace-back-button--breadcrumb" : ""} inline-flex shrink-0 items-center ${gap} whitespace-nowrap ${padding} ${rounded} text-xs font-semibold text-subtle transition-colors hover:bg-soft hover:text-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${className}`}
    >
      <Icon size={isLeading ? 18 : isPanel ? 16 : isBreadcrumb ? 16 : 14} strokeWidth={2.2} />
      {isBreadcrumb ? (
        <>
          <span className="@[430px]:hidden">{compactLabel ?? label}</span>
          <span className="hidden @[430px]:inline">{visibleLabel ?? label}</span>
        </>
      ) : isLeading ? (
        <span className="hidden @[480px]:inline">{visibleLabel ?? label}</span>
      ) : isPanel ? null : label}
    </button>
  );
}
