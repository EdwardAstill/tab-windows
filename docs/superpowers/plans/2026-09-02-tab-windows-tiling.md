# Tab Windows Tiling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the incorrect floating-window registry component with a generic, tested tabbed tiling workspace matching Pyseas-Dock's pane behavior.

**Architecture:** A pure immutable layout model in `src/lib/` owns recursive leaf/split transformations. One generic React component recursively renders that model and owns ephemeral drag and resize state; the registry installs both files.

**Tech Stack:** React 19, TypeScript 6, Base UI Tabs, Tailwind CSS 4, Vitest, Testing Library, shadcn registry CLI.

**Spec:** `docs/superpowers/specs/2026-09-02-tab-windows-tiling-design.md`

## Global Constraints

- Match Pyseas-Dock's `WorkspaceLayout.tsx` and `layout-model.ts` behavior without importing Dock product code.
- Keep the registry item name `tab-windows` and UI target `@ui/tab-windows.tsx`.
- Install the model at `@lib/tab-windows-layout.ts`.
- Keep `@base-ui/react` as the only runtime component dependency.
- Use native HTML drag-and-drop with a 24 percent edge threshold.
- Default `minPaneSize` to exactly 160 pixels.
- Resize by 2 percent with arrow keys and 10 percent with Shift+arrow.
- Remove the floating compound API and pixel-position behavior without a compatibility layer.
- Follow red-green-refactor for every production behavior.

## File Structure

- Create `src/lib/tab-windows-layout.ts`: public types and pure layout operations.
- Replace `src/components/ui/tab-windows.tsx`: recursive renderer and interactions.
- Create `tests/tab-windows-layout.test.ts`: pure model coverage.
- Replace `tests/tab-windows.test.tsx`: rendering and interaction coverage.
- Create `tests/registry.test.ts`: shadcn install contract.
- Modify `src/features/panels/PanelsWorkspace.tsx`: tiled demonstration.
- Modify `README.md` and `registry.json`.
- Regenerate `public/r/registry.json` and `public/r/tab-windows.json`.

---

### Task 1: Immutable Tiling Layout Model

**Files:**

- Create: `src/lib/tab-windows-layout.ts`
- Create: `tests/tab-windows-layout.test.ts`
- Reference: `/home/eastill/projects/Pyseas-Dock/web/src/components/layout/workspace/layout-model.ts`

**Interfaces:**

- Produces: `TabWindowsDropEdge`, `TabWindowsSplitDirection`, `TabWindowsLeaf<TTab>`, `TabWindowsSplit<TTab>`, and `TabWindowsLayout<TTab>`.
- Produces: `normalizeTabWindowsSplitSizes`, `findTabWindowsLeaf`, `setTabWindowsActiveTab`, `setTabWindowsSplitSizesAtPath`, `moveTabWindowsTab`, `moveTabWindowsPane`, and `computeTabWindowsDropEdge`.

- [ ] **Step 1: Write failing model tests**

Create `tests/tab-windows-layout.test.ts` with this shared fixture:

```ts
import { expect, it } from "vitest";
import {
  computeTabWindowsDropEdge,
  findTabWindowsLeaf,
  moveTabWindowsPane,
  moveTabWindowsTab,
  normalizeTabWindowsSplitSizes,
  setTabWindowsActiveTab,
  setTabWindowsSplitSizesAtPath,
  type TabWindowsLayout,
} from "../src/lib/tab-windows-layout";

type Tab = "blocks" | "assets" | "detail";

function makeLayout(): TabWindowsLayout<Tab> {
  return {
    type: "split",
    dir: "row",
    sizes: [0.3, 0.7],
    children: [
      { type: "leaf", id: "left", tabs: ["blocks", "assets"], activeTab: "blocks" },
      { type: "leaf", id: "right", tabs: ["detail"], activeTab: "detail" },
    ],
  };
}
```

Add these eight focused cases:

