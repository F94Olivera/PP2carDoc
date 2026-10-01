CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text,
	"email" text,
	"phone" text,
	"address" text,
	"document_number" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_document_number_unique" UNIQUE("document_number")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sessions_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" serial PRIMARY KEY NOT NULL,
	"customer_id" integer NOT NULL,
	"license_plate" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"year" integer,
	"initial_odometer" integer,
	"odometer_unit" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_license_plate_unique" UNIQUE("license_plate"),
	CONSTRAINT "vehicles_year_check" CHECK ("vehicles"."year" IS NULL OR "vehicles"."year" >= 1886),
	CONSTRAINT "vehicles_initial_odometer_check" CHECK ("vehicles"."initial_odometer" IS NULL OR "vehicles"."initial_odometer" >= 0),
	CONSTRAINT "vehicles_odometer_unit_check" CHECK ("vehicles"."odometer_unit" IN ('km', 'mi'))
);
--> statement-breakpoint
CREATE TABLE "work_order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"quantity" real NOT NULL,
	"unit_price" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_order_items_category_check" CHECK ("work_order_items"."category" IN ('labor', 'part', 'other')),
	CONSTRAINT "work_order_items_quantity_check" CHECK ("work_order_items"."quantity" > 0),
	CONSTRAINT "work_order_items_unit_price_check" CHECK ("work_order_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "work_order_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"work_order_id" integer NOT NULL,
	"description" text NOT NULL,
	"reason" text,
	"status" text,
	"priority" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_order_recommendations_status_check" CHECK ("work_order_recommendations"."status" IS NULL OR "work_order_recommendations"."status" IN ('pending', 'accepted', 'rejected')),
	CONSTRAINT "work_order_recommendations_priority_check" CHECK ("work_order_recommendations"."priority" IS NULL OR "work_order_recommendations"."priority" IN ('low', 'medium', 'high'))
);
--> statement-breakpoint
CREATE TABLE "work_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"vehicle_id" integer NOT NULL,
	"entry_date" timestamp NOT NULL,
	"exit_date" timestamp,
	"intake_odometer" integer,
	"reported_problem" text NOT NULL,
	"notes" text,
	"diagnosis" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "work_orders_intake_odometer_check" CHECK ("work_orders"."intake_odometer" IS NULL OR "work_orders"."intake_odometer" >= 0),
	CONSTRAINT "work_orders_exit_date_check" CHECK ("work_orders"."exit_date" IS NULL OR "work_orders"."exit_date" >= "work_orders"."entry_date")
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_items" ADD CONSTRAINT "work_order_items_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_order_recommendations" ADD CONSTRAINT "work_order_recommendations_work_order_id_work_orders_id_fk" FOREIGN KEY ("work_order_id") REFERENCES "public"."work_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_orders" ADD CONSTRAINT "work_orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vehicles_customer_id_idx" ON "vehicles" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "work_order_items_work_order_id_idx" ON "work_order_items" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "work_order_recommendations_work_order_id_idx" ON "work_order_recommendations" USING btree ("work_order_id");--> statement-breakpoint
CREATE INDEX "work_orders_vehicle_id_idx" ON "work_orders" USING btree ("vehicle_id");