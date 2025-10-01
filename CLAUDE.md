# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sobranie (Собрание) is a next-generation social network for AI, LLM, and IT developers built with Next.js 15, featuring a futuristic sci-fi design aesthetic.

## Essential Commands

```bash
# Development
bun dev              # Start development server on http://localhost:3000
bun build            # Build for production
bun start            # Start production server
bun lint             # Run ESLint

# Install dependencies (using Bun)
bun install
```

## High-Level Architecture

### Tech Stack

- **Framework**: Next.js 15 with App Router (server-first approach)
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS with custom futuristic dark theme
- **State**: React Query for server state, React Context for session
- **Package Manager**: Bun 1.1.9

### Core Architecture Patterns

1. **Server Components by Default**: Use Client Components only when interactivity is required (useState, useEffect, onClick, etc.)

2. **API Client Pattern**: All API calls go through `/lib/api/client.ts` which handles:
    - Bearer token authentication from cookies
    - Type-safe responses with error handling
    - External API integration (https://api.sobranie.yaropolk.tech)

3. **Authentication Flow**:
    - Cookie-based session management (`sobranie_token`)
    - SessionProvider wraps the app for client-side session access
    - Server-side session retrieval via `getSession()` in `/lib/auth/session.ts`

4. **Data Fetching Strategy**:
    - Server Components fetch data directly using the API client
    - Client Components use React Query hooks in `/lib/hooks/`
    - Fallback content in `/lib/data/fallback-content.ts` for loading states

### Directory Structure & Purpose

```
/app                  # Next.js App Router
  /api               # API route handlers
  /(auth)            # Authentication pages (login, register)
  /[feature]         # Feature pages (feed, circles, llm, notifications)

/components          # React components
  /auth              # SessionProvider and auth components
  /dashboard         # Dashboard-specific components
  /feed              # Feed, timeline, composer components

/lib                 # Core business logic
  /api               # API client and type definitions
  /auth              # Authentication logic
  /data              # Data transformations
  /frontend          # Client-side utilities
  /hooks             # Custom React hooks
```

### Key Implementation Details

**API Integration**:

- All API types are defined in `/lib/api/types.ts`
- API client in `/lib/api/client.ts` handles all external API calls
- Error responses follow a consistent structure with error codes

**Component Patterns**:

- Use `'use client'` directive only when necessary
- Prefer composition over prop drilling
- Keep components under 300 lines, extract when larger

**Design System**:

- Dark theme with midnight/dawn colors
- Accent colors: purple-500, teal-400, amber-400
- Custom gradients and animations for sci-fi aesthetic
- Typography: Inter for body, Space Grotesk for headings

**Environment Variables**:

- `SOBRANIE_API_BASE_URL`: External API base URL (required)

## Development Workflow

When implementing features:

1. Check if similar patterns exist in the codebase first
2. Follow the server-first approach - use Server Components by default
3. Add types to `/lib/api/types.ts` for new API endpoints
4. Create React Query hooks in `/lib/hooks/` for client-side data fetching
5. Use the existing design system classes rather than creating new styles
