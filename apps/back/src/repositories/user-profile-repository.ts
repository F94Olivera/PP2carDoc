import { eq } from "drizzle-orm";
import { withUserDatabase } from "../database.js";
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
      return profile;
    },
    true,
  );