```ts
it("normalizes missing and invalid sizes", () => {
  expect(normalizeTabWindowsSplitSizes([3, Number.NaN, -1], 3)).toEqual([0.6, 0.2, 0.2]);
  expect(normalizeTabWindowsSplitSizes(undefined, 2)).toEqual([0.5, 0.5]);
  expect(normalizeTabWindowsSplitSizes([], 0)).toEqual([]);
});

it("sets an active tab immutably", () => {
  const layout = makeLayout();
  const next = setTabWindowsActiveTab(layout, "left", "assets");
  expect(findTabWindowsLeaf(next, "left")?.activeTab).toBe("assets");
  expect(findTabWindowsLeaf(layout, "left")?.activeTab).toBe("blocks");
  expect(setTabWindowsActiveTab(layout, "left", "detail")).toBe(layout);
});

it("sets sizes at a nested path", () => {
  const layout: TabWindowsLayout<Tab> = {
    type: "split",
    dir: "col",
    children: [makeLayout(), { type: "leaf", id: "bottom", tabs: ["detail"], activeTab: "detail" }],
  };
  const next = setTabWindowsSplitSizesAtPath(layout, [0], [1, 3]);
  const nested = next.type === "split" ? next.children[0] : null;
  expect(nested?.type === "split" ? nested.sizes : null).toEqual([0.25, 0.75]);
});

it("center-merges a tab and collapses its emptied source", () => {
  const next = moveTabWindowsTab(makeLayout(), {
    tab: "detail", sourceLeafId: "right", targetLeafId: "left", edge: "center", newLeafId: "unused",
  });
  expect(next).toEqual({
    type: "leaf", id: "left", tabs: ["blocks", "assets", "detail"], activeTab: "detail",
  });
});

it("edge-drops a tab into a new split", () => {
  const next = moveTabWindowsTab(makeLayout(), {
    tab: "assets", sourceLeafId: "left", targetLeafId: "right", edge: "bottom", newLeafId: "assets-pane",
  });
  const right = next.type === "split" ? next.children[1] : null;
  expect(right).toMatchObject({
    type: "split", dir: "col", sizes: [0.5, 0.5],
    children: [
      { type: "leaf", id: "right", tabs: ["detail"] },
      { type: "leaf", id: "assets-pane", tabs: ["assets"] },
    ],
  });
});

it("moves a whole pane with its ordered tabs", () => {
  const next = moveTabWindowsPane(makeLayout(), {
    sourceLeafId: "left", targetLeafId: "right", edge: "left", newLeafId: "moved-left",
  });
  expect(next).toMatchObject({
    type: "split", dir: "row",
    children: [
      { type: "leaf", id: "moved-left", tabs: ["blocks", "assets"], activeTab: "blocks" },
      { type: "leaf", id: "right", tabs: ["detail"] },
    ],
  });
});

it("returns the original layout for invalid and self moves", () => {
  const layout = makeLayout();
  expect(moveTabWindowsTab(layout, {
    tab: "detail", sourceLeafId: "missing", targetLeafId: "left", edge: "center", newLeafId: "new",
  })).toBe(layout);
  expect(moveTabWindowsPane(layout, {
    sourceLeafId: "left", targetLeafId: "left", edge: "right", newLeafId: "new",
  })).toBe(layout);
  expect(moveTabWindowsTab(layout, {
    tab: "detail", sourceLeafId: "right", targetLeafId: "right", edge: "left", newLeafId: "new",
  })).toBe(layout);
});

it("chooses center or the nearest edge", () => {
  const rect = { left: 10, top: 20, width: 100, height: 200 };
  expect(computeTabWindowsDropEdge({ x: 60, y: 120 }, rect)).toBe("center");
  expect(computeTabWindowsDropEdge({ x: 12, y: 120 }, rect)).toBe("left");
  expect(computeTabWindowsDropEdge({ x: 108, y: 120 }, rect)).toBe("right");
  expect(computeTabWindowsDropEdge({ x: 60, y: 22 }, rect)).toBe("top");
  expect(computeTabWindowsDropEdge({ x: 60, y: 218 }, rect)).toBe("bottom");
});
```

- [ ] **Step 2: Verify RED**

