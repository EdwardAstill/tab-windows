import { createEvent, fireEvent, render, screen } from "@testing-library/react";
import { expect, it, mock } from "bun:test";

import { TabWindows } from "../src/components/ui/tab-windows";
import { PanelsWorkspace } from "../src/features/panels/PanelsWorkspace";
import type { TabWindowsLayout } from "../src/lib/tab-windows-layout";

type Tab = "research" | "draft" | "tasks";

function makeLayout(): TabWindowsLayout<Tab> {
  return {
    type: "split",
    direction: "horizontal",
    sizes: [0.5, 0.5],
    children: [
      {
        type: "pane",
        id: "research-pane",
        tabs: ["research", "tasks"],
        activeTab: "research",
      },
      {
        type: "pane",
        id: "draft-pane",
        tabs: ["draft"],
        activeTab: "draft",
      },
    ],
  };
}

const labels: Record<Tab, string> = {
  research: "Research",
  draft: "Draft",
  tasks: "Tasks",
};

it("renders the demo with only the shadcn Card defaults", () => {
  const { container } = render(<PanelsWorkspace />);
  const main = container.querySelector("main")!;
  const card = container.querySelector('[data-slot="card"]')!;
  const workspace = container.querySelector("[data-demo-workspace]")!;

  expect(main).not.toHaveAttribute("class");
  expect(card).toHaveClass("rounded-xl", "bg-card", "ring-1");
  expect(card.className).not.toMatch(/h-\[|w-\[|max-w-/);
  expect(workspace).toHaveClass("px-(--card-spacing)");
  expect(workspace.className).toBe("px-(--card-spacing)");
  expect(workspace).toContainElement(
    screen.getByRole("region", { name: "Tiling tabs demo" }),
  );
  expect(screen.getAllByRole("tab")).toHaveLength(3);
});

it("renders a tiled workspace and only the active tab in each pane", () => {
  render(
    <TabWindows
      aria-label="Project workspace"
      defaultLayout={makeLayout()}
      renderPanel={(tab) => <p>{tab} panel</p>}
      renderTabLabel={(tab) => labels[tab]}
    />,
  );

  expect(screen.getByRole("region", { name: "Project workspace" })).toBeInTheDocument();
  expect(screen.getAllByRole("separator")).toHaveLength(1);
  expect(screen.getByText("research panel")).toBeInTheDocument();
  expect(screen.queryByText("tasks panel")).not.toBeInTheDocument();
  expect(screen.getByText("draft panel")).toBeInTheDocument();
});

it("switches the active tab in a pane", () => {
  render(
    <TabWindows
      defaultLayout={makeLayout()}
      renderPanel={(tab) => <p>{tab} panel</p>}
      renderTabLabel={(tab) => labels[tab]}
    />,
  );

  fireEvent.click(screen.getByRole("tab", { name: "Tasks" }));

  expect(screen.getByText("tasks panel")).toBeInTheDocument();
  expect(screen.queryByText("research panel")).not.toBeInTheDocument();
});

it("leaves the tiling pane shell visually unstyled", () => {
  const { container } = render(
    <TabWindows
      defaultLayout={makeLayout()}
      renderPanel={(tab) => <p>{tab} panel</p>}
    />,
  );
  const pane = container.querySelector('[data-slot="tab-windows-pane"]')!;
  const visualUtilities = /(^|\s)(border|rounded|bg-|text-|shadow|p[trblxy]?-)\S*/;

  expect(pane.className).not.toMatch(visualUtilities);
});

it("uses the shadcn tab defaults without component overrides", () => {
  const { container } = render(
    <TabWindows
      defaultLayout={makeLayout()}
      renderPanel={(tab) => <p>{tab} panel</p>}
    />,
  );
  const tabList = screen.getAllByRole("tablist")[0];
  const tab = screen.getByRole("tab", { name: "research" });
  const panel = container.querySelector('[data-slot="tab-windows-panel"]')!;

  expect(tabList).toHaveClass("inline-flex");
  expect(tabList).not.toHaveClass("shrink-0");
  expect(tab).not.toHaveClass("cursor-grab", "select-none");
  expect(panel).not.toHaveClass("min-h-0", "overflow-auto");
});

it("exposes slots so consumers can style the unstyled parts", () => {
  const { container } = render(
    <TabWindows
      defaultLayout={makeLayout()}
      renderPanel={(tab) => <p>{tab} panel</p>}
    />,
  );

  expect(container.querySelector('[data-slot="tab-windows-tab"]')).not.toBeNull();
  expect(container.querySelector('[data-slot="tab-windows-panel"]')).not.toBeNull();
  expect(
    container.querySelector('[data-slot="tab-windows-resize-handle"]'),
  ).not.toBeNull();
});

it("previews and applies an edge drop", () => {
  const onLayoutChange = mock();
  const { container } = render(
    <TabWindows
      defaultLayout={{
        type: "pane",
        id: "main",
        tabs: ["research", "draft"],
        activeTab: "research",
      }}
      onLayoutChange={onLayoutChange}
      renderPanel={(tab) => <p>{tab} panel</p>}
    />,
  );
  const transfer = {
    effectAllowed: "none",
    dropEffect: "none",
    setData: mock(),
  };
  const draft = screen.getByRole("tab", { name: "draft" });
  const pane = container.querySelector<HTMLElement>('[data-slot="tab-windows-pane"]')!;
  pane.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 400, height: 300 }) as DOMRect;

  fireEvent.dragStart(draft, { dataTransfer: transfer });
  const dragOver = createEvent.dragOver(pane, { dataTransfer: transfer });
  Object.defineProperties(dragOver, {
    clientX: { value: 395 },
    clientY: { value: 150 },
  });
  fireEvent(pane, dragOver);
  expect(pane).toHaveAttribute("data-drop-edge", "right");
  const indicator = container.querySelector(
    '[data-slot="tab-windows-drop-indicator"]',
  );
  expect(indicator).toHaveAttribute("data-drop-edge", "right");
  expect(indicator).toHaveClass(
    "border-2",
    "border-primary/50",
    "bg-primary/10",
  );
  fireEvent.drop(pane, { clientX: 395, clientY: 150, dataTransfer: transfer });

  const next = onLayoutChange.mock.calls.at(-1)?.[0] as TabWindowsLayout<Tab>;
  expect(next).toMatchObject({ type: "split", direction: "horizontal" });
  expect(container.querySelector("[data-drop-edge]")).toBeNull();
  expect(
    container.querySelector('[data-slot="tab-windows-drop-indicator"]'),
  ).toBeNull();
});
