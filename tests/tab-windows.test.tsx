import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TabWindows } from "../src/components/ui/tab-windows";

describe("TabWindows", () => {
  it("exports a compound component API", async () => {
    const component = await import("../src/components/ui/tab-windows");

    expect(component).toHaveProperty("TabWindows");
  });

  it("renders an initially positioned window with an accessible drag handle", () => {
    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item
          data-testid="notes-window"
          id="notes"
          defaultPosition={{ x: 24, y: 40 }}
        >
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
          <TabWindows.Content>Write the release notes.</TabWindows.Content>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    expect(
      screen.getByRole("region", { name: "Example workspace" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("notes-window")).toHaveStyle({
      transform: "translate3d(24px, 40px, 0)",
    });
    expect(
      screen.getByRole("button", { name: "Move Notes" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Write the release notes.")).toBeInTheDocument();
  });

  it("moves a window from its handle with the arrow keys", () => {
    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item
          data-testid="notes-window"
          id="notes"
          defaultPosition={{ x: 24, y: 40 }}
        >
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    const workspace = screen.getByRole("region", {
      name: "Example workspace",
    });
    const window = screen.getByTestId("notes-window");
    const handle = screen.getByRole("button", { name: "Move Notes" });
    workspace.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 500, height: 300 }) as DOMRect;
    window.getBoundingClientRect = () =>
      ({ left: 24, top: 40, width: 160, height: 120 }) as DOMRect;
    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowDown", shiftKey: true });

    expect(window).toHaveStyle({
      transform: "translate3d(32px, 72px, 0)",
    });
  });

  it("keeps a dragged window inside the workspace", () => {
    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item
          data-testid="notes-window"
          id="notes"
          defaultPosition={{ x: 24, y: 40 }}
        >
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    const workspace = screen.getByRole("region", {
      name: "Example workspace",
    });
    const window = screen.getByTestId("notes-window");
    const handle = screen.getByRole("button", { name: "Move Notes" });
    workspace.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 500, height: 300 }) as DOMRect;
    window.getBoundingClientRect = () =>
      ({ left: 24, top: 40, width: 160, height: 120 }) as DOMRect;

    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 1,
      clientX: 30,
      clientY: 50,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 600,
      clientY: 400,
    });
    fireEvent.pointerUp(document, { pointerId: 1 });

    expect(window).toHaveStyle({
      transform: "translate3d(340px, 180px, 0)",
    });
  });

  it("clamps an initial position after the workspace is laid out", () => {
    const getBoundingClientRect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function () {
        if (this.dataset.slot === "tab-windows-root") {
          return { left: 0, top: 0, width: 500, height: 300 } as DOMRect;
        }
        if (this.dataset.slot === "tab-windows-item") {
          return { left: 0, top: 0, width: 160, height: 120 } as DOMRect;
        }
        return { left: 0, top: 0, width: 0, height: 0 } as DOMRect;
      });

    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item
          data-testid="notes-window"
          id="notes"
          defaultPosition={{ x: 900, y: 400 }}
        >
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    expect(getBoundingClientRect).toHaveBeenCalled();
    expect(screen.getByTestId("notes-window")).toHaveStyle({
      transform: "translate3d(340px, 180px, 0)",
    });
  });

  it("reclamps a window when the workspace shrinks", () => {
    let rootWidth = 500;
    let resizeCallback: ResizeObserverCallback | undefined;

    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallback = callback;
        }

        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function () {
        if (this.dataset.slot === "tab-windows-root") {
          return { left: 0, top: 0, width: rootWidth, height: 300 } as DOMRect;
        }
        if (this.dataset.slot === "tab-windows-item") {
          return { left: 0, top: 0, width: 160, height: 120 } as DOMRect;
        }
        return { left: 0, top: 0, width: 0, height: 0 } as DOMRect;
      },
    );

    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item
          data-testid="notes-window"
          id="notes"
          defaultPosition={{ x: 300, y: 40 }}
        >
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    rootWidth = 260;
    act(() => resizeCallback?.([], {} as ResizeObserver));

    expect(screen.getByTestId("notes-window")).toHaveStyle({
      transform: "translate3d(100px, 40px, 0)",
    });
  });

  it("reports an automatic clamp once in Strict Mode", () => {
    const onPositionChange = vi.fn();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function () {
        if (this.dataset.slot === "tab-windows-root") {
          return { left: 0, top: 0, width: 500, height: 300 } as DOMRect;
        }
        if (this.dataset.slot === "tab-windows-item") {
          return { left: 0, top: 0, width: 160, height: 120 } as DOMRect;
        }
        return { left: 0, top: 0, width: 0, height: 0 } as DOMRect;
      },
    );

    render(
      <StrictMode>
        <TabWindows.Root aria-label="Example workspace">
          <TabWindows.Item
            id="notes"
            defaultPosition={{ x: 900, y: 400 }}
            onPositionChange={onPositionChange}
          >
            <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
          </TabWindows.Item>
        </TabWindows.Root>
      </StrictMode>,
    );

    expect(onPositionChange).toHaveBeenCalledTimes(1);
    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 340, y: 180 });
  });

  it("keeps bounds working when consumers attach element refs", () => {
    const workspaceRef = createRef<HTMLDivElement>();
    const windowRef = createRef<HTMLElement>();
    render(
      <TabWindows.Root ref={workspaceRef} aria-label="Example workspace">
        <TabWindows.Item
          ref={windowRef}
          data-testid="notes-window"
          id="notes"
          defaultPosition={{ x: 24, y: 40 }}
        >
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    workspaceRef.current!.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 500, height: 300 }) as DOMRect;
    windowRef.current!.getBoundingClientRect = () =>
      ({ left: 24, top: 40, width: 160, height: 120 }) as DOMRect;

    const handle = screen.getByRole("button", { name: "Move Notes" });
    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 1,
      clientX: 30,
      clientY: 50,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 600,
      clientY: 400,
    });
    fireEvent.pointerUp(document, { pointerId: 1 });

    expect(windowRef.current).toHaveStyle({
      transform: "translate3d(340px, 180px, 0)",
    });
  });

  it("stops dragging when pointer capture is lost", () => {
    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item data-testid="notes-window" id="notes">
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    const workspace = screen.getByRole("region", {
      name: "Example workspace",
    });
    const window = screen.getByTestId("notes-window");
    const handle = screen.getByRole("button", { name: "Move Notes" });
    workspace.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 500, height: 300 }) as DOMRect;
    window.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 160, height: 120 }) as DOMRect;
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => true);
    handle.releasePointerCapture = vi.fn();

    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 1,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 40,
      clientY: 40,
    });
    fireEvent.lostPointerCapture(handle, { pointerId: 1 });
    fireEvent.pointerMove(document, {
      pointerId: 1,
      clientX: 80,
      clientY: 80,
    });

    expect(handle.setPointerCapture).toHaveBeenCalledWith(1);
    expect(window).toHaveStyle({
      transform: "translate3d(30px, 30px, 0)",
    });
  });

  it("keeps the drag handle focused after pointer interaction", () => {
    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item id="notes">
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    const handle = screen.getByRole("button", { name: "Move Notes" });
    handle.setPointerCapture = vi.fn();
    handle.hasPointerCapture = vi.fn(() => false);
    fireEvent.pointerDown(handle, { button: 0, pointerId: 1 });

    expect(handle).toHaveFocus();
  });

  it("brings the pressed window to the front", () => {
    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item data-testid="notes-window" id="notes">
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
        <TabWindows.Item data-testid="tasks-window" id="tasks">
          <TabWindows.Handle aria-label="Move Tasks">Tasks</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    const notes = screen.getByTestId("notes-window");
    const tasks = screen.getByTestId("tasks-window");
    fireEvent.pointerDown(notes, { button: 0, pointerId: 1 });

    expect(notes).toHaveAttribute("data-active", "true");
    expect(tasks).toHaveAttribute("data-active", "false");
    expect(Number(notes.style.zIndex)).toBeGreaterThan(
      Number(tasks.style.zIndex),
    );
  });

  it("brings a window to the front when keyboard focus enters it", () => {
    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item data-testid="notes-window" id="notes">
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
        <TabWindows.Item data-testid="tasks-window" id="tasks">
          <TabWindows.Handle aria-label="Move Tasks">Tasks</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    fireEvent.focus(screen.getByRole("button", { name: "Move Tasks" }));

    expect(screen.getByTestId("tasks-window")).toHaveAttribute(
      "data-active",
      "true",
    );
    expect(screen.getByTestId("notes-window")).toHaveAttribute(
      "data-active",
      "false",
    );
  });

  it("reports position changes to the consumer", () => {
    const onPositionChange = vi.fn();
    render(
      <TabWindows.Root aria-label="Example workspace">
        <TabWindows.Item
          data-testid="notes-window"
          id="notes"
          defaultPosition={{ x: 24, y: 40 }}
          onPositionChange={onPositionChange}
        >
          <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        </TabWindows.Item>
      </TabWindows.Root>,
    );

    const workspace = screen.getByRole("region", {
      name: "Example workspace",
    });
    const window = screen.getByTestId("notes-window");
    workspace.getBoundingClientRect = () =>
      ({ left: 0, top: 0, width: 500, height: 300 }) as DOMRect;
    window.getBoundingClientRect = () =>
      ({ left: 24, top: 40, width: 160, height: 120 }) as DOMRect;

    fireEvent.keyDown(screen.getByRole("button", { name: "Move Notes" }), {
      key: "ArrowRight",
    });

    expect(onPositionChange).toHaveBeenLastCalledWith({ x: 32, y: 40 });
  });
});
