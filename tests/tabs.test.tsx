import { render, screen } from "@testing-library/react";
import { expect, it } from "bun:test";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../src/components/ui/tabs";

it("provides the default styled shadcn tab elements", () => {
  render(
    <Tabs defaultValue="one">
      <TabsList>
        <TabsTrigger value="one">One</TabsTrigger>
        <TabsTrigger value="two">Two</TabsTrigger>
      </TabsList>
      <TabsContent value="one">First panel</TabsContent>
      <TabsContent value="two">Second panel</TabsContent>
    </Tabs>,
  );

  expect(screen.getByRole("tablist")).toHaveAttribute("data-slot", "tabs-list");
  expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
    "data-slot",
    "tabs-trigger",
  );
  expect(screen.getByRole("tablist")).toHaveClass("rounded-lg");
  expect(screen.getByRole("tab", { name: "One" })).toHaveClass("rounded-md");
  expect(screen.getByText("First panel")).toHaveAttribute(
    "data-slot",
    "tabs-content",
  );
});
