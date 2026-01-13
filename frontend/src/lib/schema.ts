import {
  pgTable,
  serial,
  bigint,
  decimal,
  smallint,
  timestamp,
  integer,
  index,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Reports cache table - indexed from on-chain events for fast geo-queries
 * This is read-only from the frontend perspective; an indexer populates it
 */
export const reportsCache = pgTable(
  "reports_cache",
  {
    id: serial("id").primaryKey(),
    chainReportId: bigint("chain_report_id", { mode: "number" }).unique().notNull(),
    reporterCommitment: varchar("reporter_commitment", { length: 66 }).notNull(),
    locationLat: decimal("location_lat", { precision: 10, scale: 8 }).notNull(),
    locationLng: decimal("location_lng", { precision: 11, scale: 8 }).notNull(),
    eventType: smallint("event_type").notNull(),
    status: smallint("status").default(0).notNull(), // 0=active, 1=confirmed, 2=expired, 3=slashed
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    totalRegards: decimal("total_regards", { precision: 36, scale: 18 }).default("0").notNull(),
    confirmationCount: integer("confirmation_count").default(0).notNull(),
    txHash: varchar("tx_hash", { length: 66 }).notNull(),
  },
  (table) => ({
    geoIdx: index("idx_reports_geo").on(table.locationLat, table.locationLng),
    timeIdx: index("idx_reports_time").on(table.createdAt),
    statusIdx: index("idx_reports_status").on(table.status),
  })
);

export type Report = typeof reportsCache.$inferSelect;
export type NewReport = typeof reportsCache.$inferInsert;
