import { eq, inArray } from "drizzle-orm";
import pino from "pino";

import { getDatabase, initializeDatabase } from "../apps/back/src/database.js";
import { customers } from "../apps/back/src/models/customer.js";
import { vehicles } from "../apps/back/src/models/vehicle.js";
import { workOrderItems } from "../apps/back/src/models/work-order-item.js";
import { workOrderRecommendations } from "../apps/back/src/models/work-order-recommendation.js";
import { workOrders } from "../apps/back/src/models/work-order.js";
import { users } from "../apps/back/src/models/user.js";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

const superheroes = [
  { firstName: "Clark", lastName: "Kent", alias: "Superman" },
  { firstName: "Bruce", lastName: "Wayne", alias: "Batman" },
  { firstName: "Diana", lastName: "Prince", alias: "Wonder Woman" },
  { firstName: "Peter", lastName: "Parker", alias: "Spider-Man" },
  { firstName: "Tony", lastName: "Stark", alias: "Iron Man" },
  { firstName: "Steve", lastName: "Rogers", alias: "Captain America" },
  { firstName: "Natasha", lastName: "Romanoff", alias: "Black Widow" },
  { firstName: "Barry", lastName: "Allen", alias: "The Flash" },
  { firstName: "Hal", lastName: "Jordan", alias: "Green Lantern" },
  { firstName: "Arthur", lastName: "Curry", alias: "Aquaman" },
  { firstName: "Wanda", lastName: "Maximoff", alias: "Scarlet Witch" },
  { firstName: "T'Challa", lastName: null, alias: "Black Panther" },
  { firstName: "Carol", lastName: "Danvers", alias: "Captain Marvel" },
  { firstName: "Logan", lastName: null, alias: "Wolverine" },
  { firstName: "Matt", lastName: "Murdock", alias: "Daredevil" },
  { firstName: "Stephen", lastName: "Strange", alias: "Doctor Strange" },
  { firstName: "Scott", lastName: "Lang", alias: "Ant-Man" },
  { firstName: "Bruce", lastName: "Banner", alias: "Hulk" },
  { firstName: "Oliver", lastName: "Queen", alias: "Green Arrow" },
  { firstName: "Jean", lastName: "Grey", alias: "Phoenix" },
] as const;

const testUser = {
  email: "test@test.com",
  password: "123qwe",
} as const;

const vehicleAssignments: Record<number, { make: string; model: string; year: number }[]> = {
  0: [],
  1: [
    { make: "WayneTech", model: "Tumbler", year: 2024 },
    { make: "WayneTech", model: "Batmobile Classic", year: 1989 },
  ],
  2: [{ make: "Mercedes-Benz", model: "AMG GT", year: 2023 }],
  3: [],
  4: [
    { make: "Audi", model: "R8", year: 2022 },
    { make: "Stark Industries", model: "Arc Reactor Roadster", year: 2025 },
  ],
  5: [{ make: "Harley-Davidson", model: "WLA", year: 1942 }],
  6: [{ make: "Chevrolet", model: "Corvette Stingray", year: 2021 }],
  7: [],
  8: [{ make: "Ford", model: "Mustang Mach-E", year: 2024 }],
  9: [{ make: "Jeep", model: "Wrangler", year: 2020 }],
  10: [],
  11: [
    { make: "Lexus", model: "LC 500", year: 2023 },
    { make: "Wakanda Design Group", model: "Kimoyo Cruiser", year: 2026 },
  ],
  12: [{ make: "Nissan", model: "GT-R", year: 2021 }],
  13: [{ make: "Dodge", model: "Charger", year: 1970 }],
  14: [],
  15: [{ make: "Tesla", model: "Model S Plaid", year: 2022 }],
  16: [{ make: "Volkswagen", model: "ID. Buzz", year: 2024 }],
  17: [],
  18: [
    { make: "Aston Martin", model: "DB11", year: 2023 },
    { make: "Queen Industries", model: "Arrow Van", year: 2022 },
  ],
  19: [
    { make: "Porsche", model: "Taycan", year: 2024 },
    { make: "Land Rover", model: "Defender", year: 2021 },
  ],
};

const reportedProblems = [
  "Ruido al frenar en ciudad",
  "Vibracion en ruta a velocidad constante",
  "Service preventivo completo",
  "Revision por perdida de aceite",
  "Chequeo electrico general",
  "Temperatura elevada en trafico",
  "Cambio de neumaticos y alineacion",
  "Diagnostico por testigo de motor",
];

