import { config as loadDotenv } from "dotenv";
import { z } from "zod";

/**
 * Environment parsing. Deliberately fails fast at import time: a missing
 * DATABASE_URL or JWT_SECRET is a deploy-time misconfiguration, and crashing
 * on boot surfaces it in the platform's logs instead of producing 500s hours
 * later when the first request touches the database.
 */

loadDotenv();

const booleanish = z
  .enum(["true", "false", "1", "0"])
  .transform((value) => value === "true" || value === "1");

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters — generate one with `openssl rand -hex 32`"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  /** Comma-separated list; "*" allows any origin (development only). */
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_FOLDER: z.string().default("the-secret-kitchen"),

  /**
   * The kitchen's WhatsApp number — the destination of every order handoff
   * link. Stored as digits; a bare 10-digit Indian number is prefixed with 91
   * when the wa.me URL is built.
   */
  BUSINESS_WHATSAPP: z.string().min(10).default("919296902817"),
  BUSINESS_NAME: z.string().default("The Secret Kitchen"),
  /**
   * FSSAI licence number. Empty by default and deliberately not invented: the
   * storefront omits the badge entirely rather than print a number that would
   * be a false regulatory claim.
   */
  BUSINESS_FSSAI_LICENSE: z.string().default(""),

  ADMIN_EMAIL: z.string().email().default("admin@thesecretkitchen.in"),
  ADMIN_PASSWORD: z.string().min(8).default("ChangeMe@12345"),
  ADMIN_NAME: z.string().default("Kitchen Admin"),

  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),

  /** Body size cap for JSON payloads — keeps a rogue client from OOMing us. */
  BODY_LIMIT: z.string().default("256kb"),

  LOG_REQUESTS: booleanish.default("true"),

  /**
   * Seeds demo orders, customers and subscriptions. OFF by default — seeding
   * these into a real deployment would put fabricated revenue on the dashboard.
   * Only ever enable it locally.
   */
  SEED_DEMO_DATA: booleanish.default("false"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `  • ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
  console.error(`\nInvalid environment configuration:\n${details}\n`);
  process.exit(1);
}

const raw = parsed.data;

export const env = {
  ...raw,
  isProduction: raw.NODE_ENV === "production",
  isDevelopment: raw.NODE_ENV === "development",
  isTest: raw.NODE_ENV === "test",
  /** Parsed CORS allow-list. `["*"]` short-circuits the origin check. */
  corsOrigins: raw.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  /** Cloudinary is optional — uploads 503 rather than the whole API refusing to boot. */
  cloudinaryEnabled: Boolean(
    raw.CLOUDINARY_CLOUD_NAME && raw.CLOUDINARY_API_KEY && raw.CLOUDINARY_API_SECRET,
  ),
} as const;

export type Env = typeof env;
