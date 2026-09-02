import { expect, it } from "bun:test";

import {
  computeTabWindowsDropEdge,
  findTabWindowsPane,
  moveTabWindowsTab,
  normalizeTabWindowsSizes,
  type TabWindowsLayout,
} from "../src/lib/tab-windows-layout";

type Tab = "research" | "draft" | "tasks";

const layout: TabWindowsLayout<Tab> = {
  type: "split",
  direction: "horizontal",
  sizes: [0.4, 0.6],
  children: [
    { type: "pane", id: "left", tabs: ["research", "tasks"], activeTab: "research" },
    { type: "pane", id: "right", tabs: ["draft"], activeTab: "draft" },
  ],
};

it("normalizes split sizes", () => {
  expect(normalizeTabWindowsSizes([3, Number.NaN, -1], 3)).toEqual([0.6, 0.2, 0.2]);
  expect(normalizeTabWindowsSizes(undefined, 2)).toEqual([0.5, 0.5]);
});

it("moves a tab into the center of another pane", () => {
  const next = moveTabWindowsTab(layout, {
    tab: "tasks",
    sourcePaneId: "left",
    targetPaneId: "right",
    edge: "center",
    newPaneId: "unused",
  });

  expect(findTabWindowsPane(next, "left")?.tabs).toEqual(["research"]);
  expect(findTabWindowsPane(next, "right")?.tabs).toEqual(["draft", "tasks"]);
  expect(findTabWindowsPane(next, "right")?.activeTab).toBe("tasks");
});

it("moves a tab to an edge and creates a new tile", () => {
  const next = moveTabWindowsTab(layout, {
    tab: "tasks",
    sourcePaneId: "left",
    targetPaneId: "right",
    edge: "bottom",
    newPaneId: "tasks-pane",
  });
  const right = next.type === "split" ? next.children[1] : null;

  expect(right).toMatchObject({ type: "split", direction: "vertical" });
  expect(findTabWindowsPane(next, "tasks-pane")?.tabs).toEqual(["tasks"]);
});

it("chooses the nearest edge within the drop threshold", () => {
  const rect = { left: 0, top: 0, width: 100, height: 100 };
  expect(computeTabWindowsDropEdge({ x: 2, y: 50 }, rect)).toBe("left");
  expect(computeTabWindowsDropEdge({ x: 50, y: 50 }, rect)).toBe("center");
});
