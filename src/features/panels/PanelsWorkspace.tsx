import { Card, CardContent } from "@/components/ui/card";
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
      <Card>
        <CardContent data-demo-workspace>
          <TabWindows
            aria-label="Tiling tabs demo"
            defaultLayout={defaultLayout}
            renderPanel={(tab) =>
              `Panel ${tab}. Drag a tab to an edge of the workspace to tile it.`
            }
            renderTabLabel={(tab) => `Tab ${tab}`}
          />
        </CardContent>
      </Card>
    </main>
  );
}
