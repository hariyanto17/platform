# Planet Cinema Centralized Platform & Admin Portal

This is the centralized management system for Planet Cinema. It is designed to act as an admin hub governing multiple sub-applications (Consession retail POS and Ticketing cashiers).

## Project Structure

```text
planet-cinema-platform/
├── frontend/    # Next.js App Router UI and Design System (Phase 1)
└── backend/     # API Services (Placeholder - implementation in later phases)
```

## Phase 1 Frontend Foundation
The frontend is constructed using:
* **Framework**: Next.js App Router (v16.3.2)
* **Design System**: Custom design tokens integrated via Tailwind CSS v4 `@theme` directive in `globals.css`.
* **Icons**: Lucide React
* **Quality Gates**: Strict TypeScript settings and ESLint configs.

### Core Features
1. **App Shell**: Collapsible sidebar, responsive drawer for mobile, breadcrumb navigation, and user context headers.
2. **ThemeProvider**: Persisted (localStorage) Light, Dark, and System theme synchronizations with OS preferences.
3. **Reusable Primitives**: Buttons (with spinners), Inputs (with screen-reader associations), Select dropdowns, Status Badges, Cards, Tables, Modals, and feedback skeletons.
4. **Mock Dashboard**: Verification view of the design system components, showing status records of `consession` and `kasir-ticket` applications.
