# Mock InterviewDesk

## Overview

Mock InterviewDesk is an AI-powered platform for interview preparation. It allows users to upload their resumes for AI analysis and offers two interview modes: AI Audio Interview with a video avatar or a Live Interview Copilot for real-time assistance during other interview platforms. The system uses real-time audio capture, transcription, and AI-driven hint generation based on the STAR method.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Monorepo Structure
The project is organized into a monorepo with `client/` for the React frontend, `server/` for the Express backend, and `shared/` for common code.

### Frontend
- **Framework**: React with TypeScript.
- **Routing**: Wouter.
- **State Management**: TanStack React Query.
- **UI Components**: shadcn/ui (Radix UI + Tailwind CSS).
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode).
- **Build Tool**: Vite.

### Backend
- **Framework**: Express.js on Node with TypeScript.
- **File Uploads**: Multer for PDF resume uploads (10MB limit).
- **API Pattern**: RESTful JSON API.
- **AI Integration**: OpenAI via Replit AI Integrations for GPT-4o.
- **Live Transcription**: Deepgram SDK for real-time audio-to-text.
- **WebSocket Endpoints**:
    - `ws://host/ws/video-interview?sessionId=<id>`: Real-time AI video interviews with conversational flow, VAD, and evaluation.
    - `ws://host/ws/audio?interviewId=<id>`: Real-time audio streaming for live transcription and STAR-method AI hints.

### Database
- **Database**: PostgreSQL.
- **ORM**: Drizzle ORM with `drizzle-zod` for schema validation.
- **Schema**: Defined in `shared/schema.ts`, synchronized via Drizzle Kit.
- **Storage Layer**: Abstracted via `server/storage.ts` for database operations.

### Core Features
- **Authentication**: Replit Auth supporting multiple providers.
- **Resume Analysis**: AI-powered extraction of key information from uploaded PDFs.
- **Interview Modes**:
    - **Practice Sessions**: AI-generated questions with evaluation and feedback.
    - **Quiz Sessions**: Skill-based quizzes generated from resume text.
    - **Video Interview Sessions**: AI interviewer with real-time interaction and reporting.
- **Conversation Manager**: Manages the AI interview flow through distinct phases (Greeting, Intro, Deep Dive, Cross-Exam) with dynamic question adaptation and keyword extraction.
- **Audio Capture**: Utilizes `getDisplayMedia` for browser tab system audio capture, sending chunks via WebSocket for transcription and hint generation.

### Build Process
- **Client**: Vite builds to `dist/public/`.
- **Server**: esbuild bundles to `dist/index.cjs`.

### Theming
- Custom `ThemeProvider` for light/dark mode with localStorage persistence, using CSS variables.

## External Dependencies

- **PostgreSQL Database**: Required for data storage.
- **Deepgram**: For real-time audio transcription.
- **OpenAI (via Replit AI Integrations)**: For GPT-4o powered AI functionalities (e.g., STAR-method hints, question generation).
- **Simli.ai (Optional)**: For real-time lip-synced AI avatar via WebRTC, with fallback to animated gradient if not configured.
- **Microsoft Edge TTS (via msedge-tts)**: Free text-to-speech with no API key required. Uses Neural voices (Hindi: Madhur/Swara, English: Brian/Christopher/Andrew). MP3 output converted to PCM 16kHz via ffmpeg for Simli avatar lip-sync. Fallback: browser Web Speech API.
- **Razorpay**: For payment processing (UPI, cards, net banking) with INR currency support. API keys stored as secrets (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET). Payment flow: create order → Razorpay checkout → verify signature. Payments table tracks order status.
- **Key NPM Packages**: `drizzle-orm`, `multer`, `pdf-parse`, `@deepgram/sdk`, `openai`, `simli-client`, `elevenlabs`, `razorpay`, `@tanstack/react-query`, `wouter`, `zod`, `shadcn/ui`.
- **Replit Integrations**: Utilizes Replit's built-in integrations for AI services.