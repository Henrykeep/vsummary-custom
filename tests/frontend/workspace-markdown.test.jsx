import { describe, expect, it } from "vitest";

import { remarkRepairBoldDelimiterFlanking } from "@workspace/workspace/model/markdownBoldCompat";

function collectNodes(node, type, matches = []) {
  if (node.type === type) {
    matches.push(node);
  }
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => collectNodes(child, type, matches));
  }
  return matches;
}

function textContent(node) {
  if (node.type === "text" || node.type === "inlineCode") {
    return node.value;
  }
  return Array.isArray(node.children) ? node.children.map(textContent).join("") : "";
}

function transformParagraph(children) {
  const tree = {
    type: "root",
    children: [{ type: "paragraph", children }],
  };
  remarkRepairBoldDelimiterFlanking()(tree);
  return tree;
}

describe("markdown bold compatibility", () => {
  it("repairs Chinese punctuation directly followed by text", () => {
    const tree = transformParagraph([
      { type: "text", value: "**应用层：**ROS1 依赖 Master 管理节点；ROS2 不再设置 Master。" },
    ]);
    const strongNodes = collectNodes(tree, "strong");

    expect(strongNodes).toHaveLength(1);
    expect(textContent(strongNodes[0])).toBe("应用层：");
    expect(textContent(tree)).toBe("应用层：ROS1 依赖 Master 管理节点；ROS2 不再设置 Master。");
  });

  it("keeps valid bold syntax and code spans unchanged", () => {
    const boldNode = {
      type: "strong",
      children: [{ type: "text", value: "应用层：" }],
    };
    const codeNode = { type: "inlineCode", value: "**应用层：**ROS1" };
    const tree = transformParagraph([
      boldNode,
      { type: "text", value: " ROS1 依赖 Master。" },
      codeNode,
    ]);
    const strongNodes = collectNodes(tree, "strong");
    const codeNodes = collectNodes(tree, "inlineCode");

    expect(strongNodes).toHaveLength(1);
    expect(strongNodes[0]).toBe(boldNode);
    expect(textContent(strongNodes[0])).toBe("应用层：");
    expect(codeNodes).toHaveLength(1);
    expect(codeNodes[0]).toBe(codeNode);
  });
});
