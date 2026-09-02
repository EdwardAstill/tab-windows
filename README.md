# Tab Windows

A shadcn/ui registry component for arranging draggable, tab-like windows in a
bounded workspace. It uses Base UI for the accessible handle primitive and ships
with accessible pointer and keyboard movement.

## Install

Initialize the consuming project with shadcn's Base UI preset if it is not
already configured:

```bash
bunx shadcn@latest init --base base
```

Install the component directly from this GitHub registry:

```bash
bunx shadcn@latest add EdwardAstill/tab-windows/tab-windows
```

The installer adds the Base UI dependency and writes
`components/ui/tab-windows.tsx`. No separate component stylesheet is required.

## Use

```tsx
import { TabWindows } from "@/components/ui/tab-windows";

export function Example() {
  return (
    <TabWindows.Root aria-label="Project workspace" className="h-[560px]">
      <TabWindows.Item id="notes" defaultPosition={{ x: 24, y: 40 }}>
        <TabWindows.Handle aria-label="Move Notes">Notes</TabWindows.Handle>
        <TabWindows.Content>Your content goes here.</TabWindows.Content>
      </TabWindows.Item>
    </TabWindows.Root>
  );
}
```

Drag a handle with a pointer. When the handle is focused, use the arrow keys to
move by 8 pixels or Shift + arrow keys to move by 32 pixels. Items remain inside
the root workspace and the most recently pressed item moves to the front.

`TabWindows.Item` also accepts `onPositionChange`, which receives `{ x, y }`
after pointer or keyboard movement.

## Develop

```bash
bun install
bun run dev
bun run test
bun run registry:build
```
