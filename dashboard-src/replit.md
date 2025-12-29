# RankTracker - SEO Project Creation Dashboard

## Overview

RankTracker is a comprehensive SEO rank tracking dashboard application that enables users to create and manage SEO tracking projects. The application features a multi-step wizard interface for configuring projects with keywords, search engines, competitors, and location settings. Built as a full-stack web application, it provides a streamlined workflow for setting up keyword tracking campaigns with an intuitive, form-based interface following Material Design principles with Linear-inspired refinement.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- React 18+ with TypeScript for type-safe component development
- Vite as the build tool and development server, configured with custom middleware mode for Express integration
- Wouter for client-side routing (lightweight alternative to React Router)
- Path aliases configured for clean imports (@/, @shared/, @assets/)

**UI Component System**
- Shadcn/ui component library with Radix UI primitives for accessible, headless components
- Tailwind CSS for utility-first styling with extensive customization
- Custom design tokens defined in CSS variables for theming (light/dark mode support)
- Material Design approach with emphasis on form clarity and information hierarchy
- Typography: Inter for UI text, JetBrains Mono for code/URLs

**State Management**
- TanStack Query (React Query) for server state management and API caching
- Local component state using React hooks for form data
- Context API for theme management (ThemeProvider)
- Form validation using Zod schemas with react-hook-form integration

**Key UI Patterns**
- Multi-step wizard interface with progress indicator (5 steps total)
- Progressive disclosure through step-by-step form completion
- Real-time validation feedback
- Toast notifications for user feedback
- Responsive design with mobile-first approach

### Backend Architecture

**Server Framework**
- Express.js as the HTTP server framework
- Custom middleware for JSON body parsing with raw body preservation
- HTTP server creation for potential WebSocket upgrade paths
- Request logging middleware with timestamps and duration tracking

**API Design**
- RESTful API endpoints following resource-based conventions
- Routes organized under /api prefix
- CRUD operations for projects resource
- Schema validation using Zod with automatic error formatting
- Consistent error handling with appropriate HTTP status codes

**Data Layer Abstraction**
- IStorage interface defining data access contract
- MemStorage implementation for in-memory development/testing
- Designed for easy swapping to persistent storage (Drizzle ORM configured)
- Separation of business logic from storage implementation

**Build & Deployment**
- Custom build script using esbuild for server bundling
- Dependency allowlist strategy for reduced cold start times
- Production build outputs to dist/ directory
- Vite build for client assets served as static files

### Data Storage Solutions

**Database Configuration**
- Drizzle ORM configured for PostgreSQL dialect
- Neon Database serverless driver (@neondatabase/serverless) for cloud PostgreSQL
- Schema-first approach with migrations directory structure
- Database schema defined in shared/schema.ts for type sharing

**Schema Design**
- Users table: Authentication and user management
- Projects table: Core project configuration with JSONB fields for flexible data
- JSONB columns for complex data types (keywords, search engines, competitors, schedules)
- UUID primary keys using PostgreSQL gen_random_uuid()
- Zod schema validation integrated with database schema via drizzle-zod

**Data Models**
- User: id, username, password (authentication)
- Project: id, name, websiteUrl, country, timezone, keywords[], searchEngines[], competitors[], schedules[]
- Nested types: Keyword (id, text, category), SearchEngine (id, name, enabled, deviceType), Competitor (id, url)

### External Dependencies

**UI Framework & Components**
- React and React DOM for component rendering
- Radix UI component primitives (20+ components: dialogs, dropdowns, tooltips, etc.)
- Lucide React for iconography
- class-variance-authority and clsx for dynamic className management
- tailwind-merge for Tailwind class conflict resolution

**Forms & Validation**
- react-hook-form for form state management
- @hookform/resolvers for Zod integration
- Zod for runtime type validation and schema definition
- drizzle-zod for bridging database and validation schemas

**Data Fetching & State**
- @tanstack/react-query for API calls and cache management
- date-fns for date manipulation and formatting

**Database & ORM**
- Drizzle ORM for type-safe database queries
- @neondatabase/serverless for PostgreSQL connection
- connect-pg-simple for session storage (if sessions are implemented)

**Development Tools**
- Vite for fast development builds and HMR
- @vitejs/plugin-react for React Fast Refresh
- @replit/vite-plugin-runtime-error-modal for error overlay
- @replit/vite-plugin-cartographer and dev-banner for Replit integration
- tsx for TypeScript execution in development
- esbuild for production server bundling

**Routing & Navigation**
- wouter for lightweight client-side routing

**Design System**
- Tailwind CSS with PostCSS and Autoprefixer
- Custom theme configuration with CSS variables
- Shadcn/ui design system with "new-york" style variant

**Build Configuration**
- TypeScript with strict mode and ESNext module resolution
- Path aliases for clean imports across client, server, and shared code
- Bundler module resolution for compatibility with modern tools

### Automatic Ranking Scheduler

**Background Processing**
- Automatic keyword ranking checks run at configurable daily intervals
- Scheduler starts automatically when the server boots
- Re-entrancy protection prevents overlapping execution cycles
- Uses the Serper API for Google search ranking data

**Schedule Options (Daily-focused)**
- Every day (1 day)
- Every 2 days
- Every 3 days
- Every 5 days
- Every 7 days

**Scheduler Features**
- Iterates through all projects and their keywords
- Saves ranking results to storage for historical tracking
- Logs all scheduler activity with timestamps
- Graceful error handling per-keyword to prevent full batch failures

**Dashboard Features**
- Date picker for comparing rankings over time (react-day-picker)
- Quick date range presets (Last 7 days, Last 30 days)
- Position change indicators showing improvement/decline between selected dates