Run `bun run test -- tests/tab-windows-layout.test.ts`.

Expected: FAIL because `src/lib/tab-windows-layout.ts` does not exist.

- [ ] **Step 3: Implement the public model**

Start `src/lib/tab-windows-layout.ts` with:

```ts
export type TabWindowsDropEdge = "top" | "right" | "bottom" | "left" | "center";
export type TabWindowsSplitDirection = "row" | "col";

export interface TabWindowsLeaf<TTab extends string = string> {
  type: "leaf";
  id: string;
  tabs: TTab[];
  activeTab: TTab;
}

export interface TabWindowsSplit<TTab extends string = string> {
  type: "split";
  dir: TabWindowsSplitDirection;
  children: TabWindowsLayout<TTab>[];
  sizes?: number[];
}

export type TabWindowsLayout<TTab extends string = string> =
  | TabWindowsLeaf<TTab>
  | TabWindowsSplit<TTab>;
```

Port the reference model exactly with this public rename map:

```text
normalizeSplitSizes  -> normalizeTabWindowsSplitSizes
findLeafById         -> findTabWindowsLeaf
setActiveTab         -> setTabWindowsActiveTab
setSplitSizesAtPath  -> setTabWindowsSplitSizesAtPath
moveTab              -> moveTabWindowsTab
moveGroup            -> moveTabWindowsPane
computeDropEdge      -> computeTabWindowsDropEdge
```

Keep `removeTab`, `removeLeaf`, `collapseSplit`, `insertLeaf`, and `clamp`
private. Return original object identities for invalid operations and already
active tabs so callers can suppress no-op notifications.

- [ ] **Step 4: Verify GREEN and static correctness**

Run:

```bash
bun run test -- tests/tab-windows-layout.test.ts
bun run lint
bun run build
```

Expected: 8 model tests pass; lint and build exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/tab-windows-layout.ts tests/tab-windows-layout.test.ts
git commit -m "feat: add tab windows tiling model"
```

---

### Task 2: Recursive Tabbed Pane Rendering

**Files:**

- Replace: `src/components/ui/tab-windows.tsx`
- Replace: `tests/tab-windows.test.tsx`
- Reference: `/home/eastill/projects/Pyseas-Dock/web/src/components/layout/workspace/WorkspaceLayout.tsx`
- Reference: `/home/eastill/projects/Pyseas-Dock/web/src/components/ui/tabs.tsx`

**Interfaces:**

- Consumes: Task 1 layout types plus size normalization, active-tab, and split-size helpers.
- Produces: `TabWindowsProps<TTab>` and `TabWindows<TTab>`.
- Produces DOM slots `tab-windows-split`, `tab-windows-pane`, `tab-windows-tabstrip`, `tab-windows-tab`, `tab-windows-toolbar`, and `tab-windows-resize-handle`.

- [ ] **Step 1: Replace floating tests with failing render/state tests**

Replace `tests/tab-windows.test.tsx`. Define this fixture and render function:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { TabWindows } from "../src/components/ui/tab-windows";
import type { TabWindowsLayout } from "../src/lib/tab-windows-layout";

type Tab = "one" | "two" | "detail";
const labels: Record<Tab, string> = { one: "One", two: "Two", detail: "Detail" };

function makeLayout(): TabWindowsLayout<Tab> {
  return {
    type: "split", dir: "row", sizes: [0.4, 0.6],
    children: [
      { type: "leaf", id: "left", tabs: ["one", "two"], activeTab: "one" },
      { type: "leaf", id: "right", tabs: ["detail"], activeTab: "detail" },
    ],
  };
}

function renderPanel(tab: Tab) {
  return <div>{labels[tab]} panel</div>;
}
```

Add four tests:

