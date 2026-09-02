import { afterEach, expect, mock } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
const { cleanup } = await import("@testing-library/react");
const matchers = await import("@testing-library/jest-dom/matchers");
expect.extend(matchers);

afterEach(() => {
  cleanup();
  mock.restore();
});
