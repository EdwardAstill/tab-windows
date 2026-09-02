# Tab Windows Tiling Design

## Objective

Replace the current free-floating draggable-window component with a generic
shadcn registry component based on Pyseas-Dock's workspace tiling subsystem.
The registry component will arrange tabbed panes in a recursive split layout
instead of positioning overlapping windows with pixel coordinates.

The Pyseas-Dock files used as the behavioral reference are:

- `web/src/components/layout/workspace/WorkspaceLayout.tsx`
- `web/src/components/layout/workspace/layout-model.ts`
- `web/src/components/layout/workspace/layout.ts`

The extraction must remain product-neutral. It must not import Pyseas-Dock
features, panel components, or application state.

## Public API

The registry will continue to be installed as `tab-windows`, and its React
entry point will remain `@/components/ui/tab-windows.tsx`. It will replace the
current compound `Root`, `Item`, `Handle`, and `Content` API with one generic
component:

```tsx
<TabWindows
  defaultLayout={layout}
  renderPanel={(tab) => panels[tab]}
  renderTabLabel={(tab) => labels[tab]}
/>
```

`TabWindows<TTab extends string>` will accept the same generic contract as the
reference `WorkspaceLayout` component:

- `defaultLayout: TabWindowsLayout<TTab>` supplies uncontrolled initial state.
- `layout?: TabWindowsLayout<TTab>` enables controlled state.
- `onLayoutChange?: (layout) => void` reports every accepted layout change.
- `renderPanel: (tab) => ReactNode` renders the active tab's content.
- `renderTabLabel?: (tab) => ReactNode` customizes tab labels.
- `renderToolbar?: (activeTab, leaf) => ReactNode` supplies pane-local actions.
- `minPaneSize?: number` sets the resize floor and defaults to 160 pixels.
- `className`, `style`, and `aria-label` customize the root element.

The layout module will export these product-neutral types:

```ts
type TabWindowsDropEdge = "top" | "right" | "bottom" | "left" | "center";
type TabWindowsSplitDirection = "row" | "col";
type TabWindowsLayout<TTab extends string = string> =
  | TabWindowsLeaf<TTab>
  | TabWindowsSplit<TTab>;
```

A leaf owns a stable `id`, an ordered non-empty `tabs` array, and an
`activeTab`. A split owns a direction, child nodes, and optional proportional
sizes. Model helpers needed to construct, inspect, or update controlled layouts
will be exported with `tabWindows`-specific names.

This is intentionally a breaking correction. The free-positioning props and
compound components will be removed rather than retained as a second behavior.

## Registry Structure

The registry item will install two files:

- `src/components/ui/tab-windows.tsx` contains rendering and interactions and
  targets `@ui/tab-windows.tsx`.
- `src/lib/tab-windows-layout.ts` contains the pure layout model and targets
  `@lib/tab-windows-layout.ts`.

The UI file will use Base UI's Tabs primitive directly and will apply the
required shadcn-compatible Tailwind styling locally. The existing
`@base-ui/react` dependency remains the only component dependency. Splitting
the pure model from the UI preserves the reference subsystem's useful boundary
and lets consumers update controlled layouts without depending on DOM code.

`registry.json` will list both source files. `shadcn build` will regenerate the
matching files under `public/r/`.

## Layout Behavior

The component renders the layout tree recursively:

- `row` splits tile children horizontally.
- `col` splits children vertically.
- proportional sizes are normalized before rendering.
- adjacent children are separated by an accessible resize handle.
- leaves fill their allotted tile and show a tab strip above the active panel.

Only the active panel in a leaf is rendered, matching Pyseas-Dock. Selecting a
tab updates that leaf's `activeTab`.

Invalid or incomplete size arrays are normalized to finite positive
proportions. Removing the last tab from a leaf removes the leaf; a split with
one remaining child collapses into that child. Invalid moves leave the layout
unchanged.

## Drag and Drop

The component will preserve Pyseas-Dock's native HTML drag-and-drop behavior:

- Dragging a tab moves only that tab.
- Dragging empty tab-strip space moves the complete leaf and its ordered tabs.
- Dropping in the center merges the dragged tabs into the target leaf.
- Dropping near the left, right, top, or bottom edge creates a corresponding
  50/50 split.
- A visible overlay previews the active center or edge drop zone.
- Moving the only tab back onto an edge of its own leaf is a no-op.
- Moving a leaf onto itself is a no-op.

The edge detector will use the reference threshold of 24 percent of the leaf's
width or height. When corner regions overlap, the nearest edge wins.

New leaves created by drops receive component-instance-local stable IDs. Drag
state and the preview are cleared after a completed or cancelled drag.

## Resizing and Accessibility

Split separators will support pointer and keyboard resizing:

- Pointer movement adjusts the two panes adjacent to the separator.
- Arrow Left/Right resize a row split.
- Arrow Up/Down resize a column split.
- A normal key press changes the ratio by 2 percent; Shift changes it by 10
  percent.
- Both panes respect `minPaneSize` within the available split extent.

Separators will expose `role="separator"`, orientation, and current percentage.
The workspace has a configurable accessible label. Tabs retain Base UI's focus,
selection, and keyboard behavior. Drop previews remain decorative and hidden
from assistive technology.

## Controlled and Uncontrolled State

Without `layout`, the component owns layout state initialized from
`defaultLayout`. With `layout`, the supplied layout is authoritative and the
component reports proposed changes through `onLayoutChange`. The component
must not mutate consumer objects in either mode.

Every accepted tab selection, drop, or resize runs through one update path so
controlled and uncontrolled behavior stay aligned. Invalid operations return
the current layout and do not create structural damage.

## Demo and Documentation

The Vite demo will use a three-panel layout derived from Pyseas-Dock's default:

- a left column containing two vertically tiled panes;
- a larger detail pane on the right;
- one tab per initial pane, with enough panel content to make rearrangement
  visible.

Its copy will explain tab dragging, pane dragging, center grouping, edge
tiling, and separator resizing. The README install command remains unchanged,
but its API example and behavior description will be rewritten for tiling.

## Testing

Implementation will follow test-driven development. Pure model tests will
cover:

- size normalization;
- active-tab updates;
- center tab merging;
- tab edge splitting;
- complete-leaf moves;
- empty-leaf removal and single-child split collapse;
- invalid/self moves;
- drop-edge calculation.

Component tests will cover:

- rendering the recursive default layout and only active panels;
- selecting tabs and reporting layout changes;
- controlled versus uncontrolled updates;
- tab and whole-pane drag/drop behavior;
- drop preview cleanup;
- pointer separator resizing;
- keyboard separator resizing and accessible metadata.

The final verification gate is:

```bash
bun run test
bun run lint
bun run build
bun run registry:build
git diff --check
```

The generated registry files will then be rebuilt a second time and compared
with the first build to prove generation is deterministic. The registry item
will also be inspected to confirm that it includes both install targets, their
contents, and the Base UI dependency.

## Out of Scope

- Floating or overlapping windows.
- Absolute pixel positions or z-index activation.
- Persisting layouts outside the controlled `layout` callback.
- Closing tabs, creating tabs from a palette, or product-specific toolbars.
- Touch-specific drag-and-drop beyond the browser's native HTML drag support.
- Compatibility wrappers for the incorrect compound API.
