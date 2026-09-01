import { Check, FileText, Grip, Link2, Search, Sparkles } from "lucide-react";

import { TabWindows } from "@/components/ui/tab-windows";

function WindowHandle({
  icon: Icon,
  label,
}: {
  icon: typeof Search;
  label: string;
}) {
  return (
    <TabWindows.Handle aria-label={`Move ${label}`}>
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="truncate">{label}</span>
      <Grip className="ml-auto size-3.5 text-muted-foreground/60" />
    </TabWindows.Handle>
  );
}

export function PanelsWorkspace() {
  return (
    <main className="min-h-svh bg-background px-4 py-10 text-foreground sm:px-8 sm:py-14">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
              <Sparkles className="size-3.5" />
              shadcn/ui + Base UI
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
              Tab windows
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              A freeform workspace for small, draggable windows with tab-like
              handles. Grab a tab and arrange the space your way.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border bg-card px-3 py-1.5">
              Drag
            </span>
            <span className="rounded-full border bg-card px-3 py-1.5">
              Arrow keys
            </span>
            <span className="rounded-full border bg-card px-3 py-1.5">
              Bounded
            </span>
          </div>
        </header>

        <TabWindows.Root
          aria-label="Tab windows demo"
          className="h-[640px] bg-[oklch(0.975_0.006_85)] shadow-inner dark:bg-muted/20"
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 flex h-11 items-center justify-between border-b bg-background/75 px-4 text-xs text-muted-foreground backdrop-blur">
            <span>Workspace</span>
            <span>Drag a tab to move its window</span>
          </div>

          <TabWindows.Item
            id="research"
            defaultPosition={{ x: 24, y: 72 }}
            className="w-56 sm:w-72"
          >
            <WindowHandle icon={Search} label="Research" />
            <TabWindows.Content>
              <div className="mb-3 flex items-center gap-2 rounded-lg border bg-muted/50 px-2.5 py-2 text-xs text-muted-foreground">
                <Search className="size-3.5" />
                Search references…
              </div>
              <div className="space-y-2">
                {[
                  "Designing spatial interfaces",
                  "Direct manipulation patterns",
                ].map((title) => (
                  <div
                    key={title}
                    className="flex items-start gap-2 rounded-lg p-2 text-sm hover:bg-muted/60"
                  >
                    <Link2 className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                    <span>{title}</span>
                  </div>
                ))}
              </div>
            </TabWindows.Content>
          </TabWindows.Item>

          <TabWindows.Item
            id="draft"
            defaultPosition={{ x: 48, y: 226 }}
            className="w-56 sm:w-80"
          >
            <WindowHandle icon={FileText} label="Draft" />
            <TabWindows.Content className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Untitled note</span>
                <span>Saved</span>
              </div>
              <h2 className="text-lg font-semibold tracking-tight">
                Interfaces should feel movable.
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Tabs organize a sequence. Tab windows organize a space—small
                thoughts that can be picked up and placed where they belong.
              </p>
            </TabWindows.Content>
          </TabWindows.Item>

          <TabWindows.Item
            id="tasks"
            defaultPosition={{ x: 72, y: 452 }}
            className="w-56 sm:w-64"
          >
            <WindowHandle icon={Check} label="Next steps" />
            <TabWindows.Content className="space-y-2">
              {[
                "Name the component",
                "Make it draggable",
                "Ship the registry",
              ].map((task, index) => (
                <div key={task} className="flex items-center gap-2 text-sm">
                  <span
                    className="grid size-5 place-items-center rounded-full border bg-primary text-primary-foreground"
                    aria-hidden="true"
                  >
                    {index < 2 ? <Check className="size-3" /> : null}
                  </span>
                  <span
                    className={
                      index < 2 ? "text-muted-foreground line-through" : ""
                    }
                  >
                    {task}
                  </span>
                </div>
              ))}
            </TabWindows.Content>
          </TabWindows.Item>
        </TabWindows.Root>

        <footer className="mt-5 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <code className="rounded-md bg-muted px-2 py-1 font-mono">
            import &#123; TabWindows &#125; from
            &quot;@/components/ui/tab-windows&quot;
          </code>
          <span>Pointer and keyboard accessible</span>
        </footer>
      </div>
    </main>
  );
}
