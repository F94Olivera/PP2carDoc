import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const backend = fileURLToPath(new URL("../", import.meta.url));
const root = fileURLToPath(new URL("../../../", import.meta.url));
const manifest = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const mode = process.argv[2] ?? "build";

const options = {
  absWorkingDir: backend,
  entryPoints: ["src/index.ts"],
  outfile: `${root}/supabase/functions/api/dist/index.js`,
  bundle: true,
  format: "esm",
  platform: "node",
  target: "es2022",
  plugins: [
    {
      name: "edge-npm-dependencies",
      setup(builder) {
        builder.onResolve({ filter: /^[^./]/ }, ({ path }) => {
          const name = path.startsWith("@")
            ? path.split("/").slice(0, 2).join("/")
            : path.split("/")[0];
          const version = manifest.dependencies[name];
          if (!version || version.startsWith("workspace:")) return;
          if (!/^\d+\.\d+\.\d+/.test(version)) throw new Error(`Pin ${name} to an exact version`);
          return { path: `npm:${name}@${version}${path.slice(name.length)}`, external: true };
        });
      },
    },
  ],
};

if (mode === "build") {
  await build(options);
} else if (mode === "serve") {
  const watcher = await context(options);
  await watcher.rebuild();
  await watcher.watch();
  const child = spawn("pnpm", ["supabase", "functions", "serve", "--env-file", ".env"], {
    cwd: root,
    stdio: "inherit",
  });
  for (const signal of ["SIGINT", "SIGTERM"]) process.once(signal, () => child.kill(signal));
  child.once("error", async (error) => {
    process.stderr.write(`${error.message}\n`);
    await watcher.dispose();
    process.exitCode = 1;
  });
  child.once("exit", async (code) => {
    await watcher.dispose();
    process.exitCode = code ?? 0;
  });
} else {
  throw new Error(`Unknown mode: ${mode}`);
}
