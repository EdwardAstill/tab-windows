export type TabWindowsDropEdge =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "center";

export type TabWindowsSplitDirection = "horizontal" | "vertical";

export interface TabWindowsPane<TTab extends string = string> {
  type: "pane";
  id: string;
  tabs: TTab[];
  activeTab: TTab;
}

export interface TabWindowsSplit<TTab extends string = string> {
  type: "split";
  direction: TabWindowsSplitDirection;
  children: TabWindowsLayout<TTab>[];
  sizes?: number[];
}

export type TabWindowsLayout<TTab extends string = string> =
  | TabWindowsPane<TTab>
  | TabWindowsSplit<TTab>;

export function normalizeTabWindowsSizes(
  sizes: number[] | undefined,
  count: number,
): number[] {
  if (count <= 0) return [];
  const values = Array.from({ length: count }, (_, index) => {
    const value = sizes?.[index];
    return value !== undefined && Number.isFinite(value) && value > 0
      ? value
      : 1;
  });
  const total = values.reduce((sum, value) => sum + value, 0);
  return values.map((value) => value / total);
}

export function findTabWindowsPane<TTab extends string>(
  layout: TabWindowsLayout<TTab>,
  paneId: string,
): TabWindowsPane<TTab> | null {
  if (layout.type === "pane") return layout.id === paneId ? layout : null;
  for (const child of layout.children) {
    const pane = findTabWindowsPane(child, paneId);
    if (pane) return pane;
  }
  return null;
}

export function setTabWindowsActiveTab<TTab extends string>(
  layout: TabWindowsLayout<TTab>,
  paneId: string,
  tab: TTab,
): TabWindowsLayout<TTab> {
  if (layout.type === "pane") {
    return layout.id === paneId && layout.tabs.includes(tab)
      ? { ...layout, activeTab: tab }
      : layout;
  }
  return {
    ...layout,
    children: layout.children.map((child) =>
      setTabWindowsActiveTab(child, paneId, tab),
    ),
  };
}

export function setTabWindowsSizesAtPath<TTab extends string>(
  layout: TabWindowsLayout<TTab>,
  path: number[],
  sizes: number[],
): TabWindowsLayout<TTab> {
  if (path.length === 0) {
    return layout.type === "split"
      ? {
          ...layout,
          sizes: normalizeTabWindowsSizes(sizes, layout.children.length),
        }
      : layout;
  }
  if (layout.type !== "split") return layout;
  const [head, ...tail] = path;
  return {
    ...layout,
    children: layout.children.map((child, index) =>
      index === head ? setTabWindowsSizesAtPath(child, tail, sizes) : child,
    ),
  };
}

function collapseSplit<TTab extends string>(
  split: TabWindowsSplit<TTab>,
): TabWindowsLayout<TTab> | null {
  if (split.children.length === 0) return null;
  if (split.children.length === 1) return split.children[0] ?? null;
  return {
    ...split,
    sizes: normalizeTabWindowsSizes(split.sizes, split.children.length),
  };
}

function removeTab<TTab extends string>(
  layout: TabWindowsLayout<TTab>,
  paneId: string,
  tab: TTab,
): TabWindowsLayout<TTab> | null {
  if (layout.type === "pane") {
    if (layout.id !== paneId) return layout;
    const tabs = layout.tabs.filter((item) => item !== tab);
    if (tabs.length === 0) return null;
    return {
      ...layout,
      tabs,
      activeTab: layout.activeTab === tab ? tabs[0]! : layout.activeTab,
    };
  }
  const children = layout.children
    .map((child) => removeTab(child, paneId, tab))
    .filter((child): child is TabWindowsLayout<TTab> => child !== null);
  return collapseSplit({ ...layout, children });
}

function insertPane<TTab extends string>(
  layout: TabWindowsLayout<TTab>,
  targetPaneId: string,
  pane: TabWindowsPane<TTab>,
  edge: TabWindowsDropEdge,
): TabWindowsLayout<TTab> {
  if (layout.type === "pane") {
    if (layout.id !== targetPaneId) return layout;
    if (edge === "center") {
      const tabs = [...layout.tabs];
      for (const tab of pane.tabs) if (!tabs.includes(tab)) tabs.push(tab);
      return { ...layout, tabs, activeTab: pane.activeTab };
    }
    const direction =
      edge === "left" || edge === "right" ? "horizontal" : "vertical";
    const children =
      edge === "left" || edge === "top" ? [pane, layout] : [layout, pane];
    return { type: "split", direction, children, sizes: [0.5, 0.5] };
  }
  return {
    ...layout,
    children: layout.children.map((child) =>
      insertPane(child, targetPaneId, pane, edge),
    ),
  };
}

export function moveTabWindowsTab<TTab extends string>(
  layout: TabWindowsLayout<TTab>,
  options: {
    tab: TTab;
    sourcePaneId: string;
    targetPaneId: string;
    edge: TabWindowsDropEdge;
    newPaneId: string;
  },
): TabWindowsLayout<TTab> {
  const source = findTabWindowsPane(layout, options.sourcePaneId);
  if (!source?.tabs.includes(options.tab)) return layout;
  if (options.sourcePaneId === options.targetPaneId) {
    if (options.edge === "center") {
      return setTabWindowsActiveTab(layout, options.sourcePaneId, options.tab);
    }
    if (source.tabs.length === 1) return layout;
  }
  const withoutTab = removeTab(layout, options.sourcePaneId, options.tab);
  if (!withoutTab || !findTabWindowsPane(withoutTab, options.targetPaneId)) {
    return layout;
  }
  return insertPane(
    withoutTab,
    options.targetPaneId,
    {
      type: "pane",
      id: options.newPaneId,
      tabs: [options.tab],
      activeTab: options.tab,
    },
    options.edge,
  );
}

export function computeTabWindowsDropEdge(
  point: { x: number; y: number },
  rect: { left: number; top: number; width: number; height: number },
  threshold = 0.24,
): TabWindowsDropEdge {
  if (rect.width <= 0 || rect.height <= 0) return "center";
  const x = Math.min(Math.max((point.x - rect.left) / rect.width, 0), 1);
  const y = Math.min(Math.max((point.y - rect.top) / rect.height, 0), 1);
  const edges: Array<[Exclude<TabWindowsDropEdge, "center">, number]> = [
    ["left", x],
    ["right", 1 - x],
    ["top", y],
    ["bottom", 1 - y],
  ];
  const nearest = edges.reduce((best, edge) =>
    edge[1] < best[1] ? edge : best,
  );
  return nearest[1] <= threshold ? nearest[0] : "center";
}