```tsx
it("renders recursive panes and only active panels", () => {
  const { container } = render(
    <TabWindows aria-label="Example workspace" defaultLayout={makeLayout()}
      renderPanel={renderPanel} renderTabLabel={(tab) => labels[tab]} />,
  );
  expect(screen.getByRole("region", { name: "Example workspace" })).toBeInTheDocument();
  expect(container.querySelectorAll('[data-slot="tab-windows-pane"]')).toHaveLength(2);
  expect(screen.getByText("One panel")).toBeInTheDocument();
  expect(screen.queryByText("Two panel")).not.toBeInTheDocument();
  expect(screen.getByText("Detail panel")).toBeInTheDocument();
});

it("changes tabs in uncontrolled mode and reports layout", () => {
  const onLayoutChange = vi.fn();
  render(<TabWindows defaultLayout={makeLayout()} onLayoutChange={onLayoutChange}
    renderPanel={renderPanel} renderTabLabel={(tab) => labels[tab]} />);
  fireEvent.click(screen.getByRole("tab", { name: "Two" }));
  expect(screen.getByText("Two panel")).toBeInTheDocument();
  expect(onLayoutChange).toHaveBeenCalledTimes(1);
});

it("reports controlled changes without replacing supplied state", () => {
  const layout = makeLayout();
  const onLayoutChange = vi.fn();
  render(<TabWindows defaultLayout={layout} layout={layout} onLayoutChange={onLayoutChange}
    renderPanel={renderPanel} renderTabLabel={(tab) => labels[tab]} />);
  fireEvent.click(screen.getByRole("tab", { name: "Two" }));
  expect(onLayoutChange).toHaveBeenCalledTimes(1);
  expect(screen.getByText("One panel")).toBeInTheDocument();
  expect(screen.queryByText("Two panel")).not.toBeInTheDocument();
});

it("renders each pane toolbar for its active tab", () => {
  render(<TabWindows defaultLayout={makeLayout()} renderPanel={renderPanel}
    renderToolbar={(tab, leaf) => <button>{`${leaf.id}:${tab}`}</button>} />);
  expect(screen.getByRole("button", { name: "left:one" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "right:detail" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify RED**

Run `bun run test -- tests/tab-windows.test.tsx`.

Expected: FAIL because the current `TabWindows` is a compound object, not a component.

- [ ] **Step 3: Implement the generic component and tab wrappers**

Replace the UI file. Export exactly:

```ts
export interface TabWindowsProps<TTab extends string = string> {
  defaultLayout: TabWindowsLayout<TTab>;
  layout?: TabWindowsLayout<TTab>;
  onLayoutChange?: (layout: TabWindowsLayout<TTab>) => void;
  renderPanel: (tab: TTab) => ReactNode;
  renderTabLabel?: (tab: TTab) => ReactNode;
  renderToolbar?: (activeTab: TTab, leaf: TabWindowsLeaf<TTab>) => ReactNode;
  minPaneSize?: number;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}
```

Use `layout ?? internalLayout` and a single immutable update path:

```ts
type LayoutUpdater<TTab extends string> = (
  current: TabWindowsLayout<TTab>,
) => TabWindowsLayout<TTab>;

