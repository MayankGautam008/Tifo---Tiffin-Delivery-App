# TiffinBox - Homemade Meal Delivery Platform

## Overview

TiffinBox is a three-role web application that connects home-based food sellers with customers seeking fresh, homemade tiffin meals. The platform enables sellers to list their tiffin offerings, customers to browse and book meals, and administrators to manage the entire ecosystem.

**Core Purpose:** Facilitate a marketplace for homemade tiffin services with categories including Vegetarian, Non-Vegetarian, and Jain food options.

**Technology Stack:**
- Frontend: React with TypeScript, Vite build tool
- UI Framework: shadcn/ui components with Tailwind CSS
- Backend: Express.js with TypeScript
- State Management: TanStack React Query
- Authentication: JWT tokens with bcrypt password hashing
- Email: Nodemailer for transactional emails
- Database: Currently using in-memory storage (MongoDB models defined but not active)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Component Structure:**
- Page-based routing using Wouter (lightweight React router)
- Reusable UI components from shadcn/ui library (Radix UI primitives)
- Form validation using React Hook Form with Zod schemas
- Client-side state management via TanStack React Query for server state

**Design System:**
- Typography: Inter (UI/body) and Poppins (headings) from Google Fonts
- Color scheme: Warm orange-red primary (appetite-stimulating), fresh green secondary (vegetarian indicator), golden amber accent
- Both light and dark mode support with HSL color variables
- Mobile-first responsive design approach
- Design inspiration from Uber Eats/Zomato (customer experience), Airbnb (seller listings), and Linear (dashboards)

**Key Pages:**
- Home: Browse tiffins with filtering by category, city, and search
- Login/Register: Authentication with role selection (admin/seller/customer)
- Tiffin Detail: View tiffin information and make bookings
- My Bookings: Customer booking history
- Seller Dashboard: Manage tiffin listings and view bookings
- Admin Panel: Approve/suspend sellers and view system stats

### Backend Architecture

**API Structure:**
- RESTful API design with Express.js
- Route separation in `server/routes.ts`
- Middleware-based authentication using JWT tokens
- Role-based access control (admin, seller, customer)

**Authentication Flow:**
1. User registers with email/password and role selection
2. Passwords hashed using bcryptjs (10 salt rounds)
3. JWT token generated on successful login
4. Token stored in localStorage and sent via Authorization header
5. Middleware validates token and extracts user role for protected routes

**Authorization Levels:**
- Public: Browse tiffins, view details
- Customer: Book tiffins, view own bookings
- Seller: Manage own listings, view own bookings (requires active status)
- Admin: Manage all sellers, view all bookings and stats

**Seller Lifecycle:**
- New sellers start with "pending" status
- Admin must approve (set to "active") before seller can list tiffins
- Admin can suspend sellers, preventing them from adding new listings

### Data Storage

**Current Implementation:**
- In-memory storage using Map data structures (`server/storage.ts`)
- MemStorage class implementing IStorage interface
- Data persists only during server runtime

**Database Models (Defined but Inactive):**
- MongoDB/Mongoose models exist in `server/models/`
- User, Seller, Tiffin, Booking schemas defined
- Connection code present but commented out in `server/index.ts`
- Migration path ready for PostgreSQL via Drizzle (config exists)

**Data Entities:**
- User: Authentication and profile data
- Seller: Shop information tied to user account
- Tiffin: Meal listings with category, price, availability, time slots
- Booking: Customer orders with delivery details and status

**Design Decision - Dual Storage:**
- Rationale: Application currently runs without database dependency for easy setup
- Mongoose models provide schema reference for future migration
- Drizzle config prepared for PostgreSQL integration
- IStorage interface allows swapping implementations without changing business logic

### External Dependencies

**UI Components:**
- shadcn/ui: Pre-built accessible component library built on Radix UI
- Radix UI: Unstyled, accessible component primitives (dialogs, dropdowns, forms, etc.)
- Tailwind CSS: Utility-first CSS framework for styling
- class-variance-authority: Type-safe variant management for components

**Form & Validation:**
- React Hook Form: Form state management and validation
- Zod: TypeScript-first schema validation
- @hookform/resolvers: Integration between React Hook Form and Zod

**Email Service:**
- Nodemailer: Send transactional emails for bookings and seller status updates
- Configured via environment variables (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD)
- Email templates embedded in service functions

**Development Tools:**
- Vite: Fast development server and build tool
- TypeScript: Type safety across frontend and backend
- ESBuild: Production build bundler for server code
- Replit plugins: Dev banner, cartographer, runtime error overlay (development only)

**Authentication & Security:**
- jsonwebtoken: JWT token generation and verification
- bcryptjs: Password hashing
- JWT_SECRET environment variable required for token signing

**Asset Management:**
- Static images stored in `attached_assets/generated_images/`
- Vite alias (@assets) for importing images
- Hero and category images for visual presentation

**State Management:**
- TanStack React Query: Server state caching, background updates, optimistic updates
- Query invalidation on mutations for real-time updates
- Automatic retries and error handling

**Key Integration Points:**
- Email notifications sent on booking confirmation (to customer and seller)
- Email sent when seller status changes (approved/suspended)
- JWT token passed in Authorization header for all authenticated requests
- Form schemas shared between client and server via `shared/schema.ts`