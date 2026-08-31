export type TextItemLike = {
  str?: string;
  transform?: number[];
  width?: number;
};

export function layoutTextFromItems(items: TextItemLike[]) {
  const positioned = items
    .filter((item) => item.str?.trim() && item.transform?.length)
    .map((item) => ({
      text: item.str?.trim() ?? "",
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
      width: item.width ?? 0,
    }));

  const lines: Array<{ y: number; items: typeof positioned }> = [];
  for (const item of positioned) {
    const line = lines.find((candidate) => Math.abs(candidate.y - item.y) <= 3);
    if (line) line.items.push(item);
    else lines.push({ y: item.y, items: [item] });
  }

  return lines
    .sort((left, right) => right.y - left.y)
    .map((line) => {
      const ordered = line.items.sort((left, right) => left.x - right.x);
      let previousEnd = 0;
      return ordered
        .map((item, index) => {
          const gap = index === 0 ? 0 : item.x - previousEnd;
          const spaces = gap > 2 ? " ".repeat(Math.min(32, Math.max(1, Math.round(gap / 4)))) : "";
          previousEnd = item.x + item.width;
          return `${spaces}${item.text}`;
        })
        .join("")
        .trimEnd();
    })
    .join("\n");
}

export function simpleTextFromItems(items: TextItemLike[]) {
  return items
    .filter((item) => item.str?.trim())
    .map((item) => item.str?.trim())
    .filter(Boolean)
    .join(" ");
}