const updateLayout = useCallback((updater: LayoutUpdater<TTab>) => {
  const current = layout ?? internalLayout;
  const next = updater(current);
  if (next === current) return;
  if (layout === undefined) setInternalLayout(next);
  onLayoutChange?.(next);
}, [internalLayout, layout, onLayoutChange]);
```

Wrap `TabsPrimitive.Root`, `List`, `Tab`, and `Panel` privately using the exact
focus, active-border, foreground, and sizing classes from the referenced
Pyseas-Dock `tabs.tsx`.

- [ ] **Step 4: Implement recursive rendering**

Port `renderNode`, `renderSplit`, `renderLeaf`, and `nodeKey`. Rename data hooks:

```text
workspace-split         -> tab-windows-split
pane-leaf               -> tab-windows-pane
pane-tabstrip           -> tab-windows-tabstrip
pane-tab                -> tab-windows-tab
pane-toolbar            -> tab-windows-toolbar
workspace-resize-handle -> tab-windows-resize-handle
```

At this stage separators are inert but expose `role="separator"`, orientation,
normalized `aria-valuenow`, and `tabIndex={0}`. Render only the active panel.
The root is a labelled `role="region"` with `size-full min-h-0 min-w-0 overflow-hidden`.

- [ ] **Step 5: Verify GREEN and commit**

```bash
bun run test -- tests/tab-windows.test.tsx tests/tab-windows-layout.test.ts
bun run lint
bun run build
git add src/components/ui/tab-windows.tsx tests/tab-windows.test.tsx
git commit -m "feat: render tabbed tiling panes"
```

Expected: 12 tests pass, checks exit 0, and the floating API is absent.

---

### Task 3: Drag/Drop Tiling and Split Resizing

**Files:**

- Modify: `src/components/ui/tab-windows.tsx`
- Modify: `tests/tab-windows.test.tsx`

**Interfaces:**

- Consumes: `computeTabWindowsDropEdge`, `moveTabWindowsPane`, `moveTabWindowsTab`, and `setTabWindowsSplitSizesAtPath`.
- Preserves: `TabWindowsProps<TTab>` from Task 2.
- Adds internal tab/pane drag state and path-based resize state; neither is public.

- [ ] **Step 1: Add failing tab and whole-pane drag tests**

Add `findTabWindowsLeaf` to the test imports and define:

```tsx
function dataTransfer() {
  return {
    dropEffect: "none",
    effectAllowed: "none",
    setData: vi.fn(),
  } as unknown as DataTransfer;
}
```

Append:

```tsx
it("moves a tab into the center of another pane", () => {
  const onLayoutChange = vi.fn();
  const { container } = render(
    <TabWindows defaultLayout={makeLayout()} onLayoutChange={onLayoutChange}
      renderPanel={renderPanel} renderTabLabel={(tab) => labels[tab]} />,
  );
  const transfer = dataTransfer();
  const target = container.querySelector<HTMLElement>('[data-leaf-id="right"]')!;
  target.getBoundingClientRect = () =>
    ({ left: 100, top: 0, width: 200, height: 200 }) as DOMRect;

  fireEvent.dragStart(screen.getByRole("tab", { name: "Two" }), { dataTransfer: transfer });
  fireEvent.dragOver(target, { clientX: 200, clientY: 100, dataTransfer: transfer });
  fireEvent.drop(target, { clientX: 200, clientY: 100, dataTransfer: transfer });

  const next = onLayoutChange.mock.calls.at(-1)?.[0] as TabWindowsLayout<Tab>;
  expect(findTabWindowsLeaf(next, "right")?.tabs).toEqual(["detail", "two"]);
  expect(findTabWindowsLeaf(next, "right")?.activeTab).toBe("two");
});

