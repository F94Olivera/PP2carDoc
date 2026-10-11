import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

// Static security regression checks, not execution of Postgres/RLS.
const schema = readFileSync(new URL("../../../supabase/schema.sql", import.meta.url), "utf8");
const policy = (name: string) => {
  const match = schema.match(new RegExp(`create policy ${name}\\b[\\s\\S]*?;`));
  assert.ok(match, `Missing policy ${name}`);
  return match[0];
};

test("vehicle Data API policy checks active customer on both existing and resulting row", () => {
  const sql = policy("vehicles_access");
  assert.match(sql, /for all to authenticated/);
  assert.match(
    sql,
    /using \(exists\(select 1 from public.customers c where c.id = customer_id and c.is_active\)\)/,
  );
  assert.match(
    sql,
    /with check \(exists\(select 1 from public.customers c where c.id = customer_id and c.is_active\)\)/,
  );
  // An archived vehicle must remain selectable to restore it under an active parent.
  assert.doesNotMatch(sql, /vehicles.is_active|v.is_active/);
  assert.match(policy("customers_access"), /using \(private.can_access_mechanic\(mechanic_id\)\)/);
});

test("direct order and child access inherits both active parents with no GOD bypass", () => {
  const sql = policy("work_orders_access");
  assert.match(sql, /for all to authenticated/);
  assert.equal((sql.match(/v.is_active and c.is_active/g) ?? []).length, 2);
  assert.equal((sql.match(/join public.customers c on c.id = v.customer_id/g) ?? []).length, 2);
  assert.doesNotMatch(sql, /GOD|current_app_role/);
  for (const name of ["work_order_items_access", "recommendations_access"]) {
    const child = policy(name);
    assert.match(child, /for all to authenticated/);
    assert.equal(
      (child.match(/from public.work_orders w where w.id = work_order_id/g) ?? []).length,
      2,
    );
    assert.doesNotMatch(child, /GOD|current_app_role/);
  }
});
