import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export * from "./models/auth";

export const mockInterviews = pgTable("mock_interviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resumeFileName: text("resume_file_name").notNull(),
  resumeContent: text("resume_content").notNull(),
  resumeText: text("resume_text").notNull().default(""),
  jobDescription: text("job_description").notNull(),
  status: text("status").notNull().default("pending"),
  questionCount: integer("question_count").notNull().default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const practiceSessions = pgTable("practice_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interviewType: text("interview_type").notNull(),
  resumeText: text("resume_text").notNull().default(""),
  jobDescription: text("job_description").notNull().default(""),
  questions: text("questions").notNull().default("[]"),
  totalScore: integer("total_score"),
  totalQuestions: integer("total_questions").notNull().default(0),
  answeredQuestions: integer("answered_questions").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const practiceAnswers = pgTable("practice_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  questionIndex: integer("question_index").notNull(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  feedback: text("feedback").notNull().default(""),
  score: integer("score"),
  strengths: text("strengths").notNull().default("[]"),
  improvements: text("improvements").notNull().default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoInterviewSessions = pgTable("video_interview_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  interviewType: text("interview_type").notNull(),
  language: text("language").notNull().default("en-US"),
  resumeText: text("resume_text").notNull().default(""),
  jobDescription: text("job_description").notNull().default(""),
  totalQuestions: integer("total_questions").notNull().default(10),
  currentQuestion: integer("current_question").notNull().default(0),
  totalScore: integer("total_score"),
  status: text("status").notNull().default("waiting"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const videoInterviewMessages = pgTable("video_interview_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  questionIndex: integer("question_index"),
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});


export const insertMockInterviewSchema = createInsertSchema(mockInterviews).omit({
  id: true,
  createdAt: true,
});

export const insertPracticeSessionSchema = createInsertSchema(practiceSessions).omit({
  id: true,
  createdAt: true,
});

export const insertPracticeAnswerSchema = createInsertSchema(practiceAnswers).omit({
  id: true,
  createdAt: true,
});

export const insertVideoInterviewSessionSchema = createInsertSchema(videoInterviewSessions).omit({
  id: true,
  createdAt: true,
});

export const insertVideoInterviewMessageSchema = createInsertSchema(videoInterviewMessages).omit({
  id: true,
  createdAt: true,
});

export const quizSessions = pgTable("quiz_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  resumeText: text("resume_text").notNull().default(""),
  skills: text("skills").notNull().default("[]"),
  detectedRole: text("detected_role").notNull().default(""),
  totalQuestions: integer("total_questions").notNull().default(50),
  answeredQuestions: integer("answered_questions").notNull().default(0),
  correctAnswers: integer("correct_answers").notNull().default(0),
  status: text("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const quizAnswers = pgTable("quiz_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull(),
  questionIndex: integer("question_index").notNull(),
  question: text("question").notNull(),
  options: text("options").notNull().default("[]"),
  correctAnswer: text("correct_answer").notNull(),
  userAnswer: text("user_answer").notNull().default(""),
  isCorrect: integer("is_correct").notNull().default(0),
  explanation: text("explanation").notNull().default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuizSessionSchema = createInsertSchema(quizSessions).omit({
  id: true,
  createdAt: true,
});

export const insertQuizAnswerSchema = createInsertSchema(quizAnswers).omit({
  id: true,
  createdAt: true,
});

export type InsertMockInterview = z.infer<typeof insertMockInterviewSchema>;
export type MockInterview = typeof mockInterviews.$inferSelect;
export type InsertPracticeSession = z.infer<typeof insertPracticeSessionSchema>;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeAnswer = z.infer<typeof insertPracticeAnswerSchema>;
export type PracticeAnswer = typeof practiceAnswers.$inferSelect;
export type InsertVideoInterviewSession = z.infer<typeof insertVideoInterviewSessionSchema>;
export type VideoInterviewSession = typeof videoInterviewSessions.$inferSelect;
export type InsertVideoInterviewMessage = z.infer<typeof insertVideoInterviewMessageSchema>;
export type VideoInterviewMessage = typeof videoInterviewMessages.$inferSelect;

export type InsertQuizSession = z.infer<typeof insertQuizSessionSchema>;
export type QuizSession = typeof quizSessions.$inferSelect;
export type InsertQuizAnswer = z.infer<typeof insertQuizAnswerSchema>;
export type QuizAnswer = typeof quizAnswers.$inferSelect;

export * from "./models/chat";
