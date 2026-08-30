import { pgTable, text, timestamp, boolean, integer, doublePrecision, jsonb, uniqueIndex, unique, primaryKey } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').unique(),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const surveys = pgTable('surveys', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  authorId: text('author_id').references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  status: text('status', { enum: ['draft', 'published', 'closed'] }).notNull().default('draft'),
  slug: text('slug').unique(),
  showResultsToRespondents: boolean('show_results_to_respondents').notNull().default(false),
  theme: text('theme').notNull().default('classic'),
  respondentName: text('respondent_name', { enum: ['none', 'optional', 'required'] }).notNull().default('none'),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const questions = pgTable('questions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  prompt: text('prompt').notNull(),
  required: boolean('required').notNull().default(false),
  type: text('type', { enum: ['single_choice', 'multi_choice', 'free_text', 'rating'] }).notNull(),
  config: jsonb('config'),
});

export const questionOptions = pgTable('question_options', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  label: text('label').notNull(),
});

export const surveyResponses = pgTable('survey_responses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  surveyId: text('survey_id').notNull().references(() => surveys.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
  clientToken: text('client_token'),
  ipHash: text('ip_hash'),
  respondentName: text('respondent_name'),
}, (t) => [
  uniqueIndex('one_response_per_user').on(t.surveyId, t.userId).where(sql`user_id is not null`),
]);

export const answers = pgTable('answers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  responseId: text('response_id').notNull().references(() => surveyResponses.id, { onDelete: 'cascade' }),
  questionId: text('question_id').notNull().references(() => questions.id, { onDelete: 'cascade' }),
  optionId: text('option_id').references(() => questionOptions.id),
  textValue: text('text_value'),
  numberValue: doublePrecision('number_value'),
}, (t) => [
  unique('one_answer_cell').on(t.responseId, t.questionId, t.optionId).nullsNotDistinct(),
]);

export const scheduleEvents = pgTable('schedule_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  authorId: text('author_id').references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  slug: text('slug').notNull().unique(),
  authorTimezone: text('author_timezone').notNull(),
  dateStart: text('date_start').notNull(),
  dateEnd: text('date_end').notNull(),
  dayStartTime: text('day_start_time').notNull(),
  dayEndTime: text('day_end_time').notNull(),
  status: text('status', { enum: ['open', 'closed'] }).notNull().default('open'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }),
});

export const scheduleParticipants = pgTable('schedule_participants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  eventId: text('event_id').notNull().references(() => scheduleEvents.id, { onDelete: 'cascade' }),
  userId: text('user_id').references(() => users.id),
  displayName: text('display_name').notNull(),
  clientToken: text('client_token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex('one_participant_per_user').on(t.eventId, t.userId).where(sql`user_id is not null`),
]);

export const availabilitySlots = pgTable('availability_slots', {
  participantId: text('participant_id').notNull().references(() => scheduleParticipants.id, { onDelete: 'cascade' }),
  slotStart: timestamp('slot_start', { withTimezone: true }).notNull(),
}, (t) => [
  primaryKey({ columns: [t.participantId, t.slotStart] }),
]);
