# Project Context & Decision Record: Aura Beauty & Fashion Studio

## 1. Product Overview
- **Domain**: Comprehensive booking, online prepayment, and front-desk POS platform tailored for the beauty, hair, lash, makeup, and ladies' dress services industry in Ghana.
- **Client Experience**: Guest checkout flow with no user account required. Direct Mobile Money (MTN MoMo, Telecel Cash, AT Money) and card payments via Paystack with instant SMS dispatch.
- **Staff Experience**: Role-based internal dashboard with POS terminal and three-level RBAC:
  1. `OWNER_ADMIN`: Full administrative, financial, audit, and configuration access.
  2. `MANAGER`: Operational control over bookings, schedules, staff shifts, services, and POS.
  3. `STAFF_RECEPTIONIST`: Front-desk check-in, checkout, appointment viewing, and rebooking.

---

## 2. Architectural Principles & Invariants
1. **Never Trust Client-Sent Financial Values**:
   - Every price, subtotal, discount, deposit requirement, and grand total is calculated and validated on the server.
   - All monetary amounts are strictly stored as **integer pesewas** (`1 GHS = 100 pesewas`).
2. **Deterministic Time Handling**:
   - All booking times and slot holds are stored in **UTC** (`DateTime` in PostgreSQL).
   - Display and customer communication strictly use **Africa/Accra** (GMT, UTC+0, no daylight saving time).
3. **Database-Level Exclusion Constraint (Zero Double-Booking Guarantee)**:
   - Double-booking is strictly prohibited at the database engine level via PostgreSQL `btree_gist` exclusion constraints.
   - Any attempt to concurrently insert or update an active appointment for the same staff member throws PostgreSQL exclusion violation `23P01`.
4. **Auditability & Soft Deletion**:
   - Critical domain models (`Customer`, `Staff`, `Service`, `Booking`, `User`) utilize soft-deletes (`deletedAt`) to preserve transaction and appointment audit trails.
   - Every sensitive administrative and POS action writes an `AuditLog` entry.
5. **Ghana Phone Normalization**:
   - All customer phone numbers are normalized to standard E.164 `+233XXXXXXXXX` format upon receipt before persistence or SMS gateway dispatch.

---

## 3. Technology Stack
- **Framework**: Next.js 16 (App Router) with React 19.
- **Language**: TypeScript with strict mode enabled (`strict: true`, `noEmit: true`).
- **Styling**: Tailwind CSS v4 with custom design tokens, CSS variables, and OKLCH color spaces.
- **Component Primitives**: shadcn/ui & Lucide React.
- **Database & ORM**: PostgreSQL with Prisma ORM 6.19.3.
- **Validation**: Zod (strict runtime input and typed environment validation).
- **Payment Processing**: Paystack API (Ghana Mobile Money & Cards).
- **SMS Gateways**: Arkesel & mNotify HTTP REST APIs.
- **Testing**:
  - **Vitest**: Unit tests for money, date, phone normalization, RBAC, and database constraints.
  - **Playwright**: E2E browser tests validating responsive rendering at 360px and 1440px.

---

## 4. Visual Design System
- **Palette**: Strictly monochrome.
  - Near-black `#1E1E1E` for primary buttons, active nav pills, and bold cards.
  - Neutral soft greys (`#F4F4F6`, `#E4E4E7`, `#71717A`) for structure and subtle borders.
  - Accent colors are strictly limited to small, subtle status chips (Green for confirmed/paid, Amber for pending/held, Red for cancelled/failed, Grey for completed/archived).
- **Background**: Soft light-grey blurred abstract swirl (`.bg-swirl`) using multi-point radial gradients.
- **Frame**: Master frosted-glass container with `backdrop-filter: blur(24px)`, 1px translucent border, and `border-radius: 32px`.
- **Cards**: Border radii between 24px and 28px. Available in Glass, Solid Near-Black, and Clean White.
- **Typography**: Plus Jakarta Sans geometric sans-serif with bold KPI numerals and welcoming greetings.
- **Navigation**: Floating rounded panel sidebar with black pill active state, collapsing to an accessible slide-over drawer on mobile devices (< 1024px).

---

## 5. Directory Structure
```
/app
  /(public)             # Guest booking & landing site (/)
  /(dashboard)          # Staff management & POS portal (/dashboard, /pos)
  /design               # Comprehensive design system showcase page
  /api                  # API route handlers (/api/health, webhooks)
/components
  /layout               # AppShell, responsive sidebar & topbar
  /ui                   # Button, Card, KpiCard, StatusChip, Tabs, Table, Dialog,
                        # Drawer, ContextMenu, Checklist, Charts, Controls
/lib
  db.ts                 # PrismaClient singleton
  env.ts                # Typed Zod environment validator with startup failure
  money.ts              # Integer pesewas math and GH₵ formatters
  date.ts               # UTC storage & Africa/Accra timezone helpers
  logger.ts             # Structured JSON logger
  api-response.ts       # Shared success/error envelope & route handler wrapper
  auth.ts               # Token hashing & session helpers
  rbac.ts               # Three-level roles & permissions matrix
  payments.ts           # Paystack transaction initialization and verification
  sms.ts                # Ghana phone normalization & SMS dispatching
  availability.ts       # Slot overlap calculations & hold timers
/prisma
  schema.prisma         # Full database schema with all models & enums
  migrations/           # Initial migration including raw btree_gist exclusion constraint
  seed.ts               # Database seed for roles, permissions, categories, staff & services
/tests                  # Vitest unit and database constraint tests
/e2e                    # Playwright responsive verification tests
```

---

