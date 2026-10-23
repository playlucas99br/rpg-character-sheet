import {
  sqliteTable,
  text,
  integer,
  primaryKey,
  index,
} from "drizzle-orm/sqlite-core";

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: text("created_at").notNull(),
});
export const campaigns = sqliteTable("campaigns", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  system: text("system").notNull(),
  banner: text("banner").notNull(),
  status: text("status").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdAt: text("created_at").notNull(),
});
export const memberships = sqliteTable(
  "memberships",
  {
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.campaignId, t.userId] }),
    index("membership_user_idx").on(t.userId),
  ],
);
export const sheets = sqliteTable(
  "sheets",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => profiles.id),
    type: text("type").notNull(),
    data: text("data").notNull(),
    version: integer("version").notNull().default(1),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("sheet_campaign_idx").on(t.campaignId)],
);
export const rolls = sqliteTable(
  "rolls",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => campaigns.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => profiles.id),
    sheetId: text("sheet_id"),
    visibility: text("visibility").notNull(),
    data: text("data").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("roll_campaign_time_idx").on(t.campaignId, t.createdAt)],
);
