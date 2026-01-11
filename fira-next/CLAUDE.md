# Fira - SEC Filing Intelligence Platform

## Project Overview

Fira is a modern SEC filing analysis platform built with:
- **Next.js 16.1.1** with App Router
- **TypeScript** for type safety
- **Convex** for real-time backend, database, and vector search
- **Clerk** for authentication
- **shadcn/ui** + Tailwind CSS for UI components
- **OpenAI GPT-4o-mini** for RAG responses
- **Recharts** for financial charts

## Key Directories

```
fira-next/
├── app/                    # Next.js App Router pages
├── components/             # React components
│   ├── ui/                # shadcn/ui components
│   ├── layout/            # Layout components (sidebar, modals)
│   └── charts/            # Recharts components
├── convex/                # Convex backend functions
├── lib/                   # Utility functions
└── public/                # Static assets
```

## Convex Functions

- `users.ts` - User management (Clerk sync, admin functions)
- `chats.ts` - Chat CRUD operations
- `messages.ts` - Message handling with streaming support
- `filings.ts` - SEC filing management
- `vectorSearch.ts` - Vector search for RAG
- `inviteCodes.ts` - Invite code management

## API Routes

- `/api/sec/filings` - Fetch SEC filings by ticker
- `/api/sec/ensure-filing` - Create/get filing in Convex
- `/api/chat/rag` - RAG endpoint with streaming responses

## Environment Variables

Required:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CONVEX_URL`
- `OPENAI_API_KEY`

Optional:
- `VOYAGE_API_KEY` - For embeddings
- `POLYGON_API_KEY` - For real-time stock data

## Running the Project

```bash
cd fira-next
npm install
npx convex dev  # In one terminal
npm run dev     # In another terminal
```

## Theme

Dark finance theme with:
- Primary: `#22c55e` (Finance Green)
- Background: `#050505` (Terminal Black)
- Destructive: `#ef4444` (Finance Red)
