import assert from "node:assert/strict";
import pino from "pino";
import postgres from "postgres";

const logger = pino();
const base = process.env.TEST_API_URL;
const authUrl = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_PUBLISHABLE_KEY;
const password = process.env.SEED_DEMO_PASSWORD;
assert.ok(
  base && authUrl && key && password,
  "Configure the matching project and demo seed in root .env",
);
const sql = postgres(process.env.EDGE_DATABASE_URL ?? process.env.DATABASE_URL, {
  max: 3,
  prepare: false,
  ssl: process.env.DATABASE_SSL === "false" ? false : "require",
});
const sessions = [];
const created = [];
const testVehicles = [];
let god;
let metadata;
const api = (path, session, method = "GET", body) =>
  fetch(`${base}${path}`, {
    method,
    headers: {
      ...(session ? { Authorization: `Bearer ${session.token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
const rest = (table, session, method = "GET", body, filter = "") =>
  fetch(`${authUrl}/rest/v1/${table}${filter}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${session.token}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
const json = async (response, status = 200) => {
  const body = await response.json();
  assert.equal(response.status, status, JSON.stringify(body));
  return body;
};
const login = async (email, role) => {
  const result = await json(await api("/login", null, "POST", { email, password }));
  assert.equal(result.user.role, role);
  const session = { token: result.session.access_token, id: result.user.id, role };
  const claims = JSON.parse(Buffer.from(session.token.split(".")[1], "base64url").toString());
  assert.equal(claims.app_metadata.user_role, role, "server-controlled signed claim");
  sessions.push(session);
  return session;
};
const asUser = (session, operation, overrides = {}) =>
  sql.begin(async (tx) => {
    const claims = JSON.parse(Buffer.from(session.token.split(".")[1], "base64url").toString());
    Object.assign(claims, overrides);
    await tx`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    await tx`set local role authenticated`;
    return operation(tx);
  });
const expectDenied = async (operation) => {
  await assert.rejects(operation, (error) =>
    ["42501", "23503", "23505", "23514"].includes(error.code),
  );
};

try {
  assert.equal((await api("/customers")).status, 401);
  const anonymous = await fetch(`${authUrl}/rest/v1/customers`, { headers: { apikey: key } });
  assert.ok([401, 403].includes(anonymous.status), "anonymous Data API access denied");
  const a = await login("mateo.cardoc.20261006@example.test", "MECHANIC");
  const b = await login("lucia.cardoc.20261006@example.test", "MECHANIC");
  god = await login("god.cardoc@example.test", "GOD");
  const lists = await Promise.all(
    [a, b, god].map((s) => api("/customers?pageSize=100", s).then(json)),
  );
  assert.equal(lists[0].meta.total, 10);
  assert.equal(lists[1].meta.total, 10);
  assert.equal(lists[2].meta.total, 20);
  assert.ok(lists[0].data.every((c) => c.mechanicId === a.id));
  assert.ok(lists[1].data.every((c) => c.mechanicId === b.id));
  const aCustomer = lists[0].data[0].id;
  const bCustomer = lists[1].data[0].id;
  assert.equal((await api(`/customers/${bCustomer}`, a)).status, 404);
  assert.equal((await api(`/customers/${aCustomer}`, b)).status, 404);
  for (const query of [
    "?page=0",
    "?pageSize=101",
    "?unexpected=true",
    "?page=1&page=2",
    "?includeArchived=1",
  ]) {
    assert.equal((await api(`/customers${query}`, a)).status, 400);
  }
  const page = await json(await api("/customers?pageSize=2&page=2", a));
  assert.equal(page.meta.total, 10);
  assert.deepEqual(
    page.data.map((c) => c.id),
    lists[0].data.slice(2, 4).map((c) => c.id),
  );
  assert.deepEqual((await json(await api("/customers?page=100", a))).data, []);
  const parallel = await Promise.all(
    Array.from({ length: 12 }, (_, i) => api("/customers", i % 2 ? a : b).then(json)),
  );
  parallel.forEach((r, i) =>
    assert.ok(r.data.every((c) => c.mechanicId === (i % 2 ? a.id : b.id))),
  );

  const documentNumber = `AUTH-TEST-${Date.now()}`;
  for (const session of [a, b]) {
    const customer = await json(
      await api("/customers", session, "POST", {
        firstName: "Authorization fixture",
        documentNumber,
      }),
      201,
    );
    assert.equal(customer.mechanicId, session.id);
    created.push(customer.id);
  }
  assert.equal(
    (await api("/customers", a, "POST", { firstName: "Duplicate", documentNumber })).status,
    409,
  );
  assert.equal(
    (await api("/customers", a, "POST", { firstName: "Cross owner", mechanicId: b.id })).status,
    403,
  );
  assert.equal(
    (await api("/customers", a, "POST", { firstName: "Escalation", role: "GOD" })).status,
    400,
  );
  assert.equal(
    (await api(`/customers/${created[1]}`, a, "PATCH", { notes: "Forbidden" })).status,
    404,
  );
  assert.equal((await api(`/customers/${created[1]}`, a, "DELETE")).status, 404);
  assert.equal(
    (await api(`/customers/${created[0]}`, a, "PATCH", { mechanicId: b.id })).status,
    400,
  );
  assert.equal((await api(`/customers/${created[0]}`, a, "PATCH", {})).status, 400);
  await json(
    await api(`/customers/${created[0]}`, a, "PATCH", { notes: "Own edit", isActive: false }),
  );
  assert.equal((await json(await api("/customers?includeArchived=true", a))).meta.total, 11);
  assert.equal((await json(await api("/customers", a))).meta.total, 10);
  await json(await api(`/customers/${created[1]}`, god, "PATCH", { notes: "GOD edit" }));
  for (const mechanicId of [undefined, god.id, "00000000-0000-4000-8000-000000000001"]) {
    assert.equal(
      (await api("/customers", god, "POST", { firstName: "Invalid owner", mechanicId })).status,
      403,
    );
  }
  const assigned = await json(
    await api("/customers", god, "POST", { firstName: "Assigned", mechanicId: a.id }),
    201,
  );
  created.push(assigned.id);
  assert.equal(assigned.mechanicId, a.id);
  assert.equal(
    (await api(`/customers/${created[0]}`, god, "PATCH", { mechanicId: b.id })).status,
    400,
  );
  await expectDenied(() =>
    asUser(god, (tx) => tx`update customers set mechanic_id=${b.id} where id=${created[0]}`),
  );
  await expectDenied(() =>
    asUser(
      god,
      (tx) => tx`insert into customers(mechanic_id,first_name) values(${god.id},'Invalid')`,
    ),
  );
  await expectDenied(() => sql`update user_profiles set role='GOD' where id=${a.id}`);

  logger.info("PASS: HTTP identity, isolated pagination, customer CRUD and owner selection");

  // Direct Data API proves that Express is not the only authorization boundary.
  const [owners] = await sql`select json_build_object(
    'vehicles', (select json_agg(v.id) from vehicles v join customers c on c.id=v.customer_id where c.mechanic_id=${b.id}),
    'work_orders', (select json_agg(w.id) from work_orders w join vehicles v on v.id=w.vehicle_id join customers c on c.id=v.customer_id where c.mechanic_id=${b.id}),
    'work_order_items', (select json_agg(i.id) from work_order_items i join work_orders w on w.id=i.work_order_id join vehicles v on v.id=w.vehicle_id join customers c on c.id=v.customer_id where c.mechanic_id=${b.id}),
    'work_order_recommendations', (select json_agg(i.id) from work_order_recommendations i join work_orders w on w.id=i.work_order_id join vehicles v on v.id=w.vehicle_id join customers c on c.id=v.customer_id where c.mechanic_id=${b.id})
  ) as data`;
  for (const [table, ids] of Object.entries(owners.data)) {
    const hidden = await json(await rest(table, a, "GET", undefined, `?id=eq.${ids[0]}`));
    assert.deepEqual(hidden, [], `${table} cross read`);
    assert.equal(
      (await json(await rest(table, b, "GET", undefined, `?id=eq.${ids[0]}`))).length,
      1,
    );
    assert.equal(
      (await json(await rest(table, god, "GET", undefined, `?id=eq.${ids[0]}`))).length,
      1,
    );
    const patch =
      table === "vehicles"
        ? { make: "Forbidden" }
        : table === "work_orders"
          ? { notes: "Forbidden" }
          : { description: "Forbidden" };
    assert.deepEqual(await json(await rest(table, a, "PATCH", patch, `?id=eq.${ids[0]}`)), []);
    assert.deepEqual(await json(await rest(table, a, "DELETE", undefined, `?id=eq.${ids[0]}`)), []);
  }
  // Explicit transaction assertions cover child creation/reparenting, protected profiles,
  // scoped uniqueness and actual writes with fixture cleanup after verification.
  await expectDenied(() =>
    asUser(
      a,
      (tx) =>
        tx`insert into vehicles(customer_id,license_plate,make,model,odometer_unit) values(${bCustomer},'TEST-CROSS','Test','Test','km')`,
    ),
  );
  const bv = owners.data.vehicles[0],
    bw = owners.data.work_orders[0];
  await expectDenied(() =>
    asUser(
      a,
      (tx) =>
        tx`insert into work_orders(vehicle_id,entry_date,reported_problem) values(${bv},now(),'Cross')`,
    ),
  );
  await expectDenied(() =>
    asUser(
      a,
      (tx) =>
        tx`insert into work_order_items(work_order_id,description,category,quantity,unit_price) values(${bw},'Cross','labor',1,1)`,
    ),
  );
  await expectDenied(() =>
    asUser(
      a,
      (tx) =>
        tx`insert into work_order_recommendations(work_order_id,description) values(${bw},'Cross')`,
    ),
  );
  await expectDenied(() =>
    asUser(a, (tx) => tx`update customers set mechanic_id=${b.id} where id=${aCustomer}`),
  );
  const ownVehicles = await json(await rest("vehicles", a));
  await expectDenied(() =>
    asUser(
      a,
      (tx) => tx`update vehicles set customer_id=${bCustomer} where id=${ownVehicles[0].id}`,
    ),
  );
  await expectDenied(() =>
    asUser(
      a,
      (tx) =>
        tx`insert into vehicles(customer_id,license_plate,make,model,odometer_unit) values(${aCustomer},${ownVehicles[0].license_plate.toLowerCase()},'Test','Test','km')`,
    ),
  );
  const oldRows = await asUser(a, (tx) => tx`select id from customers`, {
    iat: Math.floor(Date.now() / 1000) - 901,
  });
  assert.equal(oldRows.length, 0, "RLS rejects token older than fifteen minutes");
  const bClaims = JSON.parse(Buffer.from(b.token.split(".")[1], "base64url").toString());
  assert.equal(
    (await asUser(a, (tx) => tx`select id from customers`, { session_id: bClaims.session_id }))
      .length,
    0,
    "session must belong to this user",
  );
  const ownOrders = await json(await rest("work_orders", a));
  const ownItems = await json(await rest("work_order_items", a));
  const ownRecommendations = await json(await rest("work_order_recommendations", a));
  await expectDenied(() =>
    asUser(a, (tx) => tx`update work_orders set vehicle_id=${bv} where id=${ownOrders[0].id}`),
  );
  await expectDenied(() =>
    asUser(
      a,
      (tx) => tx`update work_order_items set work_order_id=${bw} where id=${ownItems[0].id}`,
    ),
  );
  await expectDenied(() =>
    asUser(
      a,
      (tx) =>
        tx`update work_order_recommendations set work_order_id=${bw} where id=${ownRecommendations[0].id}`,
    ),
  );
  const duplicatePlate = await asUser(b, async (tx) => {
    const [v] =
      await tx`insert into vehicles(customer_id,license_plate,make,model,odometer_unit) values(${bCustomer},${ownVehicles[0].license_plate},'Test','Test','km') returning id`;
    return v.id;
  });
  await sql`delete from vehicles where id=${duplicatePlate}`;
  const plate = `CONCURRENT-${Date.now()}`;
  const concurrentInserts = await Promise.allSettled(
    [0, 1].map(() =>
      asUser(a, async (tx) => {
        const [v] =
          await tx`insert into vehicles(customer_id,license_plate,make,model,odometer_unit) values(${created[0]},${plate},'Test','Test','km') returning id`;
        return v.id;
      }),
    ),
  );
  assert.equal(concurrentInserts.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    concurrentInserts.filter((r) => r.status === "rejected" && r.reason.code === "23505").length,
    1,
  );
  for (const result of concurrentInserts)
    if (result.status === "fulfilled") testVehicles.push(result.value);
  const conflicting = await asUser(b, async (tx) => {
    const [v] =
      await tx`insert into vehicles(customer_id,license_plate,make,model,odometer_unit) values(${created[1]},${plate},'Test','Test','km') returning id`;
    return v.id;
  });
  testVehicles.push(conflicting);
  assert.equal(
    (await api(`/customers/${created[0]}`, god, "PATCH", { mechanicId: b.id })).status,
    400,
    "transfer is rejected before checking plate collision",
  );
  await sql`delete from vehicles where id=${conflicting}`;
  const inheritedVehicle = testVehicles[0];
  const inherited = await asUser(a, async (tx) => {
    const [w] =
      await tx`insert into work_orders(vehicle_id,entry_date,reported_problem) values(${inheritedVehicle},now(),'Transfer test') returning id`;
    const [i] =
      await tx`insert into work_order_items(work_order_id,description,category,quantity,unit_price) values(${w.id},'Test','labor',1,1) returning id`;
    const [r] =
      await tx`insert into work_order_recommendations(work_order_id,description) values(${w.id},'Test') returning id`;
    return {
      work_orders: w.id,
      work_order_items: i.id,
      work_order_recommendations: r.id,
      vehicles: inheritedVehicle,
    };
  });
  assert.equal(
    (await api(`/customers/${created[0]}`, god, "PATCH", { mechanicId: b.id })).status,
    400,
  );
  await expectDenied(() =>
    asUser(
      god,
      (tx) => tx`update vehicles set customer_id=${bCustomer} where id=${inheritedVehicle}`,
    ),
  );
  await expectDenied(() =>
    asUser(
      god,
      (tx) => tx`update work_orders set vehicle_id=${bv} where id=${inherited.work_orders}`,
    ),
  );
  for (const [table, id] of Object.entries(inherited)) {
    assert.equal((await json(await rest(table, a, "GET", undefined, `?id=eq.${id}`))).length, 1);
    assert.deepEqual(await json(await rest(table, b, "GET", undefined, `?id=eq.${id}`)), []);
  }
  await sql`delete from work_orders where vehicle_id=${inheritedVehicle}`;
  await sql`delete from vehicles where id=${inheritedVehicle}`;
  testVehicles.length = 0;
  // Child writes are allowed for owner/GOD and cross-owner changes remain blocked.
  for (const session of [b, god]) {
    await asUser(session, async (tx) => {
      const [v] =
        await tx`insert into vehicles(customer_id,license_plate,make,model,odometer_unit) values(${bCustomer},${`TEST-${session.role}`},'Test','Test','km') returning id`;
      const [w] =
        await tx`insert into work_orders(vehicle_id,entry_date,reported_problem) values(${v.id},now(),'Test') returning id`;
      const [i] =
        await tx`insert into work_order_items(work_order_id,description,category,quantity,unit_price) values(${w.id},'Test','labor',1,1) returning id`;
      const [r] =
        await tx`insert into work_order_recommendations(work_order_id,description) values(${w.id},'Test') returning id`;
      assert.equal(
        (await tx`update vehicles set make='Updated' where id=${v.id} returning id`).length,
        1,
      );
      assert.equal(
        (await tx`update work_orders set notes='Updated' where id=${w.id} returning id`).length,
        1,
      );
      assert.equal(
        (await tx`update work_order_items set description='Updated' where id=${i.id} returning id`)
          .length,
        1,
      );
      assert.equal(
        (
          await tx`update work_order_recommendations set description='Updated' where id=${r.id} returning id`
        ).length,
        1,
      );
      await tx`delete from work_order_items where id=${i.id}`;
      await tx`delete from work_order_recommendations where id=${r.id}`;
      await tx`delete from work_orders where id=${w.id}`;
      await tx`delete from vehicles where id=${v.id}`;
    });
  }
  assert.equal(
    (await rest("user_profiles", god, "PATCH", { id: a.id }, `?id=eq.${god.id}`)).status,
    403,
    "profile identity is immutable even for GOD",
  );
  for (const session of [a, god]) {
    assert.equal(
      (await rest("user_profiles", session, "PATCH", { role: "GOD" }, `?id=eq.${a.id}`)).status,
      403,
    );
  }
  const [original] = await sql`select raw_user_meta_data from auth.users where id=${a.id}`;
  metadata = { id: a.id, value: original.raw_user_meta_data };
  const metadataResponse = await fetch(`${authUrl}/auth/v1/user`, {
    method: "PUT",
    headers: {
      apikey: key,
      Authorization: `Bearer ${a.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data: { role: "GOD", user_role: "GOD" } }),
  });
  assert.equal(metadataResponse.status, 200);
  assert.equal((await json(await api("/auth/me", a))).user.role, "MECHANIC");
  const parts = a.token.split(".");
  const forged = JSON.parse(Buffer.from(parts[1], "base64url").toString());
  forged.sub = god.id;
  forged.app_metadata.user_role = "GOD";
  const tampered = {
    ...a,
    token: `${parts[0]}.${Buffer.from(JSON.stringify(forged)).toString("base64url")}.${parts[2]}`,
  };
  assert.equal((await api("/auth/me", tampered)).status, 401);

  logger.info(
    "PASS: inherited RLS, child writes, plate concurrency, immutable ownership and metadata escalation",
  );

  // A signed GOD claim remains in this token, but current database role controls access.
  await sql`update user_profiles set role='MECHANIC' where id=${god.id}`;
  assert.equal((await json(await api("/auth/me", god))).user.role, "MECHANIC");
  assert.equal((await api(`/customers/${aCustomer}`, god)).status, 404);
  assert.deepEqual(await json(await rest("vehicles", god)), []);
  await sql`update user_profiles set role='GOD' where id=${god.id}`;
  assert.equal((await json(await api("/auth/me", god))).user.role, "GOD");
  assert.equal(
    (await rest("user_profiles", god, "PATCH", { role: "GOD" }, `?id=eq.${b.id}`)).status,
    403,
  );
  assert.equal((await json(await api("/auth/me", b))).user.role, "MECHANIC");

  for (const id of created)
    assert.equal((await api(`/customers/${id}`, god, "DELETE")).status, 204);
  created.length = 0;
  const response = await api("/logout", a, "POST");
  assert.equal(response.status, 204);
  assert.equal((await api("/auth/me", a)).status, 401, "revoked token is immediately rejected");
  assert.deepEqual(
    await json(await rest("customers", a)),
    [],
    "Data API also rejects revoked session",
  );
  sessions.splice(sessions.indexOf(a), 1);
  logger.info(
    "PASS: API login/CRUD/pagination, three roles, concurrent isolation, five-table RLS, child writes, scoped uniqueness, forged tokens, metadata escalation, current role changes and session revocation",
  );
} finally {
  if (god) await sql`update user_profiles set role='GOD' where id=${god.id}`;
  await sql`update user_profiles set role='MECHANIC' where id in (select id from auth.users where email in ('mateo.cardoc.20261006@example.test','lucia.cardoc.20261006@example.test'))`;
  if (metadata)
    await sql`update auth.users set raw_user_meta_data=${sql.json(metadata.value)} where id=${metadata.id}`;
  for (const id of testVehicles) {
    await sql`delete from work_orders where vehicle_id=${id}`;
    await sql`delete from vehicles where id=${id}`;
  }
  for (const id of created) await sql`delete from customers where id=${id}`;
  for (const session of sessions) {
    await fetch(`${authUrl}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${session.token}` },
    });
  }
  await sql.end();
}