it("previews and applies edge tiling for a whole pane", () => {
  const layout = makeLayout();
  const onLayoutChange = vi.fn();
  const { container } = render(
    <TabWindows defaultLayout={layout} layout={layout}
      onLayoutChange={onLayoutChange} renderPanel={renderPanel} />,
  );
  const transfer = dataTransfer();
  const sourceStrip = container.querySelector<HTMLElement>(
    '[data-leaf-id="left"] [data-slot="tab-windows-tabstrip"]',
  )!;
  const target = container.querySelector<HTMLElement>('[data-leaf-id="right"]')!;
  target.getBoundingClientRect = () =>
    ({ left: 100, top: 0, width: 200, height: 200 }) as DOMRect;

  fireEvent.dragStart(sourceStrip, { dataTransfer: transfer });
  fireEvent.dragOver(target, { clientX: 105, clientY: 100, dataTransfer: transfer });
  expect(target).toHaveAttribute("data-drop-edge", "left");
  expect(target.querySelector('[data-slot="tab-windows-drop-indicator"]')).toBeInTheDocument();
  fireEvent.drop(target, { clientX: 105, clientY: 100, dataTransfer: transfer });

  const next = onLayoutChange.mock.calls.at(-1)?.[0] as TabWindowsLayout<Tab>;
  expect(next).toMatchObject({ type: "split", dir: "row" });
  expect(target).not.toHaveAttribute("data-drop-edge");
});
```

- [ ] **Step 2: Verify drag/drop RED**

Run `bun run test -- tests/tab-windows.test.tsx`.

Expected: the two new tests fail because the component has no drag state or drop handlers.

- [ ] **Step 3: Implement drag/drop and previews**

Port the reference `DragState`, `startTabDrag`, `startTabStripDrag`,
`updateDropTarget`, `clearDropTarget`, and `applyDrop`. Rename `kind: "group"`
to `kind: "pane"`; call the prefixed model helpers; generate new IDs as
`tab-${layoutInstanceId}-${counter}` and `pane-${layoutInstanceId}-${counter}`.

Empty strip space moves a pane. Descendants matching
`[data-slot="tab-windows-tab"]` retain tab dragging, while descendants matching
`[data-slot="tab-windows-toolbar"]` cancel pane dragging. Leaves receive:

```tsx
data-drop-edge={activeDrop ?? undefined}
onDragLeave={clearDropTarget}
onDragOver={(event) => updateDropTarget(event, leaf.id)}
onDrop={(event) => applyDrop(event, leaf.id)}
```

Render `data-slot="tab-windows-drop-indicator"` with `aria-hidden="true"` and
the reference center/half-edge classes. Clear drag and preview state on drop
and every drag end.

- [ ] **Step 4: Verify drag/drop GREEN**

Run `bun run test -- tests/tab-windows.test.tsx`.

Expected: all component tests, including both drag cases, pass.

- [ ] **Step 5: Add failing pointer and keyboard resize tests**

Append:

```tsx
it("resizes adjacent panes with pointer movement", () => {
  const onLayoutChange = vi.fn();
  const { container } = render(
    <TabWindows defaultLayout={makeLayout()} minPaneSize={100}
      onLayoutChange={onLayoutChange} renderPanel={renderPanel} />,
  );
  const split = container.querySelector<HTMLElement>('[data-slot="tab-windows-split"]')!;
  const separator = screen.getByRole("separator", { name: "Resize pane" });
  split.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 1000, height: 500 }) as DOMRect;
  separator.setPointerCapture = vi.fn();

  fireEvent.pointerDown(separator, { pointerId: 1, clientX: 400 });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 0 });
  fireEvent.pointerUp(window, { pointerId: 1 });

  const next = onLayoutChange.mock.calls.at(-1)?.[0] as TabWindowsLayout<Tab>;
  expect(next.type === "split" ? next.sizes : null).toEqual([0.1, 0.9]);
});

it("resizes row splits by keyboard and exposes separator metadata", () => {
  const onLayoutChange = vi.fn();
  const { container } = render(
    <TabWindows defaultLayout={makeLayout()} onLayoutChange={onLayoutChange}
      renderPanel={renderPanel} />,
  );
  const split = container.querySelector<HTMLElement>('[data-slot="tab-windows-split"]')!;
  const separator = screen.getByRole("separator", { name: "Resize pane" });
  split.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 1000, height: 500 }) as DOMRect;

  expect(separator).toHaveAttribute("aria-orientation", "vertical");
  expect(separator).toHaveAttribute("aria-valuenow", "40");
  fireEvent.keyDown(separator, { key: "ArrowRight", shiftKey: true });

  const next = onLayoutChange.mock.calls.at(-1)?.[0] as TabWindowsLayout<Tab>;
  expect(next.type === "split" ? next.sizes : null).toEqual([0.5, 0.5]);
});