const diagnoses = [
  "Pastillas delanteras cristalizadas y discos con desgaste moderado",
  "Desbalanceo en ruedas delanteras y bujes con juego leve",
  "Mantenimiento realizado segun kilometraje",
  "Junta de tapa con transpiracion leve, sin goteo activo",
  "Bateria con baja retencion y bornes sulfatados",
  "Electroventilador con activacion tardia",
  "Cubiertas fuera de rango de desgaste parejo",
  "Sensor con lectura intermitente registrada en scanner",
];

const itemCatalog = [
  { description: "Mano de obra mecanica general", category: "labor", unitPrice: 42000 },
  { description: "Filtro de aceite premium", category: "part", unitPrice: 18500 },
  { description: "Aceite sintetico 5W-30", category: "part", unitPrice: 64000 },
  { description: "Pastillas de freno delanteras", category: "part", unitPrice: 78000 },
  { description: "Alineacion y balanceo", category: "labor", unitPrice: 36000 },
  { description: "Scanner computarizado", category: "labor", unitPrice: 28000 },
  { description: "Kit de limpieza de inyectores", category: "other", unitPrice: 31000 },
  { description: "Refrigerante organico", category: "part", unitPrice: 22500 },
] as const;

const recommendationCatalog = [
  {
    description: "Revisar tren delantero en el proximo service",
    reason: "Se detecto desgaste inicial en bujes",
  },
  {
    description: "Cambiar escobillas limpiaparabrisas",
    reason: "El barrido deja marcas en parabrisas",
  },
  {
    description: "Controlar bateria en 30 dias",
    reason: "La prueba de carga quedo cerca del minimo recomendado",
  },
  {
    description: "Rotar neumaticos",
    reason: "Ayuda a emparejar el desgaste entre ejes",
  },
  {
    description: "Revisar sistema de refrigeracion",
    reason: "Hubo antecedentes de temperatura elevada",
  },
] as const;

const customerDocumentNumbers = superheroes.map(
  (_, index) => `SH-${String(index + 1).padStart(3, "0")}`,
);

const createDate = (month: number, day: number, hour = 10) =>
  new Date(Date.UTC(2026, month - 1, day, hour, 0, 0));

const workOrderCountForVehicle = (customerIndex: number, vehicleIndex: number) => {
  if (customerIndex === 1) {
    return 0;
  }

  if (customerIndex === 2 && vehicleIndex === 0) {
    return 1;
  }

  return 2 + ((customerIndex + vehicleIndex) % 3);
};

const clearPreviousSuperheroSeed = () => {
  const database = getDatabase();

  database.transaction((tx) => {
    const seededCustomers = tx
      .select({ id: customers.id })
      .from(customers)
      .where(inArray(customers.documentNumber, customerDocumentNumbers))
      .all();
    const customerIds = seededCustomers.map((customer) => customer.id);

    if (customerIds.length === 0) {
      return;
    }

    const seededVehicles = tx
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(inArray(vehicles.customerId, customerIds))
      .all();
    const vehicleIds = seededVehicles.map((vehicle) => vehicle.id);

    if (vehicleIds.length > 0) {
      const seededWorkOrders = tx
        .select({ id: workOrders.id })
        .from(workOrders)
        .where(inArray(workOrders.vehicleId, vehicleIds))
        .all();
      const workOrderIds = seededWorkOrders.map((workOrder) => workOrder.id);

      if (workOrderIds.length > 0) {
        tx.delete(workOrderItems).where(inArray(workOrderItems.workOrderId, workOrderIds)).run();
        tx.delete(workOrderRecommendations)
          .where(inArray(workOrderRecommendations.workOrderId, workOrderIds))
          .run();
        tx.delete(workOrders).where(inArray(workOrders.id, workOrderIds)).run();
      }

      tx.delete(vehicles).where(inArray(vehicles.id, vehicleIds)).run();
    }

    tx.delete(customers).where(inArray(customers.id, customerIds)).run();
  });
};

