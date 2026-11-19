const BOLD_WITHOUT_SPACE_PATTERN = /(^|[^\\])\*\*([^\s*](?:[^*\n]*?[^\s*])?)\*\*(?=[^\s*])/g;

function splitBoldText(value) {
  if (typeof value !== "string" || !value.includes("**")) {
    return null;
  }

  const parts = [];
  let cursor = 0;
  let match;
  BOLD_WITHOUT_SPACE_PATTERN.lastIndex = 0;

  while ((match = BOLD_WITHOUT_SPACE_PATTERN.exec(value)) !== null) {
    const prefix = match[1];
    const label = match[2];
    const boldStart = match.index + prefix.length;
    if (boldStart > cursor) {
      parts.push({ type: "text", value: value.slice(cursor, boldStart) });
    }
    parts.push({
      type: "strong",
      children: [{ type: "text", value: label }],
    });
    cursor = match.index + match[0].length;
  }

  if (!parts.length) {
    return null;
  }
  if (cursor < value.length) {
    parts.push({ type: "text", value: value.slice(cursor) });
  }
  return parts;
}

function repairBoldTextNodes(node) {
  if (!Array.isArray(node?.children)) {
    return;
  }

  const children = [];
  for (const child of node.children) {
    if (child.type === "text") {
      const repaired = splitBoldText(child.value);
      if (repaired) {
        children.push(...repaired);
        continue;
      }
    } else {
      repairBoldTextNodes(child);
    }
    children.push(child);
  }
  node.children = children;
}

export function remarkRepairBoldDelimiterFlanking() {
  return (tree) => {
    repairBoldTextNodes(tree);
  };
}
