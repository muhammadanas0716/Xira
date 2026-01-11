# Fira - SEC Filing Intelligence Platform

A modern, real-time SEC filing analysis platform built with Next.js, Convex, and AI-powered RAG (Retrieval-Augmented Generation).

## Features

- **SEC Filing Analysis**: Analyze 10-K, 10-Q, and 8-K filings with AI-powered insights
- **Intelligent Chat**: Ask questions about any filing and get accurate, sourced answers
- **Real-time Updates**: Live message streaming and instant data sync with Convex
- **Financial Metrics**: Real-time stock data and charts
- **Dark Finance Theme**: Bloomberg Terminal-inspired UI design
- **Admin Dashboard**: Manage users, invite codes, and monitor system activity

## Tech Stack

- **Frontend**: Next.js 16.1.1, React 19, TypeScript
- **Backend**: Convex (real-time database, vector search, serverless functions)
- **Authentication**: Clerk
- **UI Components**: shadcn/ui, Tailwind CSS
- **Charts**: Recharts
- **AI**: OpenAI GPT-4o-mini for RAG, Voyage AI for embeddings

## Project Structure

```
fira-next/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth pages (sign-in, sign-up)
│   ├── (dashboard)/              # Protected routes
│   │   ├── page.tsx              # Main dashboard
│   │   ├── chat/[chatId]/        # Chat view
│   │   └── admin/                # Admin dashboard
│   ├── api/                      # API routes
│   │   ├── sec/                  # SEC filing APIs
│   │   └── chat/                 # Chat/RAG API
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── layout/                   # Sidebar, Filing selector
│   └── charts/                   # Stock charts (Recharts)
├── convex/                       # Convex backend
│   ├── schema.ts                 # Database schema
│   ├── users.ts                  # User functions
│   ├── chats.ts                  # Chat functions
│   ├── messages.ts               # Message functions
│   ├── filings.ts                # Filing functions
│   ├── vectorSearch.ts           # Vector search
│   └── inviteCodes.ts            # Invite code management
├── lib/
│   └── utils.ts                  # Utility functions
└── middleware.ts                 # Clerk auth middleware
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Convex account
- Clerk account
- OpenAI API key

### Installation

1. **Navigate to the project:**
   ```bash
   cd fira-next
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your credentials:
   ```
   # Clerk
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...

   # Convex
   NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud

   # OpenAI
   OPENAI_API_KEY=sk-...

   # Optional: Voyage AI for embeddings
   VOYAGE_API_KEY=...

   # Optional: Polygon for stock data
   POLYGON_API_KEY=...
   ```

4. **Set up Convex:**
   ```bash
   npx convex dev
   ```

5. **Run the development server:**
   ```bash
   npm run dev
   ```

6. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL |
| `OPENAI_API_KEY` | Yes | OpenAI API key for RAG |
| `VOYAGE_API_KEY` | No | Voyage AI for embeddings |
| `POLYGON_API_KEY` | No | Polygon for real-time stock data |

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Convex

```bash
npx convex deploy
```

## Features Overview

### Landing Page
- Modern dark finance theme
- Feature highlights
- Call-to-action sections

### Dashboard
- Recent chats overview
- Quick stats (chats, filings, companies)
- Quick start guide

### Chat Interface
- Real-time message streaming
- Markdown rendering
- Stock price display
- Filing metadata

### Admin Dashboard
- User management (activate/deactivate, admin roles)
- Invite code management
- System statistics

## License

MIT
