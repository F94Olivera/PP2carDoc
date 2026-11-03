import { eq } from "drizzle-orm";
import { withUserDatabase } from "../database.js";
import { customers } from "../models/customer.js";
import { userProfiles } from "../models/user-profile.js";
import type { VerifiedIdentity } from "../schemas/authorization.js";

export const findCurrentUserProfile = (identity: VerifiedIdentity) =>
  withUserDatabase(
    identity,
    async (transaction) => {
      const [profile] = await transaction
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.id, identity.userId))
        .limit(1);
      if (!profile) return undefined;
      if (profile.role !== "USER") return { ...profile, customerId: null };
      const [customer] = await transaction
        .select({ uuid: customers.uuid })
        .from(customers)
        .where(eq(customers.userId, identity.userId))
        .limit(1);
      return { ...profile, customerId: profile.role === "USER" ? (customer?.uuid ?? null) : null };
    },
    true,
  );
