import { sql } from "drizzle-orm";
import { pgTable, text, varchar, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  name: true,
  latitude: true,
  longitude: true,
  address: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export const coordinateSchema = z.object({
  latitude: z.number()
    .min(-90, "Latitude must be between -90 and 90")
    .max(90, "Latitude must be between -90 and 90"),
  longitude: z.number()
    .min(-180, "Longitude must be between -180 and 180")
    .max(180, "Longitude must be between -180 and 180"),
});

export const coordinateInputSchema = z.object({
  latitude: z.string()
    .min(1, "Latitude is required")
    .refine((val) => !isNaN(parseFloat(val)), "Invalid latitude format")
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(-90).max(90)),
  longitude: z.string()
    .min(1, "Longitude is required")
    .refine((val) => !isNaN(parseFloat(val)), "Invalid longitude format")
    .transform((val) => parseFloat(val))
    .pipe(z.number().min(-180).max(180)),
});

export type Coordinate = z.infer<typeof coordinateSchema>;
export type CoordinateInput = z.input<typeof coordinateInputSchema>;
