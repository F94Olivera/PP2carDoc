import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

for (const [domain, loader] of [
  ["customers", "listCustomers"],
  ["vehicles", "listVehicles"],
  ["work-orders", "listAllVehicles"],
]) {
  test(`${domain} discards obsolete loads, skips cleaned effects and clears failed results`, async () => {
    const states: unknown[] = [];
    let index = 0;
    const version = { current: 0 };
    let effect: (() => () => void) | undefined;
    const pending: { resolve: (value: unknown) => void; reject: (error: Error) => void }[] = [];
    const request = () => new Promise((resolve, reject) => pending.push({ resolve, reject }));
    const hooks = {
      useState: (initial: unknown) => {
        const slot = index++;
        states[slot] = typeof initial === "function" ? initial() : initial;
        return [
          states[slot],
          (value: unknown) => {
            states[slot] = value;
          },
        ];
      },
      useRef: () => version,
      useMemo: (fn: () => unknown) => fn(),
      useCallback: (fn: unknown) => fn,
      useEffect: (fn: () => () => void) => {
        effect = fn;
      },
    };
    const messages = new Proxy({}, { get: () => "message" });
    const result = await build({
      entryPoints: [new URL(`../../front/app/(app)/${domain}/page.tsx`, import.meta.url).pathname],
      bundle: true,
      write: false,
      platform: "node",
      format: "cjs",
      jsx: "automatic",
      plugins: [
        {
          name: "isolated-ui",
          setup(builder) {
            builder.onResolve({ filter: /.*/ }, (args) =>
              args.kind === "entry-point" ? undefined : { path: args.path, namespace: "double" },
            );
            builder.onLoad({ filter: /.*/, namespace: "double" }, (args) => {
              let contents = "export default () => null;";
              if (args.path === "react")
                contents = "export const {useState,useRef,useMemo,useCallback,useEffect}=hooks;";
              else if (args.path.includes("jsx-runtime"))
                contents = "export const jsx=()=>null; export const jsxs=jsx;";
              else if (args.path.includes("use-i18n"))
                contents =
                  "export const useI18n=()=>({t:{customers:messages,vehicles:messages,workOrders:messages}});";
              else if (args.path.includes("pagination-preferences"))
                contents =
                  "export const getStoredListPageSize=()=>10; export const listPageSizeOptions=[]; export const storeListPageSize=()=>{};";
              else if (args.path.endsWith("-api"))
                contents = `export const ${loader}=request; export const listAllCustomers=request; export const listAllWorkOrdersByVehicle=request; export const ${domain === "vehicles" ? "listAllVehicles=request," : ""} archiveCustomer=()=>{}, deleteCustomer=()=>{}, getCustomerName=()=>'', archiveVehicle=()=>{}, deleteVehicle=()=>{}, deleteWorkOrder=()=>{};`;
              return { contents };
            });
          },
        },
      ],
    });
    const module = { exports: {} as { default: () => unknown } };
    new Function("module", "exports", "hooks", "request", "messages", result.outputFiles[0]!.text)(
      module,
      module.exports,
      hooks,
      request,
      messages,
    );
    module.exports.default();
    assert.ok(effect);
    const flush = async () => {
      for (let i = 0; i < 12; i++) await Promise.resolve();
    };
    const skippedCleanup = effect();
    skippedCleanup();
    await flush();
    assert.equal(pending.length, 0);
    const cleanup = effect();
    await flush();
    cleanup();
    effect();
    await flush();
    assert.equal(pending.length, 2);
    pending[1]!.resolve({ data: [], meta: { totalPages: 1 } });
    await flush();
    const snapshot = [...states];
    pending[0]!.reject(new Error("obsolete error"));
    await flush();
    assert.deepEqual(states, snapshot);
    effect();
    await flush();
    pending[2]!.reject(new Error("current error"));
    await flush();
    assert.deepEqual(states[0], []);
    assert.ok(states.includes("current error"));
  });
}