## 6. Database Exclusion Constraint Details
The exclusion constraint prevents overlapping bookings for any individual staff member across all active states:
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
ADD CONSTRAINT "no_overlapping_staff_bookings"
EXCLUDE USING gist (
    "staffId" WITH =,
    tsrange("startUtc", "endUtc") WITH &&
)
WHERE (
    "status" IN ('HELD', 'PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN')
    AND "deletedAt" IS NULL
);
```

---

## 7. Staff Authentication Architecture
- **Argon2id Hashing**: High-security password hashing (`@node-rs/argon2`) with memory-hard parameters (19 MiB, 2 iterations, 32-byte output).
- **Dual Login Identifiers**: Supports login with either email or Ghana phone (`0241234567` or `+233...` via `normalizeGhanaPhone`).
- **Server-Side Sessions & Cookie Security**:
  - `aura_session` cookie stored with `httpOnly: true`, `secure: true` (prod), `sameSite: "lax"`.
  - Database-backed `Session` model.
  - Absolute expiration: 7 days max lifetime.
  - Idle timeout: 2 hours of inactivity invalidates the session; active requests slide `lastActiveAt` forward.
  - Global device revocation (`/api/auth/logout-all`).
- **Rate Limiting & Lockout**:
  - Accounts lock for 15 minutes after 5 consecutive failed login attempts.
  - Generic error messages: `"Invalid credentials. Please verify your details and try again."` preventing user enumeration.
  - All login successes, failures, lockouts, and password resets are persisted to the `AuditLog` table.
- **Two-Factor Authentication (TOTP)**:
  - RFC 6238 TOTP verification (`otpauth`) supporting Google Authenticator and 1Password with +/- 30s clock drift tolerance.
- **Password Hygiene**:
  - `mustChangePassword` flag forcing a new password on first login.
  - Admin-initiated password reset token generator (`/api/auth/admin/reset-link`).
- **Middleware Route Protection**:
  - `middleware.ts` intercepts `/dashboard/*` and `/api/admin/*`.
  - Unauthenticated page visits are redirected to `/login?redirect=...`.
  - Unauthenticated API calls return HTTP 401 JSON.

---

## 8. Three-Level Permission-Based RBAC Architecture
- **Roles & Hierarchy**:
  1. `OWNER_ADMIN` (Level 1): Full administrative and financial authority, unrestricted refunds, 100% discount capability, permanent hold of `roles.manage`.
  2. `MANAGER` (Level 2): Operations and staff oversight. Max refund limit: GH₵ 500.00 (50,000 pesewas). Max discount limit: 20%. Holds `bookings.view_all`, `payments.refund`, `discounts.apply`, `reports.view`.
  3. `STAFF_RECEPTIONIST` (Level 3): Frontline operations. Max refund limit: GH₵ 50.00 (5,000 pesewas). Max discount limit: 5%. Holds `bookings.view_own`, `payments.record`, `customers.view`. Cannot manage users, roles, view audit logs, or export reports.
- **Permission Keys (18 Standard Keys)**:
  - `users.manage`, `roles.manage`, `services.manage`, `staff.manage`
  - `bookings.view_all`, `bookings.view_own`, `bookings.create`, `bookings.edit`, `bookings.cancel`
  - `payments.record`, `payments.request`, `payments.refund`
  - `discounts.apply`, `reports.view`, `reports.export`
  - `customers.view`, `customers.export`, `settings.manage`, `audit.view`
- **Server Guard & Evaluation**:
  - `can(user, permission, resource?)`: Validates dynamic role permissions, evaluates scoped boundaries (`bookings.view_own` vs `bookings.view_all` matching `resource.staffId`), and verifies numeric thresholds (`refundPesewas` and `discountPercent`).
  - `requirePermission(user, permission, resource?)`: Throws standard `AppError("Forbidden: Insufficient permissions...", 403, "FORBIDDEN")`.
  - Rule: Hiding buttons in the client is purely for UX; the server validates all permissions on every route handler and server action.
- **Lockout Protection**:
  - The Owner role (`OWNER_ADMIN`) permanently retains `roles.manage`. Any API call attempting to remove `roles.manage` from the Owner role is rejected with HTTP 400 (`LOCKOUT_PREVENTION`).
  - The last active user with the `OWNER_ADMIN` role cannot be deactivated or demoted. Attempting to deactivate or re-role the last remaining active Owner is rejected with HTTP 400 (`LOCKOUT_PREVENTION`).
- **Immediate Propagation**:
  - `validateSessionToken` joins dynamic role permissions from the database. Permission matrix toggles apply immediately to active sessions without server restart.
- **Users & Roles Dashboard UI (`/dashboard/users`)**:
  - Staff & Users Directory: Create user modal (generates temporary password with forced change on first login), role selector, activation/deactivation toggle with lockout protection, single-use 24-hr password reset link generator, and real-time search filter.
  - Role Permission Matrix: Interactive toggle table displaying all 18 capabilities across all 3 roles, visual lock indicator on Owner's `roles.manage`, live sync status, and role limit indicators.

---

## 9. Dashboard Shell & Home Overview Architecture (Prompt 6)
- **Visual Design & Aesthetics**:
  - Strictly monochrome aesthetic (#1E1E1E near-black, white, soft #F4F4F6 greys) with subtle green, amber, and red tints on status chips.
  - Sits inside a frosted-glass frame (`backdrop-blur-md`, 1px translucent white border, 32px radius).
  - Floating white rounded panel desktop sidebar with grouped navigation and bottom settings.
- **Header Top Bar**:
  - Personalized Greeting: `"Hi, {firstName}!"` dynamically populated from session user data.
  - Black Pill `'Create'` Dropdown:
    - "New Booking" (opens appointment modal).
    - "Payment Request" (opens SMS/Paystack mobile money payment link request modal).
    - "Walk-in Sale (POS)" (links directly to `/pos`).
    - Dismissable via backdrop, click toggle, or global `Escape` key.
  - Global Search:
    - Search modal triggered by circular search icon button or keyboard shortcut.
    - Real-time debounced query across customers (name, phone), booking references (`AURA-2026-XXX`), and service titles.
    - Quick-status chips and direct links to booking details.
  - Notification Bell:
    - Live unread notification count badge.
    - Popover displaying live studio notifications feed with timestamp, "Mark all as read" capability, and interactive unread-to-read dismissal.
- **Home Overview Widgets**:
  1. **Widget 1: Dark 'Overall Information' Card**:
     - Solid near-black (#1E1E1E) with white typography.
     - Role-scoped badge: "Studio Total" (for users with `bookings.view_all`) or "My Desk" (for scoped staff).
     - Metric: Total completed client bookings to date.
     - Pending Payments total in pesewas (formatted to GH₵) across outstanding appointments.
     - 3 Mini Stat Tiles: "Today's", "Pending", and "Completed".
  2. **Widget 2: 'Weekly Progress' Line Chart**:
     - Compares appointment volume between this week and previous week.
     - Monday through Sunday (`M T W T F S S`) axis.
     - Today's day marker highlighted with a dark pill indicator.
  3. **Widget 3: 'Month Progress' Circular Progress Ring**:
     - SVG circular progress ring tracking current revenue against monthly target (pesewas).
     - Percentage change indicator comparing month-to-date against previous month.
     - "Download Report" button opening an operations and financial audit export modal with instant CSV generation.
  4. **Widget 4: 'Today' Checklist Card**:
     - Lists all appointments scheduled for today in Africa/Accra timezone.
     - Interactive circular completion checkbox allowing staff to toggle between `CONFIRMED` and `COMPLETED`.
     - Optimistic UI updates, server-side permission check (`bookings.edit`), and audit log entry written upon toggle.
  5. **Widget 5: 'Pending Payments' Cards & Dashed 'Add Booking'**:
     - Cards showing outstanding customer balances requiring deposit or final payment.
     - Direct "Send Reminder" button triggering an SMS notice via Ghana SMS gateway (`lib/sms.ts`), writing an audit log.
     - Actions Context Menu with options: "Remind", "Edit", and "Cancel".
     - Dashed 'Add Booking' card providing a quick shortcut to schedule client sessions.
  6. **Widget 6: 'Latest Bookings' Dark Cards**:
     - Displays recent reservations across hair styling, makeup, lash art, and dress rentals.
     - Status chips with subtle color accents (emerald, amber, rose, neutral).
     - ViewToggle: switches seamlessly between Grid View (dark cards) and List View (data table rows).
     - SortDropdown: sorts bookings by "Most Recent", "Highest Amount", or "Status".
- **Real-Time Data Scoping & RBAC**:
  - `GET /api/dashboard/overview` automatically filters appointments based on user capabilities:
    - Users with `bookings.view_all` receive studio-wide metrics.
    - Staff with `bookings.view_own` receive metrics scoped strictly to their `staffId`.
- **Skeleton Loading & Empty States**:
  - Polished pulse skeletons displayed during initial data fetch for each widget card.
  - Clean empty state illustrations with action buttons when appointments or pending payments are empty.
- **Responsive Layout**:
  - 12-column grid layout at 1440px desktop width.
  - Automatically stacks into clean single-column cards on 360px mobile viewports with collapsible sidebar navigation drawer.

## 10. Catalogue Management & Business Settings Architecture (Prompt 7)
- **Catalogue & Category Management**:
  - Categories: Full CRUD with custom integer display ordering (`order` field on `ServiceCategory`). Categories can be dynamically reordered using `/api/admin/catalog/categories/reorder`.
  - Services: Full CRUD with name, description, duration in minutes, buffer time in minutes, price in pesewas, deposit rules (`NONE`, `FULL`, `PERCENTAGE`, `FIXED`), active flag, image URL, and staff assignment multi-select (`StaffService` junction table).
  - Add-ons: Per-service customizable add-ons (`ServiceAddon`) with additional duration (`durationMin`) and additional price in pesewas (`pricePesewas`).
  - Validation: Comprehensive server-side validation using Zod for all durations (positive integers), buffer times (non-negative integers), and prices (non-negative integer pesewas).
- **Business Settings Management**:
  - Profile: Studio name, logo URL, phone number, physical address, and Google Maps embed/navigation link.
  - Opening Hours: Weekly schedule from Monday to Sunday (`DaySchedule` with `isOpen`, `openTime`, `closeTime` in `HH:MM` format).
  - Holidays & Studio Closures: Date-specific closures with reason (`Holiday` array).
  - Booking Rules: Minimum notice before appointment (1 to 72 hours), maximum days ahead allowed for reservations (7 to 365 days), strict slot intervals (15, 30, or 60 minutes only), and slot hold timeout duration (5 to 60 minutes).
  - Cancellation & Reschedule Policies: Free cancellation deadline (hours before appointment), deposit refund rules (`NO_REFUND`, `FULL_REFUND`, `PARTIAL_50_PERCENT`, `CREDIT_NOTE`), and public policy disclosure statement.
  - SMS Configuration: Ghana SMS Sender ID (strictly alphanumeric, maximum 11 characters conforming to NCA regulations).
  - Regional Invariants: Currency fixed at `GHS` (`GH₵`) and display timezone fixed at `Africa/Accra`.
- **Cryptographic Key Storage & Masking**:
  - Payment credentials (`paystack_public_key` and `paystack_secret_key`) are encrypted at rest using AES-256-GCM authenticated cipher with a SHA-256 derived key from `AUTH_SECRET`.
  - Stored format in `Setting` table: `ivHex:authTagHex:ciphertextHex`.
  - In the UI and client-safe APIs, keys are strictly masked (e.g., `sk_live_••••••••1a2b` or `pk_live_••••••••3c4d`).
  - Only users with `OWNER_ADMIN` role can update payment keys or view unmasked keys via `getSettings({ includeSecrets: true, requesterRole: session.role })`.
- **Audit Logging & RBAC Gating**:
  - Every catalogue modification (category creation, update, delete, reordering; service creation, update, delete; add-on creation, update, delete) requires `services.manage` permission and records an `AuditLog` entry.
  - Every business settings update requires `settings.manage` permission and records an `AuditLog` entry detailing changed fields.
  - Staff / Receptionist role is strictly Read-Only: edit buttons, drawers, and forms are disabled or omitted in the UI, and all mutating API endpoints enforce HTTP 403 `FORBIDDEN` on the server.
- **Typed Helper**:
  - `getSettings(options?)`: Exposes typed, cached business settings throughout the application for upcoming availability, booking, and POS modules.

---

## 11. Staff, Shifts & Exceptions Architecture (Prompt 8)
- **Staff Profiles & Login Accounts**:
  - Profiles: Full CRUD with stylist name, photo URL, bio, comma-separated specialties array (`specialties String[]`), and active status toggle.
  - User Link: Optional link to a login user (`userId` on `Staff`). Stylists can either be dashboard users with login credentials or profiles managed solely by administrators.
  - Service Assignment: Multi-select service assignment persisted via `StaffService` junction table. Only assigned stylists appear as eligible candidates when services are scheduled.
- **Weekly Schedule with Multiple Shifts & Breaks**:
  - Days: Sunday (0) through Saturday (6) weekly schedule template.
  - Multiple Shifts Per Day: Stylists can have multiple distinct working shifts in a single day (e.g. Morning 09:00-13:00, Afternoon 14:00-18:00).
  - Meal Breaks & Shift Labels: Each shift supports an optional internal break (`breakStart`, `breakEnd`), shift label (`label`), and day off flag (`isDayOff`).
  - Overlap Validation (`validateShiftsDoNotOverlap` in `lib/staff-schedule.ts`):
    - Rejects invalid time format or inverted intervals (`startTime >= endTime`).
    - Validates that break intervals are strictly contained within their parent shift window (`breakStart >= startTime` and `breakEnd <= endTime`).
    - Validates that no two active shifts intersect on the same weekday for the same staff member. Any overlap throws `AppError(..., 400, "OVERLAPPING_SHIFTS")`.
- **Exceptions, Time-Off & One-Off Blocked Time**:
  - `TimeOff`: Stylist leave periods with start and end UTC timestamps, approval flag (`approved Boolean @default(true)`), and reason.
  - `BlockedTime`: Specific one-off unavailability windows (e.g., personal appointments, training) with reason.
  - Exceptions Calendar UI: Dedicated "Calendar Exceptions & Leave" view to inspect active stylist leaves, blocked slots, and delete expired or incorrect blocks.
- **Conflict Detection & Resolution Engine**:
  - `findConflictingBookings(staffId, startUtc, endUtc)`: Detects active non-cancelled/non-completed customer bookings overlapping the requested leave or block period.
  - Interactive Conflict Modal: If conflicts exist, displays affected bookings with customer details and two remediation pathways:
    1. **Reassign to Colleague**: Automatically queries active colleagues via `findEligibleStaffForBooking` who perform the exact service, work during that window, and have no overlapping bookings, breaks, or leaves. Reassigns the booking and logs an `AuditLog` entry.
    2. **Reschedule Booking**: Updates booking UTC start and end times to a new customer-agreed window via `rescheduleBooking`, recording an `AuditLog` entry.
    3. **Force Override**: Administrators can also force-apply leave after acknowledging the conflict list.
- **Bulk Holiday Block Action**:
  - Studio-wide closures / national public holidays: `bulkBlockHoliday(input, auditUser)` applies a uniform `BlockedTime` closure from 00:00 to 23:59 UTC across all active stylists simultaneously in a single atomic database transaction.
  - Pre-validates conflicts across all active staff before writing, returning conflicting bookings if present unless forced.
- **RBAC & Audit Logging**:
  - `staff.manage` permission required for creating, modifying, or deleting staff profiles, weekly schedules, time-off, blocked time, and bulk holidays.
  - Every mutation writes a detailed `AuditLog` entry (`STAFF_CREATE`, `STAFF_UPDATE`, `STAFF_DELETE`, `STAFF_SCHEDULE_UPDATE`, `STAFF_TIMEOFF_CREATE`, `STAFF_BLOCKED_CREATE`, `BOOKING_REASSIGN`, `BOOKING_RESCHEDULE`, `BULK_HOLIDAY_BLOCK`).
  - Staff / Receptionist role has strict Read-Only access: UI hides mutation actions, displays a prominent Read-Only warning banner, and server rejects mutating requests with HTTP 403 `FORBIDDEN`.

---

## 12. Availability Engine & Slot Holds Architecture (Prompt 9)
- **Pure Function Availability Engine (`/lib/availability`)**:
  - `duration.ts`: `calculateBookingDuration(services, addons)` computes the exact total service duration, service buffers (`bufferMin`), add-on durations, and total price in integer pesewas.
  - `slots.ts`:
    - `isOverlapping(startA, endA, startB, endB)`: Half-open interval verification (`[start, end)`). Enables clean back-to-back booking without overlap collisions.
    - `isSlotAvailable(candidate, busyIntervals)`: Verifies zero intersections with existing bookings, active holds, leave, blocked periods, or breaks.
    - `generateStaffDaySlots(...)`: Computes slots stepping in multiples of `slotIntervalMinutes` (15, 30, or 60 min) clipped to studio opening hours and stylist shifts.
    - `computeAvailableSlots(...)`: Pure orchestrator generating chronologically sorted slots across single stylists or team-wide rotation.
  - `least-load.ts` / Rotation:
    - For `staffId: "any"`, candidate stylists are scored by least load (number of bookings and active holds on that date). The stylist with the lowest load is assigned, with deterministic secondary tie-breaking by stylist name and ID. All eligible free stylists are attached in `availableStaff`.
- **Multi-Service Sequencing**:
  - Multi-service bookings (and attached add-ons) are sequenced with a single stylist by default. The engine verifies the stylist offers all selected services via `StaffService`.
- **Slot Holds Engine (`/lib/availability/holds.ts`)**:
  - `createSlotHold(...)`:
    - Places a 10-minute hold (`expiresAt = now + 10 min`) on the slot.
    - Releases expired holds first so abandoned slots immediately re-enter available pool.
    - Database exclusion constraint (`no_overlapping_staff_holds` on `SlotHold`) serves as the ultimate atomic concurrency guard against double holding.
  - `extendSlotHold(token, additionalMinutes = 5)`:
    - Extends the hold window once (`extendedCount < 1`).
    - Attempting a second extension throws `AppError("Hold can only be extended once", 400, "HOLD_ALREADY_EXTENDED")`.
    - Expired holds cannot be extended (`HOLD_EXPIRED`).
  - `releaseSlotHold(token)`:
    - Explicitly deletes the hold when customers cancel or navigate away.
  - `releaseAbandonedHolds(now?)`:
    - Deletes all holds where `expiresAt <= now`, freeing inventory.
- **Rate Limiting Engine (`/lib/rate-limit.ts`)**:
  - Public availability search (`GET /api/availability`): 60 requests/minute per client IP.
  - Slot hold creation (`POST /api/availability/hold`): 20 requests/minute per client IP.
  - Exceeding limit throws HTTP 429 `RATE_LIMIT_EXCEEDED` with `Retry-After` seconds.
- **REST APIs**:
  - `GET /api/availability`: Public endpoint computing available slots.
  - `POST /api/availability/hold`: Places 10-minute hold.
  - `POST /api/availability/hold/extend`: Extends active hold once.
  - `DELETE /api/availability/hold`: Explicitly cancels hold.
  - `POST /api/availability/cleanup`: Maintenance trigger to purge expired holds.

---

## 13. Public Website & Guest Booking Wizard Flow (Prompt 10)
- **Monochrome Glass Visual System**:
  - Consistent design language: near-black (`#1E1E1E`), frosted glass (`backdrop-blur-md bg-white/80 border border-black/5`), soft greys, and high-contrast typography.
  - No client-facing accounts: customers never create usernames or passwords. Bookings and SMS notifications are linked directly to verified Ghana phone numbers.
- **Customer Pages**:
  - **Home (`/`)**: High-impact hero with bridal photography, "Open for Bookings" status chip, 3-step "How Guest Booking Works" explainer, curated services grid, verified customer testimonials, and LocalBusiness JSON-LD schema.
  - **Services Catalogue (`/our-services`)**: Category tabs, service cards with prices formatted in GH₵ (via `formatPesewas`) and durations, add-on previews with incremental pricing, and "Book This Service" direct deep links.
  - **Lookbook Gallery (`/gallery`)**: Visual editorial gallery featuring generated high-fashion bridal glam, Russian volume lashes, couture gown rentals, and studio interior photography with "Book This Look" actions.
  - **Policies (`/policies`)**: Clear customer-friendly policies: 24-hour cancellation refund window, deposit rules, 15-minute studio grace period, hospital-grade sanitation protocols, and gown rental terms.
  - **Contact (`/contact`)**: East Legon flagship address, direct click-to-call phone number, WhatsApp direct chat link (`wa.me`), operating hours, Google Maps directions, and interactive customer inquiry form.
- **Mobile-First Booking Wizard (`/book`)**:
  - **Step 1: Services & Add-ons**: Multi-select across categories with running item count, cumulative duration in minutes, and running subtotal in GH₵.
  - **Step 2: Stylist Selection**: Prominent "Any Available Stylist" card (least-load rotation for fastest booking) or specific artist profiles with specialties.
  - **Step 3: Date & Time**: Interactive calendar and slot grid fetched dynamically from `GET /api/availability`. Selecting a slot triggers a 10-minute hold via `POST /api/availability/hold`.
  - **Step 4: Guest Details**: Client full name, Ghana phone number with real-time validation and normalization (`024XXXXXXX` -> `+23324XXXXXXX`), optional email for calendar invites, and appointment styling notes.
  - **Step 5: Review & Pay**:
    - Complete order summary itemizing services, add-ons, assigned stylist, date, and Accra local time.
    - Payment option selector: 50% deposit vs full payment.
    - Studio policy agreement checkbox.
    - Live 10-minute hold countdown timer with amber/red urgency states.
    - Single "+5 min" extension button (`POST /api/availability/hold/extend`).
    - Graceful expiry banner: if hold expires, warns customer with a one-click button to pick a new slot on Step 3 without wiping entered client details.
    - "Confirm & Pay" button creates reservation via `POST /api/bookings/public` with unique `BK-XXXXXX` reference and dispatches SMS.
- **State Persistence**:
  - Synchronized in `localStorage` under `aura_booking_wizard_state`. Page refreshes or back navigation seamlessly restore wizard step, selected services, stylist, customer details, and hold state.
  - "Start Over" reset button allows clients to clear state and restart fresh.
- **Mobile Viewport Optimization**:
  - Engineered for flawless 360px mobile viewports (e.g. mobile Chrome / Android / iPhone SE). Sticky bottom bar displays running items, duration, price, and accessible navigation buttons.

---

## 14. Verification & Commands
- **Lint**: `npm run lint` (ESLint 9 passing with 0 errors and 0 warnings)
- **Typecheck**: `npm run typecheck` (`tsc --noEmit` passing with 0 errors)
- **Unit & Integration Tests**: `npm run test` (Vitest: 88 passing tests across 10 test suites covering phone validation/normalization, deposit rules, money math, PostgreSQL exclusion constraints, authentication lockout, session expiry, RBAC permission matrix, settings encryption, catalogue validation, overlapping-shift rejection, leave conflict detection, eligible colleague discovery, booking reassignment, bulk holiday blocks, buffer calculations, back-to-back non-overlap, holiday closures, leave blocks, any-available least-load assignment, hold single extension, abandoned hold cleanup, simultaneous concurrency race conditions, Paystack MockProvider, server-side initialization, mobile money POS charge with OTP/PIN, payment/booking state machine illegal transition rejection, deposit amount validation, webhook HMAC SHA512 signature verification, idempotent event deduplication, row-level locking race prevention, payment reconciliation, balance payment flow, and background maintenance jobs)
- **E2E Tests**: `npm run test:e2e` (Playwright: 44 passing tests across desktop and mobile viewports, unauthenticated redirects, login flows, RBAC UI management, privilege escalation prevention, dashboard shell, search modal, 6 home overview widgets, catalogue management, business settings tabs, staff profiles, weekly schedule drawer, bulk holiday blocking, staff read-only enforcement, availability slot queries, hold creation, single extension, duplicate extension rejection, hold release, public site navigation, LocalBusiness JSON-LD structured data, 360px mobile booking wizard 5-step flow, localStorage state persistence, Paystack online checkout initialization, confirmation return-page server verification, and online balance settlement)
- **Production Build**: `npm run build` (Next.js production build succeeded with Turbopack, static prerendering, and partial prerendering for dynamic routes)
- **Health Check**: `GET /api/health` returns HTTP 200 with `{ success: true, data: { status: "ok" } }`
- **Customer Public Site**: `http://localhost:3000/`
- **Customer Services Menu**: `http://localhost:3000/our-services`
- **Customer Studio Gallery**: `http://localhost:3000/gallery`
- **Customer Policies**: `http://localhost:3000/policies`
- **Customer Contact**: `http://localhost:3000/contact`
- **Mobile Booking Wizard**: `http://localhost:3000/book`
- **Booking Confirmation**: `http://localhost:3000/booking/confirmation?ref=...`
- **Pay Remaining Balance**: `http://localhost:3000/booking/pay-balance?ref=...`
- **Staff Portal & Overview**: `http://localhost:3000/dashboard` (Owner login: `owner@aurastudio.gh` / `AuraStudio2026!Secure`)
- **Users & Roles Management**: `http://localhost:3000/dashboard/users`
- **Catalogue & Services Management**: `http://localhost:3000/services`
- **Business Settings**: `http://localhost:3000/settings`
- **Staff, Shifts & Rosters**: `http://localhost:3000/staff`

---

## 15. Paystack Integration (Prompt 11)
- **Server-Only Security & Amount Integrity**:
  - `PAYSTACK_SECRET_KEY` is strictly server-side. Never exposed in client bundles or public APIs.
  - Payment amounts are strictly computed on the server from the `Booking` database records (`depositRequiredPesewas`, `totalPesewas`, or remaining balance). Client-sent amounts are rejected.
  - All financial math is conducted in integer pesewas (`GHS` currency) to eliminate floating-point rounding inaccuracies.
- **Payment Provider Architecture (`/lib/payments/provider.ts`)**:
  - `PaymentProvider` interface decoupling payment logic from Paystack specifics.
  - `PaystackPaymentProvider`: Production implementation interfacing with Paystack REST API (`/transaction/initialize`, `/transaction/verify`, `/charge`, `/charge/submit_otp`, `/charge/submit_pin`, `/refund`).
  - `MockPaymentProvider`: High-fidelity offline and test provider simulating card authorizations, Mobile Money prompts, OTP submission, PIN entry, and refund processing without live credentials.
  - Factory function `getPaymentProvider()` dynamically chooses `MockPaymentProvider` in test/offline environments or `PaystackPaymentProvider` when production secrets are present.
- **Payment Modes**:
  - **Deposit**: Computes required deposit (50% or service-defined rule) and creates pending payment.
  - **Full Payment**: Collects full service total upfront.
  - **Paying Balance Later**: Clients who paid a deposit can settle the remaining balance online before appointment via `/booking/pay-balance?ref=BK-...` or at the studio front desk.
  - **POS Mobile Money Direct Charge**: Salon receptionists can trigger direct MoMo push notifications to clients' phones (MTN, Telecel, AT) with full lifecycle handling (`pending`, `send_otp`, `send_pin`, `success`, `failed`).
- **Return Page Verification**:
  - `/booking/confirmation`: Auto-verifies transaction status server-side via `GET /api/payments/verify?ref=...` as a resilient fallback to the webhook. Displays booking reference, stylist, appointment date/time in `Africa/Accra`, breakdown of paid vs remaining balance, Google Maps directions to East Legon, and balance payment options.

---

## 16. Webhooks, Payment State Machine & Background Jobs (Prompt 12)
- **Webhook Endpoint (`POST /api/webhooks/paystack`)**:
  - **HMAC SHA512 Verification**: Verifies `x-paystack-signature` header against the raw body buffer using `crypto.createHmac("sha512", secret)`. Rejects mismatched signatures with HTTP 401.
  - **Fast 200 Response**: Immediately acknowledges valid webhooks to avoid gateway timeouts and unnecessary retries.
  - **Idempotency & Replay Protection**: Stores processed event IDs and references in the `ProcessedWebhook` database table. Replays and duplicate event deliveries are recognized and dropped cleanly with `{ message: "Event already processed (idempotent)" }`.
  - **Supported Webhook Events**:
    - `charge.success`: Verifies currency (`GHS`) and paid amount, transitions Payment to `PAID`, confirms `Booking`, logs audit record, and dispatches customer confirmation SMS.
    - `charge.failed`: Transitions Payment to `FAILED` and releases associated slot hold so other clients can book.
    - `refund.processed`: Transitions Payment to `REFUNDED` (or `PARTIALLY_REFUNDED`), creates `Refund` record, and updates booking payment counters.
- **Strict Payment & Booking State Machine (`/lib/payments/state-machine.ts`)**:
  - Defines legal transition matrices for `PaymentStatusType` (`PENDING` -> `PAID` | `FAILED`, `PAID` -> `REFUNDED` | `PARTIALLY_REFUNDED`) and `BookingStatusType` (`HELD` -> `PENDING_PAYMENT` -> `CONFIRMED` -> `CHECKED_IN` -> `COMPLETED`, etc.).
  - Out-of-order events (e.g. attempting to pay a cancelled booking or re-paying an already paid payment) are rejected.
  - `assertCanConfirmBooking`: Hard validation ensuring paid amount is at least `depositRequiredPesewas` and currency is strictly `GHS`.
- **PostgreSQL Row-Level Locking (`/lib/payments/reconciliation.ts`)**:
  - Employs `SELECT ... FOR UPDATE` row-level locks on the `Payment` and `Booking` rows within an atomic `prisma.$transaction`.
  - Guarantees that if Paystack webhook and the customer return-page verify hit the server simultaneously, one waits for the other; the second execution detects `PAID` and returns safely without duplicate SMS or state collisions.
- **Scheduled Background Maintenance Jobs (`/lib/payments/jobs.ts` & `/api/payments/reconcile`)**:
  - **Slot Hold Expiry**: Releases abandoned slot holds where `expiresAt < now()`.
  - **Unpaid Booking Auto-Cancellation**: Cancels `PENDING_PAYMENT` bookings that have remained unpaid past a configurable threshold (e.g., 30 minutes).
  - **Stale Payment Reconciliation**: Scans `PENDING` payments older than 15 minutes, verifies them against Paystack's API, reconciles any that succeeded out-of-band, and alerts the Studio Owner if an amount or status mismatch is detected.

---

## 17. Bookings Management Module (Prompt 13)
- **Interactive Calendar Views (`/bookings` & `/components/bookings/calendar-view.tsx`)**:
  - **Day View**: Displays single-day timeline from 08:00 to 20:00 Africa/Accra with scheduled appointments, customer name, service name, duration, and stylist badges.
  - **Week View**: Horizontal 7-day grid (Monday to Sunday) mapping all bookings for the week with one-click slot inspection and booking drawer triggers.
  - **Per-Staff Columns View**: Dynamic multi-column matrix where each stylist has a dedicated column alongside an 08:00–20:00 hourly timeline.
  - **Drag-to-Reschedule with Real-Time Conflict Detection**: HTML5 drag-and-drop allows studio managers to drag any active booking to a new time slot or a different stylist. The system computes the new start/end timestamps, preserves original duration, and verifies against Postgres exclusion constraints and existing staff bookings. If an overlapping booking exists, a 409 conflict error banner is rendered and the reschedule is safely blocked.
  - **Monochrome Status Patterns**: Distinct visual tones and textures for appointments adhering to monochrome design system (e.g. solid black for Confirmed, diagonal stripes for Checked In, dark charcoal for Completed, dashed borders for Cancelled, dotted styling for No-Show).
- **List View with Multi-Filtering & Search (`/components/bookings/list-view.tsx`)**:
  - **Multi-Filter Engine**: Filter appointments by `Status` (Confirmed, Checked In, Completed, Cancelled, No-Show, Pending Payment), `Stylist`, `Service Category/Item`, `Booking Source` (Web, POS, Phone, Walk-in), and `Payment Status`.
  - **Real-Time Live Search**: Debounced search matching customer name, Ghana phone number (+233/024/050), or booking reference (`BK-XXXX`).
  - **Pagination**: Server-side cursor/page controls displaying total count, current page, and quick page jumps.
- **Booking Detail Slide-Out Drawer (`/components/bookings/booking-drawer.tsx`)**:
  - **Full Operational Dossier**: Itemized services with duration and pricing, customer visit history counter, stylist assignment, timeline with Africa/Accra local times, and Paystack payment transactions breakdown.
  - **Internal Notes**: Timestamped internal notes ledger with author attribution and audit logging for client preferences and formula records.
  - **Audit Trail**: Chronological event timeline recording creation, payment confirmations, status transitions, reschedules, and notes.
  - **Permission-Gated Operations**:
    - **Confirm**: Promotes pending booking to confirmed (`bookings.edit`).
    - **Check In**: Marks client arrived on site (`bookings.edit`).
    - **Complete**: Finalizes appointment and records completion (`bookings.edit`).
    - **Cancel with Mandatory Reason**: Modal requiring cancellation justification, updating status to `CANCELLED`, logging to `AuditLog`, releasing calendar slots, and sending SMS notification.
    - **Mark No-Show**: Flags unfulfilled booking and records penalty status.
    - **Reschedule**: Date and time picker with conflict checks and automatic notification dispatch.
    - **Reassign Staff**: Reassigns appointment to any active stylist qualified for the booked service.
    - **Edit Items**: Modifies booked services and recalculates totals and deposit requirements.
- **Role-Scoped Visibility for Staff**:
  - Staff users without `bookings.view_all` permission (Receptionists/Stylists) are automatically restricted to bookings assigned to their own staff profile (`where.staffId = session.staffId`).
  - Studio Owner and Managers retain full cross-staff visibility across all views.
- **Real-Time Server-Sent Events (SSE) Synchronization (`/api/admin/bookings/events`)**:
  - SSE endpoint streams `booking_event` notifications (`CREATED`, `STATUS_CHANGED`, `RESCHEDULED`, `REASSIGNED`, `ITEMS_UPDATED`, `NOTE_ADDED`) to all active dashboard tabs.
  - Includes automatic 25s keepalive heartbeat and role-scoped event dispatch.
- **Verification & Acceptance**:
  - `tests/bookings-management.test.ts`: 9 unit/integration tests verifying legal state machine transitions, invalid transitions, role-scoped queries, reschedule collision detection, and cancellation audit logging.
  - `e2e/bookings-management.spec.ts`: Full Playwright E2E coverage across Desktop Chrome and Mobile Chrome (Pixel 5) testing:
    1. Reschedule conflict error handling (409 banner).
    2. Cancellation flow requiring reason, updating status, and writing audit logs.
    3. Role-scoped visibility ensuring Staff cannot view appointments assigned to other stylists.
  - **Test Suite Status**: 97/97 Vitest unit tests passing across 11 test suites; 100% Playwright E2E pass rate for Prompt 13; 0 ESLint errors; 0 TypeScript errors; Turbopack production build passing.

---

## Prompt 14: POS (Point of Sale, Walk-ins, and In-Store Checkout)
- **POS Screen (`/pos` & `/components/pos/`)**:
  - **New Sale & Walk-In Configuration**: Quick customer selection or inline customer creation by phone and name, dynamic service and add-on picker with category navigation and live itemized basket.
  - **Staff Assignment & Timing**: Ability to select an assigned stylist and choose either "Now" for instant walk-ins or select a future scheduled start time.
  - **Role-Based Discounts & Reason Enforcement**:
    - Staff / Receptionist: Maximum 5% discount.
    - Manager: Maximum 20% discount.
    - Owner: Up to 100% discount.
    - Discount reason is strictly enforced and recorded on the receipt and in audit logs.
  - **Split & Multi-Method Checkout Panel**:
    - **Cash**: Tracks amount tendered and exact change due in Ghana Pesewas.
    - **Mobile Money (MoMo)**: Direct Paystack push prompt or manual transaction reference capture across MTN MoMo, Telecel Cash, and AT Money.
    - **Card**: POS terminal reference or manual authorization number.
    - **Split Payments**: Distribute payment across Cash, MoMo, and Card simultaneously.
    - **Partial Payment & Balances**: Settle partial amounts with the remaining balance left open for later collection.
    - **Gratuity & Tips**: Custom tip amount allocation attributed to the servicing staff member.
  - **Sequential Gapless Receipts (`R-000123`)**:
    - Atomic database counter locking via `ReceiptCounter` (`FOR UPDATE` transaction) preventing number collisions and gaps under high concurrent sales.
    - 80mm thermal-friendly print stylesheet (`@media print` formatted for thermal roll printers).
    - PDF receipt generation (`/api/admin/pos/receipts/[id]`).
    - One-click receipt sharing via SMS and WhatsApp.
  - **Voids & Refunds**:
    - Voiding of receipts requiring a mandatory reason and permission check.
    - Enforces role refund limits (Staff: 50 GHS max; Manager: 500 GHS max; Owner: unlimited).
  - **End-of-Day Summary (`/api/admin/pos/summary`)**:
    - Manager and Owner breakdown of daily sales partitioned by Cash, Mobile Money, Card, tips collected, and voids.

---

## Prompt 15: Payment Requests from the Dashboard
- **Cryptographic Security & Data Architecture**:
  - **256-Bit Unguessable Tokens**: Generated using 32 bytes of cryptographic entropy (`crypto.randomBytes(32).toString("hex")`).
  - **Hashed at Rest**: Stored as SHA-256 hashes (`tokenHash` with `@unique` index) in PostgreSQL. The raw token is never persisted in plaintext.
  - **Rate Limiting**: Public viewing endpoint `/api/pay/[token]` rate-limited to 30 requests/minute per IP; submission endpoint `/api/pay/[token]/pay` rate-limited to 10 attempts/5 minutes per IP.
  - **Configurable Expiry**: Defaults to 24 hours (1440 minutes) with custom expiry range from 10 minutes to 7 days. Requests viewed past expiration are marked `EXPIRED`.
  - **Single Active Request Invariant**: Invariant enforced checking existing pending/sent/viewed requests for the exact booking amount; duplicate requests return `409 Conflict`.
- **Payment Request Creation & Multi-Channel Dispatch (`/lib/payment-requests/service.ts`)**:
  - Triggered from any booking with an outstanding balance in the booking drawer (`/bookings`) or from unpaid POS sales.
  - Full balance shortcut or custom amount with an optional salon message.
  - **(a) Real-Time Customer Banner**: Emits `PAYMENT_REQUEST_SENT` event over SSE; customer private booking page displays an animated 'Payment Request Received' banner within 3 seconds with a direct 'Pay Now' link.
  - **(b) SMS Notification with Short Link**: Sends customer SMS with short link `/pay/r/:shortCode` (8-char alphanumeric identifier) redirecting to the secure payment page.
  - **(c) Paystack MoMo Push**: Optional direct push prompt sent to customer handset via Paystack Mobile Money Charge API (`toPaystackMomoProvider` mapping for MTN, Telecel, and AT).
  - **(d) Real-Time Staff Dashboard Tracking**: Server-Sent Events (`/api/admin/bookings/events`) broadcast status updates (`SENT`, `VIEWED`, `PAID`, `FAILED`, `EXPIRED`, `CANCELLED`) to staff in real time with audio-visual notifications, plus Resend and Cancel actions.
- **Guest Public Checkout (`/pay/[token]`)**:
  - No authentication or login required; token validates access.
  - Mobile-first luxury UI styled with Accra studio theme, real-time countdown timer, and booking item breakdown.
  - Supports Mobile Money (MTN, Telecel, AT) and Card.
  - Atomic settlement in transaction: marks `PaymentRequest` as `PAID`, allocates sequential receipt number (`R-000...`), increments booking `amountPaidPesewas`, flips booking status to `CONFIRMED`, creates `Payment` record, and emits `PAYMENT_REQUEST_PAID`.
- **Verification & Acceptance**:
  - `tests/payment-requests.test.ts`: 6 unit tests covering 256-bit token hashing, single active request per amount invariant, expiry enforcement, atomic payment settlement, and staff cancel/resend workflows.
  - `e2e/payment-requests.spec.ts`: End-to-end Playwright acceptance test verifying the complete flow:
    1. Staff creates payment request with custom message from dashboard.
    2. Customer private booking confirmation page renders 'Pay now' banner within 3 seconds via SSE.
    3. Customer completes MoMo payment without logging in.
    4. Dashboard live status immediately flips to Paid and booking balance updates to GH₵ 0.00.
  - **Overall Test Suite Status**: 114/114 Vitest unit tests passing across 13 test files; Playwright E2E passed in 3.6s; 0 TypeScript errors; 0 ESLint errors; production build passing.

---

## Prompt 16: Customer Management Module
- **Normalised Phone Auto-Creation & Deduplication**:
  - Automatically creates and links customer records by normalised Ghana phone (`+233XXXXXXXXX`) across public web bookings and in-store POS checkouts.
  - Re-uses existing customer accounts when guest bookings are made with varied phone number representations (e.g. `024 111 2233`, `233241112233`, `+233241112233`).
- **Comprehensive Customer Profile & Sensitivities**:
  - **Profile Metrics**: Contact details, completed visit count, lifetime spend (stored in integer pesewas, displayed in GHS), last visit date, and upcoming bookings.
  - **Allergy & Sensitivity Safeguards**: Highlighted prominently on the booking drawer (`[data-testid="customer-allergy-alert"]`) with a vibrant amber card and 'Staff Pre-Check' warning badge so stylists and technicians review client sensitivities prior to appointments (e.g., cyanoacrylate lash glue sensitivity).
  - **Preferences & Tags**: Styling preferences (e.g., lash mapping, beverages, silent appointments) and tag badges (`VIP`, `BRIDAL`).
  - **Marketing Consent**: Flag and timestamp tracking client consent (`marketingConsent`, `marketingConsentAt`).
- **Administrative Operations & Role Gating**:
  - **Duplicate Merge (Manager & Above)**: Permission-gated via `CUSTOMERS_MERGE`. Atomically repoints bookings and receipts, combines tags and sensitivity notes without loss, soft-deletes the duplicate profile, and logs an audit trail. Staff/Receptionists are strictly forbidden (403).
  - **CSV Export (Manager & Above)**: Permission-gated via `CUSTOMERS_EXPORT`. Exports customer directory with proper CSV escaping and sanitisation.
  - **Ghana Data Protection Act (Act 843) Erasure (Owner-Only)**: Strictly restricted to `OWNER_ADMIN`. Under Act 843 principles, strips personal identifiers (name, phone, email, notes, sensitivities, consent) to anonymised pseudonyms (`isAnonymized: true`, `anonymizedAt`) while preserving historical financial bookings and receipt totals for accounting and tax audit compliance.
- **Verification & Acceptance**:
  - `tests/customers.test.ts`: 10 comprehensive unit/integration tests verifying normalised phone merging, allergy notices on booking details, Manager-only duplicate merge, Owner-only Act 843 erasure, and CSV export.
  - `e2e/customers.spec.ts`: Playwright browser tests across Desktop Chromium and Mobile Chrome verifying:
    1. Customer directory listing, tag filtering, search, and profile drawer.
    2. Prominent allergy notice rendered in the booking drawer for staff pre-check.
  - **Full Suite Status**: 14/14 Vitest suites passing (124/124 tests); 4/4 Playwright tests passing; 0 TypeScript errors; 0 ESLint errors; production build succeeded.

---

## Prompt 17: Notification System (Job Queue, Provider Abstractions, Templates & In-App Feed)
- **Job Queue & Resilient Dispatch Engine**:
  - Implemented transactional notification queue (`NotificationQueue`) in [`lib/notifications/queue.ts`](file:///Users/khatayon/Booking-System/lib/notifications/queue.ts) with `pg-boss` background adapter in [`lib/notifications/pg-boss.ts`](file:///Users/khatayon/Booking-System/lib/notifications/pg-boss.ts).
  - **Strict Idempotency**: Unique `idempotencyKey` on both `NotificationJob` and `MessageLog` ensures no message is sent twice even under concurrent triggers or network re-deliveries.
  - **Retries with Exponential Backoff**: Failed provider dispatches calculate exponential backoff (`2s, 4s, 8s...`), maintain job in `PENDING` with updated `runAt`, track `retryCount` and `nextRetryAt` in `MessageLog`, and mark `FAILED` with `failedAt` only after `maxAttempts` are exhausted.
- **Provider Abstractions**:
  - Clean interfaces [`lib/notifications/types.ts`](file:///Users/khatayon/Booking-System/lib/notifications/types.ts) supporting:
    - **SMS**: Arkesel (`ArkeselSmsProvider`), mNotify (`MNotifySmsProvider`), and test/sandbox Mock (`MockSmsProvider`).
    - **Email**: Resend (`ResendEmailProvider`), SMTP (`SmtpEmailProvider`), and test/sandbox Mock (`MockEmailProvider`).
    - **Factory**: [`lib/notifications/providers/factory.ts`](file:///Users/khatayon/Booking-System/lib/notifications/providers/factory.ts) automatically resolving configured providers with sandbox mode override.
- **SMS Length & Unicode Cost Estimation**:
  - GSM 03.38 vs Unicode (UCS-2) automatic detection in [`lib/notifications/utils.ts`](file:///Users/khatayon/Booking-System/lib/notifications/utils.ts).
  - Accurately computes character count, GSM extension character doubling (`^{}\[~]|€`), multi-segment boundaries (160 single / 153 multi for GSM-7; 70 single / 67 multi for Unicode), and integer pesewas cost estimates (Ghana rate: ~4.5 to 5 pesewas/segment).
- **Template Management (Manager & Above)**:
  - Supports dynamic variables: `{{name}}`, `{{service}}`, `{{date}}`, `{{time}}`, `{{reference}}`, `{{manageLink}}`, `{{amountDue}}`, `{{amountPaid}}`, `{{refundAmount}}`, `{{staffName}}`.
  - Permission-gated API (`/api/admin/notifications/templates`) allowing Manager and Owner to edit template bodies and subjects; Staff/Receptionist requests are rejected with 403.
  - Interactive template editor UI component [`NotificationTemplateEditor`](file:///Users/khatayon/Booking-System/components/notifications/template-editor.tsx) integrated in studio Settings (`/settings?tab=notifications`) with real-time GSM/Unicode segment counter and live client preview.
- **Comprehensive Notification Events**:
  - Fully implemented in [`lib/notifications/events.ts`](file:///Users/khatayon/Booking-System/lib/notifications/events.ts):
    1. `booking_confirmed`: Customer SMS/Email confirmation, 24h & 2h reminders scheduled, staff new booking alert.
    2. `payment_received`: Deposit or balance receipt with reference and updated balance.
    3. `payment_request`: Direct secure payment link via SMS and Email.
    4. `reminder_24h` & `reminder_2h`: Pre-appointment SMS/Email reminders.
    5. `booking_rescheduled`: Reschedules 24h and 2h reminders to new start time and cancels stale reminder jobs.
    6. `booking_cancelled`: Cancels pending reminder jobs and sends cancellation summary.
    7. `refund_issued`: Notice of refund amount and timeframe.
    8. `no_show_followup`: Gentle re-booking invitation.
    9. `staff_alert_new_booking`: Live in-app alert and optional staff SMS.
- **Marketing Opt-Out Safeguard**:
  - Automatically respects customer `marketingConsent` flag: marketing messages to opted-out numbers are suppressed with status `SUPPRESSED` in `MessageLog`, while transactional booking notifications remain delivered.
- **Live In-App Notification Centre**:
  - Live bell popup with real-time unread badge counter in [`components/layout/app-shell.tsx`](file:///Users/khatayon/Booking-System/components/layout/app-shell.tsx).
  - Backed by `InAppNotification` database model and API routes `/api/dashboard/notifications` (GET and PATCH to mark individual or all notifications as read).
- **Verification & Acceptance**:
  - `tests/notifications.test.ts`: 13 comprehensive unit and integration tests verifying:
    1. Reminder rescheduling on appointment change and stale reminder cancellation.
    2. Strict idempotency (no message sent twice).
    3. Exponential backoff and retry count in MessageLog on gateway failure.
    4. GSM-7 vs Unicode detection and pesewas cost estimation.
    5. Marketing opt-out suppression.
    6. In-app notification creation and mark-as-read workflow.
    7. Manager role gating for template modification.
  - **Full Suite Status**: 15/15 Vitest test suites passing (137/137 tests); 0 TypeScript errors; 0 ESLint errors; Next.js production build succeeded with 73 routes.