it("resizes column splits with vertical arrow keys", () => {
  const base = makeLayout();
  if (base.type !== "split") throw new Error("expected split fixture");
  const layout: TabWindowsLayout<Tab> = {
    type: "split",
    dir: "col",
    sizes: [0.5, 0.5],
    children: base.children,
  };
  const onLayoutChange = vi.fn();
  const { container } = render(
    <TabWindows defaultLayout={layout} onLayoutChange={onLayoutChange}
      renderPanel={renderPanel} />,
  );
  const split = container.querySelector<HTMLElement>('[data-slot="tab-windows-split"]')!;
  const separator = screen.getByRole("separator", { name: "Resize pane" });
  split.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 1000, height: 500 }) as DOMRect;

  expect(separator).toHaveAttribute("aria-orientation", "horizontal");
  fireEvent.keyDown(separator, { key: "ArrowDown" });

  const next = onLayoutChange.mock.calls.at(-1)?.[0] as TabWindowsLayout<Tab>;
  expect(next.type === "split" ? next.sizes : null).toEqual([0.52, 0.48]);
});
```

- [ ] **Step 6: Verify resize RED**

Run `bun run test -- tests/tab-windows.test.tsx`.

Expected: all three resize tests fail because separators are inert.

- [ ] **Step 7: Implement pointer and keyboard resizing**

Port `ResizeState`, `resizedSplitSizes`, the resize effect, `resizeStateFor`,
`startResize`, and `handleResizeKeyDown`. Read width/clientX for rows and
height/clientY for columns. Clamp the adjacent pair to `minPaneSize` while
preserving its combined ratio. Use:

```ts
const decrease = node.dir === "row" ? "ArrowLeft" : "ArrowUp";
const increase = node.dir === "row" ? "ArrowRight" : "ArrowDown";
const delta = (event.key === increase ? 1 : -1) * (event.shiftKey ? 0.1 : 0.02);
```

Add `cursor-grabbing select-none` to the root while resizing and remove global
pointer listeners on up, cancel, and cleanup.

- [ ] **Step 8: Verify and commit interactions**

```bash
bun run test
bun run lint
bun run build
git add src/components/ui/tab-windows.tsx tests/tab-windows.test.tsx
git commit -m "feat: tile and resize tab windows"
```

Expected: every test and static check passes.

---

### Task 4: Registry Contract, Demo, and Documentation

**Files:**

- Create: `tests/registry.test.ts`
- Modify: `registry.json`
- Modify: `src/features/panels/PanelsWorkspace.tsx`
- Modify: `README.md`
- Regenerate: `public/r/registry.json`
- Regenerate: `public/r/tab-windows.json`

**Interfaces:**

- Consumes: `TabWindows`, `TabWindowsLayout`, and renderer props.
- Produces: registry targets `@ui/tab-windows.tsx` and `@lib/tab-windows-layout.ts`.
- Produces: demo tabs `research`, `draft`, and `tasks`.

- [ ] **Step 1: Write a failing registry contract test**

Create `tests/registry.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

interface RegistryFile { path: string; target: string; type: string }
interface RegistryItem {
  name: string;
  description: string;
  dependencies: string[];
  files: RegistryFile[];
}

it("installs the tiling component and layout model", () => {
  const registry = JSON.parse(
    readFileSync(new URL("../registry.json", import.meta.url), "utf8"),
  ) as { items: RegistryItem[] };
  const item = registry.items.find(({ name }) => name === "tab-windows");
  expect(item?.description).toContain("tiled");
  expect(item?.dependencies).toEqual(["@base-ui/react"]);
  expect(item?.files).toEqual([
    { path: "src/components/ui/tab-windows.tsx", type: "registry:ui", target: "@ui/tab-windows.tsx" },
    { path: "src/lib/tab-windows-layout.ts", type: "registry:lib", target: "@lib/tab-windows-layout.ts" },
  ]);
});
```

- [ ] **Step 2: Verify registry RED**

Run `bun run test -- tests/registry.test.ts`.

Expected: FAIL because the manifest describes floating behavior and has one file.

- [ ] **Step 3: Update the source registry manifest and verify GREEN**

Set the description to:

```json
"A tiled workspace with draggable tabs, dockable panes, and resizable splits."
```

Append:

```json
{
  "path": "src/lib/tab-windows-layout.ts",
  "type": "registry:lib",
  "target": "@lib/tab-windows-layout.ts"
}
```

Run `bun run test -- tests/registry.test.ts` and expect PASS.

- [ ] **Step 4: Replace the demo with a tiled layout**

In `PanelsWorkspace.tsx`, define:

```ts
type DemoTab = "research" | "draft" | "tasks";

