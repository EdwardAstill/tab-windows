import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "bun:test";

it("installs the tiling component and its layout model", () => {
  const registry = JSON.parse(
    readFileSync(resolve(process.cwd(), "registry.json"), "utf8"),
  ) as {
    items: Array<{
      name: string;
      description: string;
      dependencies: string[];
      files: Array<{ path: string; type: string; target: string }>;
    }>;
  };
  const item = registry.items.find(({ name }) => name === "tab-windows");

  expect(item?.description).toContain("tiled");
  expect(item?.dependencies).toEqual([
    "@base-ui/react",
    "class-variance-authority",
  ]);
  expect(item?.files).toEqual([
    {
      path: "src/components/ui/tab-windows.tsx",
      type: "registry:ui",
      target: "@ui/tab-windows.tsx",
    },
    {
      path: "src/components/ui/tabs.tsx",
      type: "registry:ui",
      target: "@ui/tabs.tsx",
    },
    {
      path: "src/lib/tab-windows-layout.ts",
      type: "registry:lib",
      target: "@lib/tab-windows-layout.ts",
    },
  ]);
});
