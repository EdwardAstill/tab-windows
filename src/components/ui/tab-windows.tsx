"use client";

import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ComponentProps,
  type ComponentPropsWithoutRef,
  type FocusEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { Button as ButtonPrimitive } from "@base-ui/react/button";

import { cn } from "@/lib/utils";

export interface TabWindowPosition {
  x: number;
  y: number;
}

function clampPositionToElements(
  position: TabWindowPosition,
  rootElement: HTMLElement | null | undefined,
  itemElement: HTMLElement | null | undefined,
) {
  const rootRect = rootElement?.getBoundingClientRect();
  const itemRect = itemElement?.getBoundingClientRect();

  if (
    !rootRect ||
    !itemRect ||
    rootRect.width === 0 ||
    rootRect.height === 0 ||
    itemRect.width === 0 ||
    itemRect.height === 0
  ) {
    return position;
  }

  return {
    x: Math.min(
      Math.max(0, position.x),
      Math.max(0, rootRect.width - itemRect.width),
    ),
    y: Math.min(
      Math.max(0, position.y),
      Math.max(0, rootRect.height - itemRect.height),
    ),
  };
}

function positionsMatch(a: TabWindowPosition, b: TabWindowPosition) {
  return a.x === b.x && a.y === b.y;
}

interface TabWindowsRootContextValue {
  rootRef: RefObject<HTMLDivElement | null>;
  activeId: string | null;
  activate: (id: string) => number;
}

const TabWindowsRootContext = createContext<TabWindowsRootContextValue | null>(
  null,
);

const TabWindowsRoot = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>(function TabWindowsRoot({ className, ...props }, forwardedRef) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const topLayer = useRef(0);

  function activate(id: string) {
    topLayer.current += 1;
    setActiveId(id);
    return topLayer.current;
  }

  useImperativeHandle(forwardedRef, () => rootRef.current as HTMLDivElement);

  return (
    <TabWindowsRootContext.Provider value={{ rootRef, activeId, activate }}>
      <div
        ref={rootRef}
        role="region"
        data-slot="tab-windows-root"
        className={cn(
          "relative isolate min-h-80 overflow-hidden rounded-2xl border bg-muted/30 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:24px_24px]",
          className,
        )}
        {...props}
      />
    </TabWindowsRootContext.Provider>
  );
});

interface TabWindowsItemProps extends Omit<
  ComponentPropsWithoutRef<"section">,
  "id"
> {
  id: string;
  defaultPosition?: TabWindowPosition;
  onPositionChange?: (position: TabWindowPosition) => void;
}

interface TabWindowItemContextValue {
  moveBy: (x: number, y: number) => void;
  startDrag: (event: ReactPointerEvent<HTMLButtonElement>) => void;
}

const TabWindowItemContext = createContext<TabWindowItemContextValue | null>(
  null,
);

