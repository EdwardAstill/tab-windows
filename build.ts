import tailwind from "bun-plugin-tailwind";
import { cp, rm } from "node:fs/promises";

await rm("./dist", { force: true, recursive: true });

const result = await Bun.build({
  entrypoints: ["./index.html"],
  minify: true,
  outdir: "./dist",
  plugins: [tailwind],
});

if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}

await cp("./public", "./dist", { recursive: true });