const defaultLayout: TabWindowsLayout<DemoTab> = {
  type: "split",
  dir: "row",
  sizes: [0.34, 0.66],
  children: [
    {
      type: "split",
      dir: "col",
      sizes: [0.5, 0.5],
      children: [
        { type: "leaf", id: "research-pane", tabs: ["research"], activeTab: "research" },
        { type: "leaf", id: "tasks-pane", tabs: ["tasks"], activeTab: "tasks" },
      ],
    },
    { type: "leaf", id: "draft-pane", tabs: ["draft"], activeTab: "draft" },
  ],
};
```

Retain the existing panel content behind a `renderPanel(tab)` switch. Replace
`WindowHandle` with a label map and render:

```tsx
<TabWindows
  aria-label="Tab windows demo"
  className="h-[640px] rounded-2xl border shadow-inner"
  defaultLayout={defaultLayout}
  renderPanel={renderPanel}
  renderTabLabel={(tab) => labels[tab]}
/>
```

Explain center grouping, edge tiling, empty-strip pane dragging, and separator
resizing in the visible page copy.

- [ ] **Step 5: Rewrite README usage and behavior**

Use a minimal two-pane `TabWindowsLayout<"files" | "preview">` example. Explain:

```text
center drop     -> tabs share one pane
edge drop       -> a new tiled split
tab-strip drag  -> move the complete pane
separator input -> resize adjacent panes
```

Remove all absolute-position, bounds-clamping, 8/32-pixel movement, and z-index text.

- [ ] **Step 6: Run app checks and build the registry twice**

```bash
bun run test
bun run lint
bun run build
bun run registry:build
sha256sum public/r/registry.json public/r/tab-windows.json
bun run registry:build
sha256sum public/r/registry.json public/r/tab-windows.json
```

Expected: checks pass and each generated file's checksum is identical across
both builds. Inspect `public/r/tab-windows.json`: it contains both targets,
exactly one dependency (`@base-ui/react`), and no `defaultPosition`,
`translate3d`, or `TabWindows.Root` text.

- [ ] **Step 7: Commit registry, demo, docs, and artifacts**

```bash
git add README.md registry.json public/r/registry.json public/r/tab-windows.json src/features/panels/PanelsWorkspace.tsx tests/registry.test.ts
git commit -m "docs: demonstrate tiled tab windows"
```

---

### Task 5: Final Verification and Review

**Files:**

- Verify: all paths changed by Tasks 1-4.

**Interfaces:**

- Consumes: complete component, model, demo, tests, and registry artifacts.
- Produces: evidence that the approved design and install contract are complete.

- [ ] **Step 1: Run the complete quality gate**

```bash
bun run test
bun run lint
bun run build
bun run registry:build
git diff --check
```

Expected: every command exits 0 and `git diff --check` prints nothing.

- [ ] **Step 2: Confirm only intended changes and commits**

```bash
git status --short
git log -6 --oneline
git diff HEAD~4 --stat
```

Expected: no uncommitted files after registry generation, four focused
implementation commits, and only plan-listed paths in the stat.

- [ ] **Step 3: Check every specification section**

```text
Public API                 -> generic props and exported model types
Registry Structure         -> two generated install targets
Layout Behavior            -> recursive splits, tabs, collapse, normalization
Drag and Drop              -> tab/pane drag, center merge, edge tiling, preview
Resizing and Accessibility -> pointer/keys, minimum size, separator metadata
Controlled/Uncontrolled    -> shared immutable update path
Demo and Documentation     -> three-pane demo and current README
Testing                    -> pure and DOM suites passing
Out of Scope               -> no floating or persistence compatibility code
```

- [ ] **Step 4: Request code review**

Invoke `superpowers:requesting-code-review` with the approved spec, this plan,
and the Task 1 starting commit through `HEAD`. Resolve correctness findings by
first adding a failing regression test, then applying the minimal fix.

- [ ] **Step 5: Re-run the quality gate after review**

```bash
bun run test
bun run lint
bun run build
bun run registry:build
git diff --check
```

Expected: every command exits 0. Commit review fixes only if review found an issue.
