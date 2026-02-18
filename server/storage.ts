import {
  type MockInterview, type InsertMockInterview,
  type PracticeSession, type InsertPracticeSession,
  type PracticeAnswer, type InsertPracticeAnswer,
  type VideoInterviewSession, type InsertVideoInterviewSession,
  type VideoInterviewMessage, type InsertVideoInterviewMessage,
  type QuizSession, type InsertQuizSession,
  type QuizAnswer, type InsertQuizAnswer,
  mockInterviews, practiceSessions, practiceAnswers,
  videoInterviewSessions, videoInterviewMessages,
  quizSessions, quizAnswers,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  createMockInterview(interview: InsertMockInterview): Promise<MockInterview>;
  getMockInterview(id: string): Promise<MockInterview | undefined>;
  getMockInterviews(): Promise<MockInterview[]>;
  createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession>;
  getPracticeSession(id: string): Promise<PracticeSession | undefined>;
  getPracticeSessions(): Promise<PracticeSession[]>;
  updatePracticeSession(id: string, updates: Partial<InsertPracticeSession>): Promise<PracticeSession | undefined>;
  createPracticeAnswer(answer: InsertPracticeAnswer): Promise<PracticeAnswer>;
  getPracticeAnswers(sessionId: string): Promise<PracticeAnswer[]>;
  createVideoInterviewSession(session: InsertVideoInterviewSession): Promise<VideoInterviewSession>;
  getVideoInterviewSession(id: string): Promise<VideoInterviewSession | undefined>;
  getVideoInterviewSessions(): Promise<VideoInterviewSession[]>;
  updateVideoInterviewSession(id: string, updates: Partial<InsertVideoInterviewSession>): Promise<VideoInterviewSession | undefined>;
  createVideoInterviewMessage(message: InsertVideoInterviewMessage): Promise<VideoInterviewMessage>;
  getVideoInterviewMessages(sessionId: string): Promise<VideoInterviewMessage[]>;
  createQuizSession(session: InsertQuizSession): Promise<QuizSession>;
  getQuizSession(id: string): Promise<QuizSession | undefined>;
  getQuizSessions(): Promise<QuizSession[]>;
  updateQuizSession(id: string, updates: Partial<InsertQuizSession>): Promise<QuizSession | undefined>;
  createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer>;
  getQuizAnswers(sessionId: string): Promise<QuizAnswer[]>;
  updateQuizAnswer(id: string, updates: Partial<InsertQuizAnswer>): Promise<QuizAnswer | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createMockInterview(interview: InsertMockInterview): Promise<MockInterview> {
    const [result] = await db.insert(mockInterviews).values(interview).returning();
    return result;
  }

  async getMockInterview(id: string): Promise<MockInterview | undefined> {
    const [result] = await db.select().from(mockInterviews).where(eq(mockInterviews.id, id));
    return result;
  }

  async getMockInterviews(): Promise<MockInterview[]> {
    return db.select().from(mockInterviews).orderBy(desc(mockInterviews.createdAt));
  }

  async createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession> {
    const [result] = await db.insert(practiceSessions).values(session).returning();
    return result;
  }

  async getPracticeSession(id: string): Promise<PracticeSession | undefined> {
    const [result] = await db.select().from(practiceSessions).where(eq(practiceSessions.id, id));
    return result;
  }

  async getPracticeSessions(): Promise<PracticeSession[]> {
    return db.select().from(practiceSessions).orderBy(desc(practiceSessions.createdAt));
  }

  async updatePracticeSession(id: string, updates: Partial<InsertPracticeSession>): Promise<PracticeSession | undefined> {
    const [result] = await db.update(practiceSessions).set(updates).where(eq(practiceSessions.id, id)).returning();
    return result;
  }

  async createPracticeAnswer(answer: InsertPracticeAnswer): Promise<PracticeAnswer> {
    const [result] = await db.insert(practiceAnswers).values(answer).returning();
    return result;
  }

  async getPracticeAnswers(sessionId: string): Promise<PracticeAnswer[]> {
    return db.select().from(practiceAnswers).where(eq(practiceAnswers.sessionId, sessionId)).orderBy(practiceAnswers.questionIndex);
  }

  async createVideoInterviewSession(session: InsertVideoInterviewSession): Promise<VideoInterviewSession> {
    const [result] = await db.insert(videoInterviewSessions).values(session).returning();
    return result;
  }

  async getVideoInterviewSession(id: string): Promise<VideoInterviewSession | undefined> {
    const [result] = await db.select().from(videoInterviewSessions).where(eq(videoInterviewSessions.id, id));
    return result;
  }

  async getVideoInterviewSessions(): Promise<VideoInterviewSession[]> {
    return db.select().from(videoInterviewSessions).orderBy(desc(videoInterviewSessions.createdAt));
  }

  async updateVideoInterviewSession(id: string, updates: Partial<InsertVideoInterviewSession>): Promise<VideoInterviewSession | undefined> {
    const [result] = await db.update(videoInterviewSessions).set(updates).where(eq(videoInterviewSessions.id, id)).returning();
    return result;
  }

  async createVideoInterviewMessage(message: InsertVideoInterviewMessage): Promise<VideoInterviewMessage> {
    const [result] = await db.insert(videoInterviewMessages).values(message).returning();
    return result;
  }

  async getVideoInterviewMessages(sessionId: string): Promise<VideoInterviewMessage[]> {
    return db.select().from(videoInterviewMessages).where(eq(videoInterviewMessages.sessionId, sessionId)).orderBy(videoInterviewMessages.createdAt);
  }

  async createQuizSession(session: InsertQuizSession): Promise<QuizSession> {
    const [result] = await db.insert(quizSessions).values(session).returning();
    return result;
  }

  async getQuizSession(id: string): Promise<QuizSession | undefined> {
    const [result] = await db.select().from(quizSessions).where(eq(quizSessions.id, id));
    return result;
  }

  async getQuizSessions(): Promise<QuizSession[]> {
    return db.select().from(quizSessions).orderBy(desc(quizSessions.createdAt));
  }

  async updateQuizSession(id: string, updates: Partial<InsertQuizSession>): Promise<QuizSession | undefined> {
    const [result] = await db.update(quizSessions).set(updates).where(eq(quizSessions.id, id)).returning();
    return result;
  }

  async createQuizAnswer(answer: InsertQuizAnswer): Promise<QuizAnswer> {
    const [result] = await db.insert(quizAnswers).values(answer).returning();
    return result;
  }

  async getQuizAnswers(sessionId: string): Promise<QuizAnswer[]> {
    return db.select().from(quizAnswers).where(eq(quizAnswers.sessionId, sessionId)).orderBy(quizAnswers.questionIndex);
  }

  async updateQuizAnswer(id: string, updates: Partial<InsertQuizAnswer>): Promise<QuizAnswer | undefined> {
    const [result] = await db.update(quizAnswers).set(updates).where(eq(quizAnswers.id, id)).returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