const seedSuperheroes = () => {
  initializeDatabase();
  clearPreviousSuperheroSeed();

  const database = getDatabase();

  const totals = database.transaction((tx) => {
    let vehicleCount = 0;
    let workOrderCount = 0;
    let itemCount = 0;
    let recommendationCount = 0;

    tx.delete(users).where(eq(users.email, testUser.email)).run();
    tx.insert(users)
      .values({
        email: testUser.email,
        passwordHash: testUser.password,
      })
      .run();

    superheroes.forEach((superhero, customerIndex) => {
      const documentNumber = customerDocumentNumbers[customerIndex]!;
      const [createdCustomer] = tx
        .insert(customers)
        .values({
          firstName: superhero.firstName,
          lastName: superhero.lastName,
          email: `${superhero.alias.toLowerCase().replaceAll(/[^a-z0-9]+/g, ".")}@hero.test`,
          phone: `+54 11 5555-${String(1000 + customerIndex)}`,
          address: `${100 + customerIndex} Hero Avenue`,
          documentNumber,
          notes: `Cliente seed: ${superhero.alias}`,
        })
        .returning({ id: customers.id })
        .all();

      const assignedVehicles = vehicleAssignments[customerIndex] ?? [];

      assignedVehicles.forEach((assignedVehicle, vehicleIndex) => {
        vehicleCount += 1;

        const [createdVehicle] = tx
          .insert(vehicles)
          .values({
            customerId: createdCustomer!.id,
            licensePlate: `HRO-${String(customerIndex + 1).padStart(2, "0")}${String.fromCharCode(
              65 + vehicleIndex,
            )}`,
            make: assignedVehicle.make,
            model: assignedVehicle.model,
            year: assignedVehicle.year,
            initialOdometer: 12000 + customerIndex * 3500 + vehicleIndex * 8700,
            odometerUnit: "km",
          })
          .returning({ id: vehicles.id })
          .all();

        const orderCount = workOrderCountForVehicle(customerIndex, vehicleIndex);

        Array.from({ length: orderCount }).forEach((_, orderIndex) => {
          const entryDate = createDate(
            1 + ((customerIndex + orderIndex) % 6),
            3 + ((customerIndex * 2 + orderIndex * 5) % 24),
            9 + (orderIndex % 5),
          );
          const exitDate =
            orderIndex % 2 === 0
              ? createDate(entryDate.getUTCMonth() + 1, entryDate.getUTCDate(), 17)
              : null;
          const [createdWorkOrder] = tx
            .insert(workOrders)
            .values({
              vehicleId: createdVehicle!.id,
              entryDate,
              exitDate,
              intakeOdometer:
                12000 + customerIndex * 3500 + vehicleIndex * 8700 + orderIndex * 1300,
              reportedProblem:
                reportedProblems[(customerIndex + orderIndex) % reportedProblems.length]!,
              notes: `Orden seed para ${superhero.alias}, vehiculo ${vehicleIndex + 1}`,
              diagnosis: diagnoses[(customerIndex + orderIndex) % diagnoses.length]!,
            })
            .returning({ id: workOrders.id })
            .all();

          workOrderCount += 1;

          const items = Array.from({ length: 2 + ((customerIndex + orderIndex) % 3) }).map(
            (_, itemIndex) => {
              const item =
                itemCatalog[(customerIndex + orderIndex + itemIndex) % itemCatalog.length]!;

              return {
                workOrderId: createdWorkOrder!.id,
                description: item.description,
                category: item.category,
                quantity: item.category === "part" ? 1 + (itemIndex % 2) : 1,
                unitPrice: item.unitPrice + orderIndex * 2500 + vehicleIndex * 1800,
              };
            },
          );

          tx.insert(workOrderItems).values(items).run();
          itemCount += items.length;

          const recommendations = Array.from({ length: (customerIndex + orderIndex) % 3 }).map(
            (_, recommendationIndex) => {
              const recommendation =
                recommendationCatalog[
                  (customerIndex + orderIndex + recommendationIndex) % recommendationCatalog.length
                ]!;

              return {
                workOrderId: createdWorkOrder!.id,
                description: recommendation.description,
                reason: recommendation.reason,
                status: ["pending", "accepted", "rejected"][
                  (customerIndex + recommendationIndex) % 3
                ] as "pending" | "accepted" | "rejected",
                priority: ["low", "medium", "high"][(orderIndex + recommendationIndex) % 3] as
                  "low" | "medium" | "high",
              };
            },
          );

          if (recommendations.length > 0) {
            tx.insert(workOrderRecommendations).values(recommendations).run();
            recommendationCount += recommendations.length;
          }
        });
      });
    });

    return {
      customers: superheroes.length,
      vehicles: vehicleCount,
      workOrders: workOrderCount,
      items: itemCount,
      recommendations: recommendationCount,
    };
  });

  logger.info(totals, "Seeded superhero demo data");
};

try {
  seedSuperheroes();
} catch (error) {
  logger.error(
    {
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    },
    "Failed to seed superhero demo data",
  );
  process.exitCode = 1;
}
