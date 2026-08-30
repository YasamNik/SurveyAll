CREATE TABLE "availability_slots" (
	"participant_id" text NOT NULL,
	"slot_start" timestamp with time zone NOT NULL,
	CONSTRAINT "availability_slots_participant_id_slot_start_pk" PRIMARY KEY("participant_id","slot_start")
);
--> statement-breakpoint
CREATE TABLE "schedule_events" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text,
	"title" text NOT NULL,
	"description" text,
	"slug" text NOT NULL,
	"author_timezone" text NOT NULL,
	"date_start" text NOT NULL,
	"date_end" text NOT NULL,
	"day_start_time" text NOT NULL,
	"day_end_time" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "schedule_events_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "schedule_participants" (
	"id" text PRIMARY KEY NOT NULL,
	"event_id" text NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"client_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "schedule_participants_client_token_unique" UNIQUE("client_token")
);
--> statement-breakpoint
ALTER TABLE "availability_slots" ADD CONSTRAINT "availability_slots_participant_id_schedule_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."schedule_participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_events" ADD CONSTRAINT "schedule_events_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_participants" ADD CONSTRAINT "schedule_participants_event_id_schedule_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."schedule_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schedule_participants" ADD CONSTRAINT "schedule_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_participant_per_user" ON "schedule_participants" USING btree ("event_id","user_id") WHERE user_id is not null;