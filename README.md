# Tiling Tabs

A small shadcn registry component for arranging draggable tabs in resizable,
tiled panes. It uses the standard shadcn Base UI tabs and native browser drag
and drop for docking.

## Install

```bash
bunx shadcn@latest init --base base
bunx shadcn@latest add EdwardAstill/tab-windows/tab-windows
```

The registry installs the tiling component, the shadcn Tabs elements, and its
layout model.

## Use

```tsx
import { TabWindows } from "@/components/ui/tab-windows";
import type { TabWindowsLayout } from "@/lib/tab-windows-layout";

type Tab = "files" | "preview";

const layout: TabWindowsLayout<Tab> = {
  type: "split",
  direction: "horizontal",
  children: [
    { type: "pane", id: "files", tabs: ["files"], activeTab: "files" },
    { type: "pane", id: "preview", tabs: ["preview"], activeTab: "preview" },
  ],
};

export function Example() {
  return (
    <TabWindows
      aria-label="Project workspace"
      defaultLayout={layout}
      renderPanel={(tab) => tab}
    />
  );
}
```

Drag a tab onto the center of a pane to group it there, or onto an edge to
create a new tile. Drag the dividers—or focus one and use the arrow keys—to
resize adjacent panes.

## Develop

```bash
bun install
bun run dev
bun run test
bun run registry:build
```
