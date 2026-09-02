"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  computeTabWindowsDropEdge,
  moveTabWindowsTab,
  normalizeTabWindowsSizes,
  setTabWindowsActiveTab,
  setTabWindowsSizesAtPath,
  type TabWindowsDropEdge,
  type TabWindowsLayout,
  type TabWindowsPane,
  type TabWindowsSplit,
} from "@/lib/tab-windows-layout";
import { cn } from "@/lib/utils";

interface DragState<TTab extends string> {
  sourcePaneId: string;
  tab: TTab;
}

interface ResizeState {
  path: number[];
  index: number;
  direction: "horizontal" | "vertical";
  startClient: number;
  startSizes: number[];
  extent: number;
}

export interface TabWindowsProps<TTab extends string = string> {
  defaultLayout: TabWindowsLayout<TTab>;
  layout?: TabWindowsLayout<TTab>;
  onLayoutChange?: (layout: TabWindowsLayout<TTab>) => void;
  renderPanel: (tab: TTab) => ReactNode;
  renderTabLabel?: (tab: TTab) => ReactNode;
  minPaneSize?: number;
  className?: string;
  style?: CSSProperties;
  "aria-label"?: string;
}

export function TabWindows<TTab extends string = string>({
  defaultLayout,
  layout,
  onLayoutChange,
  renderPanel,
  renderTabLabel,
  minPaneSize = 140,
  className,
  style,
  "aria-label": ariaLabel = "Workspace",
}: TabWindowsProps<TTab>) {
  const [internalLayout, setInternalLayout] = useState(defaultLayout);
  const [drag, setDrag] = useState<DragState<TTab> | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    paneId: string;
    edge: TabWindowsDropEdge;
  } | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const instanceId = useId().replace(/:/g, "");
  const paneCounter = useRef(0);
  const currentLayout = layout ?? internalLayout;

  const updateLayout = useCallback(
    (update: (current: TabWindowsLayout<TTab>) => TabWindowsLayout<TTab>) => {
      const next = update(layout ?? internalLayout);
      if (layout === undefined) setInternalLayout(next);
      onLayoutChange?.(next);
    },
    [internalLayout, layout, onLayoutChange],
  );

  useEffect(() => {
    if (!resize) return;

    function onPointerMove(event: PointerEvent) {
      if (!resize) return;
      const client =
        resize.direction === "horizontal" ? event.clientX : event.clientY;
      const sizes = [...resize.startSizes];
      const first = sizes[resize.index] ?? 0;
      const second = sizes[resize.index + 1] ?? 0;
      const total = first + second;
      const minimum = Math.min(total / 2, minPaneSize / resize.extent);
      const nextFirst = Math.min(
        Math.max(first + (client - resize.startClient) / resize.extent, minimum),
        total - minimum,
      );
      sizes[resize.index] = nextFirst;
      sizes[resize.index + 1] = total - nextFirst;
      updateLayout((current) =>
        setTabWindowsSizesAtPath(current, resize.path, sizes),
      );
    }

    function stopResize() {
      setResize(null);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };
  }, [minPaneSize, resize, updateLayout]);

  function renderNode(node: TabWindowsLayout<TTab>, path: number[]): ReactNode {
    return node.type === "pane" ? renderPane(node) : renderSplit(node, path);
  }

  function renderSplit(node: TabWindowsSplit<TTab>, path: number[]) {
    const sizes = normalizeTabWindowsSizes(node.sizes, node.children.length);
    return (
      <div
        data-slot="tab-windows-split"
        data-direction={node.direction}
        className={cn(
          "flex size-full min-h-0 min-w-0 overflow-hidden",
          node.direction === "horizontal" ? "flex-row" : "flex-col",
        )}
      >
        {node.children.map((child, index) => (
          <Fragment key={`${path.join(".")}-${index}-${nodeKey(child)}`}>
            <div
              className="min-h-0 min-w-0 overflow-hidden"
              style={{ flex: `${sizes[index]} 1 0px` }}
            >
              {renderNode(child, [...path, index])}
            </div>
            {index < node.children.length - 1 ? (
              <div
                aria-label="Resize pane"
                aria-orientation={
                  node.direction === "horizontal" ? "vertical" : "horizontal"
                }
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((sizes[index] ?? 0) * 100)}
                className={cn(
                  "z-10 shrink-0 outline-none",
                  node.direction === "horizontal"
                    ? "w-1 cursor-col-resize"
                    : "h-1 cursor-row-resize",
                )}
                onKeyDown={(event) =>
                  resizeWithKeyboard(event, node, path, index)
                }
                onPointerDown={(event) =>
                  startResize(event, node, path, index)
                }
                role="separator"
                data-slot="tab-windows-resize-handle"
                tabIndex={0}
              />
            ) : null}
          </Fragment>
        ))}
      </div>
    );
  }

  function renderPane(pane: TabWindowsPane<TTab>) {
    const activeDrop =
      dropTarget?.paneId === pane.id ? dropTarget.edge : undefined;
    return (
      <section
        className="relative flex size-full min-h-0 min-w-0 flex-col overflow-hidden"
        data-drop-edge={activeDrop}
        data-pane-id={pane.id}
        data-slot="tab-windows-pane"
        onDragLeave={(event) => {
          const next = event.relatedTarget;
          if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
            setDropTarget(null);
          }
        }}
        onDragOver={(event) => updateDropTarget(event, pane.id)}
        onDrop={(event) => applyDrop(event, pane.id)}
      >
        <Tabs
          className="flex size-full min-h-0 flex-col"
          value={pane.activeTab}
          onValueChange={(value) => {
            if (typeof value !== "string") return;
            updateLayout((current) =>
              setTabWindowsActiveTab(current, pane.id, value as TTab),
            );
          }}
        >
          <TabsList
            aria-label={`${pane.id} tabs`}
            className="flex shrink-0"
          >
            {pane.tabs.map((tab) => (
              <TabsTrigger
                className="cursor-grab select-none"
                data-slot="tab-windows-tab"
                draggable
                key={tab}
                onDragEnd={clearDrag}
                onDragStart={(event) => startDrag(event, pane.id, tab)}
                value={tab}
              >
                {renderTabLabel?.(tab) ?? tab}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent
            className="min-h-0 flex-1 overflow-auto outline-none"
            data-slot="tab-windows-panel"
            value={pane.activeTab}
          >
            {renderPanel(pane.activeTab)}
          </TabsContent>
        </Tabs>
        {activeDrop ? (
          <div
            aria-hidden="true"
            className={dropIndicatorClass(activeDrop)}
            data-drop-edge={activeDrop}
            data-slot="tab-windows-drop-indicator"
          />
        ) : null}
      </section>
    );
  }

  function startDrag(
    event: DragEvent<HTMLButtonElement>,
    sourcePaneId: string,
    tab: TTab,
  ) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", `${sourcePaneId}:${tab}`);
    setDrag({ sourcePaneId, tab });
  }

  function clearDrag() {
    setDrag(null);
    setDropTarget(null);
  }

  function updateDropTarget(event: DragEvent<HTMLElement>, paneId: string) {
    if (!drag) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropTarget({
      paneId,
      edge: computeTabWindowsDropEdge(
        { x: event.clientX, y: event.clientY },
        event.currentTarget.getBoundingClientRect(),
      ),
    });
  }

  function applyDrop(event: DragEvent<HTMLElement>, targetPaneId: string) {
    if (!drag) return;
    event.preventDefault();
    paneCounter.current += 1;
    const edge =
      dropTarget?.paneId === targetPaneId ? dropTarget.edge : "center";
    updateLayout((current) =>
      moveTabWindowsTab(current, {
        ...drag,
        targetPaneId,
        edge,
        newPaneId: `pane-${instanceId}-${paneCounter.current}`,
      }),
    );
    clearDrag();
  }

  function resizeInfo(
    element: HTMLElement,
    node: TabWindowsSplit<TTab>,
    path: number[],
    index: number,
  ): Omit<ResizeState, "startClient"> | null {
    const rect = element.parentElement?.getBoundingClientRect();
    if (!rect) return null;
    return {
      path,
      index,
      direction: node.direction,
      startSizes: normalizeTabWindowsSizes(node.sizes, node.children.length),
      extent: Math.max(
        1,
        node.direction === "horizontal" ? rect.width : rect.height,
      ),
    };
  }

  function startResize(
    event: ReactPointerEvent<HTMLDivElement>,
    node: TabWindowsSplit<TTab>,
    path: number[],
    index: number,
  ) {
    const info = resizeInfo(event.currentTarget, node, path, index);
    if (!info) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setResize({
      ...info,
      startClient:
        node.direction === "horizontal" ? event.clientX : event.clientY,
    });
  }

  function resizeWithKeyboard(
    event: KeyboardEvent<HTMLDivElement>,
    node: TabWindowsSplit<TTab>,
    path: number[],
    index: number,
  ) {
    const decrease = node.direction === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const increase = node.direction === "horizontal" ? "ArrowRight" : "ArrowDown";
    if (event.key !== decrease && event.key !== increase) return;
    const sizes = normalizeTabWindowsSizes(node.sizes, node.children.length);
    const pair = (sizes[index] ?? 0) + (sizes[index + 1] ?? 0);
    const delta = (event.key === increase ? 1 : -1) * (event.shiftKey ? 0.1 : 0.02);
    const next = Math.min(Math.max((sizes[index] ?? 0) + delta, 0.1), pair - 0.1);
    sizes[index] = next;
    sizes[index + 1] = pair - next;
    event.preventDefault();
    updateLayout((current) => setTabWindowsSizesAtPath(current, path, sizes));
  }

  return (
    <div
      aria-label={ariaLabel}
      className={cn(
        "flex size-full min-h-0 min-w-0 overflow-hidden",
        resize && "select-none",
        className,
      )}
      data-slot="tab-windows"
      role="region"
      style={style}
    >
      {renderNode(currentLayout, [])}
    </div>
  );
}

function nodeKey<TTab extends string>(node: TabWindowsLayout<TTab>) {
  return node.type === "pane" ? node.id : node.direction;
}

function dropIndicatorClass(edge: TabWindowsDropEdge) {
  return cn(
    "pointer-events-none absolute z-20 rounded-md border-2 border-primary/70 bg-primary/15 shadow-sm",
    edge === "center" && "inset-2",
    edge === "left" && "inset-y-2 left-2 w-[calc(50%-0.5rem)]",
    edge === "right" && "inset-y-2 right-2 w-[calc(50%-0.5rem)]",
    edge === "top" && "inset-x-2 top-2 h-[calc(50%-0.5rem)]",
    edge === "bottom" && "inset-x-2 bottom-2 h-[calc(50%-0.5rem)]",
  );
}

export type {
  TabWindowsDropEdge,
  TabWindowsLayout,
  TabWindowsPane,
  TabWindowsSplit,
};
