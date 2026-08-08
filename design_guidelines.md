# Tiffin Service Website - Design Guidelines

## Design Approach
**Reference-Based Approach** drawing inspiration from food delivery leaders (Uber Eats, Zomato) for customer experience, Airbnb for seller listings, and Linear for dashboard interfaces. This creates a professional, trust-building platform that balances appetite appeal with operational efficiency.

## Core Design Elements

### A. Color Palette

**Light Mode:**
- Primary: 28 85% 55% (Warm orange-red, appetite-stimulating)
- Secondary: 140 45% 45% (Fresh green for vegetarian indicators)
- Accent: 45 95% 50% (Golden amber for premium/featured items)
- Neutral Base: 220 15% 96% (Soft warm gray background)
- Surface: 0 0% 100% (Pure white cards)
- Text Primary: 220 20% 15%
- Text Secondary: 220 15% 45%

**Dark Mode:**
- Primary: 28 75% 55%
- Secondary: 140 40% 50%
- Accent: 45 85% 55%
- Neutral Base: 220 25% 8%
- Surface: 220 20% 12%
- Text Primary: 220 15% 95%
- Text Secondary: 220 10% 65%

**Status Colors:**
- Success: 142 71% 45% (Confirmed bookings)
- Warning: 38 92% 50% (Pending approvals)
- Error: 0 84% 60% (Suspended/Cancelled)
- Info: 217 91% 60% (Notifications)

### B. Typography

**Font Stack:**
- Primary: 'Inter' via Google Fonts CDN (UI, body text, forms)
- Accent: 'Poppins' via Google Fonts CDN (headings, brand elements)

**Type Scale:**
- Hero Title: text-5xl md:text-6xl font-bold (Poppins)
- Section Heading: text-3xl md:text-4xl font-bold (Poppins)
- Card Title: text-xl font-semibold (Poppins)
- Body Large: text-lg font-normal (Inter)
- Body: text-base font-normal (Inter)
- Small: text-sm font-normal (Inter)
- Caption: text-xs font-medium (Inter)

### C. Layout System

**Spacing Units:** Primarily use tailwind units of 2, 4, 6, 8, 12, 16, 20, 24
- Component padding: p-4, p-6, p-8
- Section spacing: py-12, py-16, py-20
- Card gaps: gap-4, gap-6, gap-8
- Element margins: m-2, m-4, m-6

**Container Widths:**
- Max content: max-w-7xl
- Forms/Cards: max-w-2xl
- Dashboards: max-w-screen-2xl

**Grid Systems:**
- Tiffin Cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- Dashboard Stats: grid-cols-2 md:grid-cols-4 gap-4
- Seller Listings: grid-cols-1 lg:grid-cols-2 gap-8

### D. Component Library

**Navigation:**
- Sticky top nav with role-based menu items
- Logo left, navigation center, user menu right
- Mobile: Hamburger menu with slide-out drawer
- Active state: Border-bottom accent with primary color

**Hero Section (Customer Landing):**
- Full-width banner with appetizing food photography (80vh)
- Centered heading with search bar overlay
- Filter chips for Veg/Non-Veg/Jain below search
- Gradient overlay (from transparent to surface color) for text readability
- CTA buttons with backdrop-blur-md for glass effect

**Tiffin Cards:**
- Image top (aspect-ratio-4/3), rounded-t-xl
- Vegetarian indicator badge (top-right overlay)
- Title, seller name, category row
- Price prominent (text-2xl font-bold)
- Rating stars + delivery time icons
- "Book Now" primary button full-width at bottom
- Hover: Scale-105 transform, shadow-lg transition

**Dashboard Cards:**
- White/surface background with rounded-xl borders
- Icon + metric on left, trend indicator on right
- Subtle shadow, hover lifts with shadow-xl
- Color-coded borders for different metrics

**Booking Forms:**
- Multi-step indicator at top (stepper component)
- Single column layout, max-w-2xl centered
- Input groups with labels above, helper text below
- Date/time selectors with calendar dropdown
- Quantity stepper with +/- buttons
- Price summary card sticky on desktop (right sidebar)
- Submit button fixed bottom on mobile

**Seller Dashboard:**
- Sidebar navigation (left) with icon + text
- Main content area with header breadcrumbs
- Action buttons top-right (Add Tiffin primary button)
- Table view for bookings with sortable columns
- Status badges with appropriate colors
- Edit/Delete icon buttons on hover

**Admin Panel:**
- Dense data tables with search and filters
- Approve/Suspend action buttons inline
- Confirmation modals for destructive actions
- Statistics dashboard with 4-column metrics grid
- Charts using lightweight library (Chart.js via CDN)

**Forms (All Roles):**
- Consistent field spacing (mb-6)
- Input backgrounds: bg-white dark:bg-surface with borders
- Focus states: Ring-2 ring-primary
- Error states: Red border + error message below
- Success states: Green checkmark icon inline

**Modals/Dialogs:**
- Backdrop with bg-black/50
- Centered card with max-w-lg
- Close button top-right (X icon from Heroicons)
- Action buttons bottom-right (Cancel + Confirm)
- Slide-in animation (translate-y-4 to translate-y-0)

### E. Icons
Use **Heroicons** via CDN for all interface icons (outline for navigation, solid for actions)

## Images

**Hero Section:**
Large, high-quality food photography featuring traditional Indian tiffin meals. Image should showcase colorful, appetizing thali-style presentation with multiple compartments. Apply gradient overlay (from top: transparent, to bottom: surface color at 60% opacity) for text contrast.

**Tiffin Listing Cards:**
Each tiffin card requires a food photo (4:3 aspect ratio). Images should be well-lit, professional food photography showing the actual meal presentation. Rounded corners (rounded-t-xl) on card images only.

**Seller Profile:**
Optional shop/kitchen photo for seller pages to build trust and authenticity.

**Empty States:**
Illustrative icons or simple graphics for empty booking lists, no tiffins added yet, etc.

## Special Patterns

**Role-Specific Theming:**
- Admin: Subtle blue accent tints in dashboard
- Seller: Orange primary throughout
- Customer: Warmer, food-focused imagery

**Trust Indicators:**
- Verified seller badges
- Rating displays with star icons
- Number of successful orders shown
- Response time indicators

**Mobile Optimization:**
- Bottom tab navigation for customer app
- Swipeable tiffin cards on mobile
- Floating action button for quick booking
- Simplified forms with progressive disclosure

**Animations:**
Use sparingly - only for:
- Card hover states (scale + shadow)
- Page transitions (fade)
- Success confirmations (checkmark animation)
- Loading states (spinner)

This design creates a trustworthy, appetizing food service platform that clearly differentiates between user roles while maintaining visual consistency.