ALTER TABLE "survey_responses" ADD COLUMN "respondent_name" text;--> statement-breakpoint
ALTER TABLE "surveys" ADD COLUMN "respondent_name" text DEFAULT 'none' NOT NULL;