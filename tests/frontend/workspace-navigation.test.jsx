import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceBackButton } from "@workspace/workspace/ui/shared/WorkspaceBackButton";
import { WorkspaceToolGrid } from "@workspace/workspace/ui/shared/WorkspaceToolGrid";
import { WorkspaceToolHeader } from "@workspace/workspace/ui/shared/WorkspaceToolHeader";
import { WorkspaceSeriesOverviewView } from "@workspace/workspace/ui/views/WorkspaceSeriesOverviewView";

function TestIcon() {
  return null;
}

describe("workspace tool navigation", () => {
  it("renders the focused tool index and keeps blocked tools inert", () => {
    const onSelect = vi.fn();

    render(
      <WorkspaceToolGrid
        title="系列工具"
        contextTitle="ROS 2 入门系列"
        focusTarget
        onSelect={onSelect}
        items={[
          {
            id: "series-overview",
            meta: {
              label: "全局 AI 概括",
              description: "汇总全部视频的 AI 概括",
              icon: TestIcon,
            },
            status: { label: "已处理 21 / 21 视频", tone: "ready" },
          },
          {
            id: "series-mindmap",
            meta: {
              label: "全局思维导图",
              description: "梳理系列知识脉络",
              icon: TestIcon,
            },
            status: { label: "已生成", tone: "ready" },
          },
          {
            id: "knowledge-cards",
            meta: {
              label: "知识卡片",
              description: "等待概括生成后可查看",
              icon: TestIcon,
            },
            disabled: true,
          },
        ]}
      />,
    );

    const heading = screen.getByRole("heading", { name: "系列工具" });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(heading).toHaveAttribute("data-workspace-tool-index-heading");
    expect(screen.getByText("ROS 2 入门系列")).toBeInTheDocument();

    const mindmap = screen.getByRole("button", { name: "全局思维导图" });
    expect(mindmap).toHaveAttribute("data-workspace-tool", "series-mindmap");
    expect(mindmap).toHaveAttribute("data-workspace-tool-status", "ready");
    fireEvent.click(mindmap);
    expect(onSelect).toHaveBeenCalledWith("series-mindmap");

    const blocked = screen.getByRole("button", { name: "知识卡片" });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("uses one accessible breadcrumb name while adapting the visible label", () => {
    const onBack = vi.fn();

    render(
      <WorkspaceBackButton
        variant="breadcrumb"
        label="返回系列工具"
        visibleLabel="系列工具"
        compactLabel="系列"
        onClick={onBack}
      />,
    );

    const back = screen.getByRole("button", { name: "返回系列工具" });
    expect(back).toHaveClass("workspace-back-button--breadcrumb");
    expect(screen.getByText("系列工具")).toBeInTheDocument();
    expect(screen.getByText("系列")).toBeInTheDocument();
    fireEvent.click(back);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("keeps the tool breadcrumb separate from an accessible export menu", () => {
    const onBack = vi.fn();

    render(
      <WorkspaceToolHeader
        meta={{ label: "全局思维导图", description: "梳理系列知识脉络" }}
        parentLabel="系列工具"
        parentShortLabel="系列"
        onBack={onBack}
        exportActions={[
          { href: "/api/export/global-mindmap.md", label: "导出 MD", enabled: true },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "全局思维导图" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "返回系列工具" })).toBeInTheDocument();

    const exportButton = screen.getByRole("button", { name: "导出当前内容" });
    expect(exportButton).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(exportButton);

    expect(exportButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menu", { name: "导出选项" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "导出 MD" })).toHaveAttribute(
      "href",
      "/api/export/global-mindmap.md",
    );
  });

  it("opens the video summary target instead of the transcript for a missing summary", () => {
    const onOpenVideoSummary = vi.fn();
    const video = { id: "video-1", title: "1. ROS 与 ROS 2 是什么" };

    render(
      <WorkspaceSeriesOverviewView
        activeSeries={{ id: "series-1", videos: [video] }}
        ui={{}}
        summariesByVideoId={{}}
        loading={false}
        citationFocus={null}
        onOpenVideoSummary={onOpenVideoSummary}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "去生成概括" }));
    expect(onOpenVideoSummary).toHaveBeenCalledWith("video-1");
  });
});
