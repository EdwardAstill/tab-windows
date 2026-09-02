import { TabWindows } from "@/components/ui/tab-windows";
import type { TabWindowsLayout } from "@/lib/tab-windows-layout";

type DemoTab = "one" | "two" | "three";

const defaultLayout: TabWindowsLayout<DemoTab> = {
  type: "pane",
  id: "workspace",
  tabs: ["one", "two", "three"],
  activeTab: "one",
};

export function PanelsWorkspace() {
  return (
    <main>
      <TabWindows
        aria-label="Tiling tabs demo"
        className="h-svh border [&_[data-slot=tab-windows-pane]]:outline [&_[data-slot=tab-windows-pane]]:outline-1 [&_[data-slot=tab-windows-pane]]:outline-border [&_[data-slot=tab-windows-panel]]:p-4 [&_[data-slot=tab-windows-resize-handle]]:bg-border"
        defaultLayout={defaultLayout}
        renderPanel={(tab) => <div>{`Panel ${tab}`}</div>}
        renderTabLabel={(tab) => `Tab ${tab}`}
      />
    </main>
  );
}