const TabWindowsItem = forwardRef<HTMLElement, TabWindowsItemProps>(
  function TabWindowsItem(
    {
      className,
      defaultPosition = { x: 0, y: 0 },
      id,
      onPositionChange,
      style,
      children,
      onFocusCapture,
      onPointerDown,
      ...props
    },
    forwardedRef,
  ) {
    const root = useContext(TabWindowsRootContext);
    const [position, setPosition] = useState(defaultPosition);
    const positionRef = useRef(defaultPosition);
    const itemRef = useRef<HTMLElement>(null);
    const removeDragListeners = useRef<(() => void) | null>(null);
    const [layer, setLayer] = useState(0);

    useImperativeHandle(forwardedRef, () => itemRef.current as HTMLElement);

    function clampPosition(nextPosition: TabWindowPosition) {
      return clampPositionToElements(
        nextPosition,
        root?.rootRef.current,
        itemRef.current,
      );
    }

    function moveBy(x: number, y: number) {
      updatePosition(
        clampPosition({
          x: positionRef.current.x + x,
          y: positionRef.current.y + y,
        }),
      );
    }

    const updatePosition = useCallback(
      (nextPosition: TabWindowPosition) => {
        positionRef.current = nextPosition;
        setPosition(nextPosition);
        onPositionChange?.(nextPosition);
      },
      [onPositionChange],
    );

    useEffect(() => {
      function clampToLayout() {
        const next = clampPositionToElements(
          positionRef.current,
          root?.rootRef.current,
          itemRef.current,
        );

        if (positionsMatch(positionRef.current, next)) return;
        updatePosition(next);
      }

      clampToLayout();

      if (typeof ResizeObserver === "undefined") return;

      const observer = new ResizeObserver(clampToLayout);
      if (root?.rootRef.current) observer.observe(root.rootRef.current);
      if (itemRef.current) observer.observe(itemRef.current);

      return () => observer.disconnect();
    }, [root?.rootRef, updatePosition]);

    function startDrag(event: ReactPointerEvent<HTMLButtonElement>) {
      if (event.button !== 0) return;

      event.currentTarget.focus();
      event.preventDefault();
      removeDragListeners.current?.();

      const pointerId = event.pointerId;
      const handle = event.currentTarget;
      const startPointer = { x: event.clientX, y: event.clientY };
      const startPosition = positionRef.current;
      handle.setPointerCapture?.(pointerId);

      function handlePointerMove(moveEvent: PointerEvent) {
        if (moveEvent.pointerId !== pointerId) return;

        updatePosition(
          clampPosition({
            x: startPosition.x + moveEvent.clientX - startPointer.x,
            y: startPosition.y + moveEvent.clientY - startPointer.y,
          }),
        );
      }

      function stopDragging(upEvent: PointerEvent) {
        if (upEvent.pointerId !== pointerId) return;
        removeDragListeners.current?.();
      }

      function removeListeners() {
        document.removeEventListener("pointermove", handlePointerMove);
        document.removeEventListener("pointerup", stopDragging);
        document.removeEventListener("pointercancel", stopDragging);
        handle.removeEventListener("lostpointercapture", stopDragging);
        window.removeEventListener("blur", removeListeners);
        removeDragListeners.current = null;

        if (handle.hasPointerCapture?.(pointerId)) {
          handle.releasePointerCapture(pointerId);
        }
      }

      removeDragListeners.current = removeListeners;
      document.addEventListener("pointermove", handlePointerMove);
      document.addEventListener("pointerup", stopDragging);
      document.addEventListener("pointercancel", stopDragging);
      handle.addEventListener("lostpointercapture", stopDragging);
      window.addEventListener("blur", removeListeners);
    }

    useEffect(() => () => removeDragListeners.current?.(), []);

    function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
      onPointerDown?.(event);
      if (event.button === 0 && root) {
        setLayer(root.activate(id));
      }
    }

    function handleFocusCapture(event: FocusEvent<HTMLElement>) {
      onFocusCapture?.(event);
      if (!event.currentTarget.contains(event.relatedTarget) && root) {
        setLayer(root.activate(id));
      }
    }

    return (
      <TabWindowItemContext.Provider value={{ moveBy, startDrag }}>
        <section
          ref={itemRef}
          id={id}
          data-active={String(root?.activeId === id)}
          data-slot="tab-windows-item"
          className={cn(
            "group/tab-window absolute left-0 top-0 w-72 outline-none",
            className,
          )}
          style={{
            ...style,
            transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
            zIndex: layer,
          }}
          onFocusCapture={handleFocusCapture}
          onPointerDown={handlePointerDown}
          {...props}
        >
          {children}
        </section>
      </TabWindowItemContext.Provider>
    );
  },
);

type TabWindowsHandleProps = ButtonPrimitive.Props;
type TabWindowsHandleKeyboardEvent = Parameters<
  NonNullable<TabWindowsHandleProps["onKeyDown"]>
>[0];
type TabWindowsHandlePointerEvent = Parameters<
  NonNullable<TabWindowsHandleProps["onPointerDown"]>
>[0];

function TabWindowsHandle({
  className,
  onKeyDown,
  onPointerDown,
  ...props
}: TabWindowsHandleProps) {
  const item = useContext(TabWindowItemContext);

  function handleKeyDown(event: TabWindowsHandleKeyboardEvent) {
    onKeyDown?.(event);
    if (event.defaultPrevented || !item) return;

    const distance = event.shiftKey ? 32 : 8;
    const movement = {
      ArrowDown: { x: 0, y: distance },
      ArrowLeft: { x: -distance, y: 0 },
      ArrowRight: { x: distance, y: 0 },
      ArrowUp: { x: 0, y: -distance },
    }[event.key];

    if (movement) {
      event.preventDefault();
      item.moveBy(movement.x, movement.y);
    }
  }

  function handlePointerDown(event: TabWindowsHandlePointerEvent) {
    onPointerDown?.(event);
    if (!event.defaultPrevented) item?.startDrag(event);
  }

  return (
    <ButtonPrimitive
      type="button"
      aria-keyshortcuts="ArrowUp ArrowDown ArrowLeft ArrowRight"
      data-slot="tab-windows-handle"
      className={cn(
        "relative z-10 inline-flex h-9 max-w-full cursor-grab touch-none select-none items-center justify-start gap-1.5 rounded-b-none rounded-t-xl border border-b-0 bg-card px-3 text-sm font-medium text-card-foreground shadow-xs outline-none transition-colors active:cursor-grabbing disabled:pointer-events-none disabled:opacity-50 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[active=true]/tab-window:bg-accent [&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      )}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      {...props}
    />
  );
}

function TabWindowsContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="tab-windows-content"
      className={cn(
        "rounded-b-xl rounded-tr-xl border bg-card p-4 text-card-foreground shadow-md transition-shadow group-data-[active=true]/tab-window:shadow-xl",
        className,
      )}
      {...props}
    />
  );
}

const TabWindows = {
  Root: TabWindowsRoot,
  Item: TabWindowsItem,
  Handle: TabWindowsHandle,
  Content: TabWindowsContent,
};

export { TabWindows };
