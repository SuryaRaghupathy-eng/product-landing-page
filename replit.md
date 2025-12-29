# Map Coordinate Navigator

## Overview

Map Coordinate Navigator is a web application that allows users to input geographic coordinates (latitude and longitude) and navigate to those locations on an interactive map. The application features a clean, utility-focused interface with a sidebar for coordinate input and a full-screen map display powered by Leaflet.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack Query (React Query) for server state
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Shadcn/ui component library (Radix UI primitives with Tailwind CSS)

**Design System**:
- Material Design-inspired approach following Google Maps/Mapbox patterns
- Tailwind CSS for styling with custom color system supporting light/dark modes
- Typography: Inter or Roboto fonts via Google Fonts CDN
- Consistent spacing using Tailwind units (2, 4, 6, 8)

**Layout Pattern**:
- Full-screen split layout: fixed-width sidebar (320-384px) + flexible map container
- Responsive design that stacks vertically on mobile/tablet
- No traditional header - controls integrated into sidebar

### Backend Architecture

**Server Framework**: Express.js (Node.js)
- Development mode uses Vite middleware for HMR (Hot Module Reload)
- Production mode serves static files from built React app
- TypeScript throughout for type safety

**API Design**:
- RESTful endpoint pattern
- Single validation endpoint: `POST /api/validate-coordinates`
- Request/response uses JSON format
- Zod schemas for runtime validation

**Data Storage**:
- In-memory storage implementation (MemStorage class)
- Interface-based design (IStorage) allows easy switching to database later
- User model defined with Drizzle ORM schemas (currently unused but scaffolded for future database integration)

### Data Validation

**Schema Validation**: Zod library
- Coordinate validation enforces geographic boundaries:
  - Latitude: -90 to 90 degrees
  - Longitude: -180 to 180 degrees
- Input schema transforms string inputs to parsed numbers
- Shared schemas between client and server (`shared/schema.ts`)

### External Dependencies

**Mapping Library**: Leaflet 1.9.4
- OpenStreetMap tile layer for map display
- Custom blue marker icons
- Fly-to animation for smooth navigation
- Popup support for marker information

**UI Component Libraries**:
- Radix UI primitives (accordion, dialog, dropdown, select, etc.)
- Tailwind CSS for utility-first styling
- Class Variance Authority (CVA) for component variants
- Lucide React for icons

**Database (Configured but Not Active)**:
- Drizzle ORM configured for PostgreSQL
- Neon serverless PostgreSQL connection ready
- Schema defines users table with UUID primary keys
- Migration system set up via drizzle-kit

**Build Tools**:
- Vite for frontend bundling and development server
- esbuild for backend production builds
- TypeScript compiler for type checking
- PostCSS with Autoprefixer

**Development Utilities**:
- Replit-specific plugins (cartographer, dev banner, runtime error modal)
- Source map support for debugging

### Authentication & Sessions

**Current State**: Authentication scaffolding exists but is not actively used
- User schema defined with username/password fields
- No active session management or authentication endpoints
- `connect-pg-simple` package included for future PostgreSQL session store

### Path Aliases

Configured in `tsconfig.json` and `vite.config.ts`:
- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`
- `@assets/*` → `attached_assets/*`