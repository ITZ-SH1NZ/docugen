# PROMPT: Full UI Revamp — "DocuGen" Document Automation Platform

## Context
I have a working full-stack app (Next.js App Router + TypeScript, Supabase Auth/Postgres/Storage with RLS, a `pdf-lib` generation engine, and a `react-konva` template editor). Batches generate in-process via `after()`. **Do not change the backend, data model, API routes, RLS, engine, or generation flow.** This is a **complete visual overhaul of the frontend** to match the attached mockup, plus the new screens it introduces (landing, dashboard, multi-step wizards, assets, settings).

The current UI is a dark, utilitarian theme — **replace it entirely** with the clean, light, professional SaaS aesthetic below.

## Tech & approach
- Keep Next.js App Router + TypeScript. Add **Tailwind CSS** and **shadcn/ui** (Radix primitives) + **lucide-react** icons. Use **Framer Motion** for subtle transitions.
- Build a reusable component library first, then assemble screens from it.
- Preserve all existing routes/behavior; only swap presentation. Map mockup names to existing concepts: **Generations = batches**, **Templates = templates**, the generation wizard wraps the existing generate→progress→review flow.
- Fully responsive (mobile→desktop), keyboard accessible, WCAG AA contrast.

---

## DESIGN SYSTEM

### Brand
- Product name **DocuGen**, logo = rounded-square blue gradient mark + wordmark. Friendly, trustworthy, modern.

### Color tokens (light theme)
- `--primary` #2563EB, `--primary-hover` #1D4ED8, `--primary-soft` #EFF6FF (active nav / selected)
- `--accent` #3B82F6 (highlighted hero words)
- `--bg` #FFFFFF, `--canvas` #F8FAFC (app shell behind cards), `--muted` #F3F4F6
- `--border` #E5E7EB, `--border-strong` #D1D5DB
- `--text` #111827, `--text-secondary` #6B7280, `--text-muted` #9CA3AF
- Success #16A34A on #DCFCE7 · Warning #D97706 on #FEF3C7 · Error #DC2626 on #FEE2E2 · Info/blue #2563EB on #EFF6FF
- Field-overlay: stroke #2563EB, fill rgba(37,99,235,0.12), selected stroke 2px + ring

### Typography
- UI font: **Inter** (or Geist). Document/certificate preview font: **Playfair Display** (serif). Batch IDs / code: a mono font.
- Scale: display 36/44 bold (hero), h1 24/32, h2 20/28, h3 16/24 semibold, body 14/20, small 12/16, label 12 medium uppercase-tracking for table headers.

### Shape, elevation, spacing
- Radius: cards/inputs 12px, buttons 8px, pills/badges full. 
- Shadows: card `0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)`; elevated/popover a softer larger shadow.
- 4px spacing grid; generous whitespace; max content width ~1200px; comfortable card padding (20–24px).

### Core components (build these)
Button (primary / secondary-outline / ghost / danger / icon), Input, Select/Dropdown, Checkbox, Tabs, Badge & status pill, Card, StatCard (icon + number + label + trend chip), Table (header row, hover, row actions, sortable, empty state), SearchBar + FilterSelect, **Dropzone** (dashed border, cloud icon, "Browse Files", format hint), **FileChip** (icon + name + size + ✓/✕), **HorizontalStepper** and **VerticalStepper** (states: completed=check, active=filled blue, pending=gray), **CircularProgress**, Toast, Modal/Dialog, Avatar, Tooltip, Sidebar nav item (icon+label, active = soft-blue bg + blue text). Reuse everywhere for consistency.

---

## SCREENS

### 1. Landing (`/`)
Top nav: logo + links (Features, Templates, Pricing, Resources▾) + "Log in" (ghost) + "Sign up" (primary). Announcement pill above hero: "✨ New: AI field detection is here. Try it now →". Hero (left): display heading **"Generate Thousands of Personalized Documents in `Minutes`"** ("Minutes" in `--accent`), supporting paragraph, 3 checklist items (check icon + "No design skills required", "Smart text fitting & quality checks", "Export, review & download"), CTAs "Get Started Free" (primary) + "View Demo" (secondary), "No credit card required". Hero (right): layered preview of a certificate template + a data table + floating green "1,245 Documents Generated" badge. Below: "Trusted by 10,000+ organizations" + grayscale logo row. A **Key Features** section (6 cards, icon + title + one-liner): Smart Text Fitting, Quality Checks, Bulk Generation, Multiple Field Types, Export & Download, Secure & Private. Footer.

### 2. Auth (`/login`, `/signup`)
Centered narrow card on `--canvas`. Logo top. Title "Create your account" / "Welcome back", subtitle "Start your free trial. No credit card required." OAuth buttons stacked: Continue with Google / Microsoft / Email (outline, brand glyph left). Fine print "By continuing, you agree to Terms & Privacy." Link to switch login/signup. (Wire to existing Supabase email auth; OAuth buttons can be present even if only email is enabled now.)

### 3. Dashboard (`/dashboard`)
**App shell**: left sidebar (logo, nav: Dashboard, Templates, Generations, Assets, Settings; pinned bottom: Help & Support; user avatar). Top bar with greeting **"Good morning, {firstName} 👋"** + subtitle + "+ New Template" (primary). Row of 4 **StatCards**: Total Templates, Documents Generated, This Month, Flagged Documents (each: icon, big number, small trend/▲ chip). "Recent Templates" card with "View all →": list rows = template icon + name + "edited X ago" + document count + issue-count badge.

### 4. Create Template → Upload (`/templates/new`)
HorizontalStepper: **Upload · Design · Fields · Save** (Upload active). Large Dropzone "Drop your PDF or Image here / Browse Files / Supports: PDF, PNG, JPG (Max 50MB)". On upload show FileChip ("certificate_template.pdf · 2.4 MB · ✕"). Continue advances to editor.

### 5. Editor → Design Fields (`/templates/[id]/edit`)
Header: ← Back · "Design Template" · "Save Template" (primary). **Left tool rail** (vertical icons + labels): Text, Image, QR Code, Barcode, Rectangle. **Center canvas**: the `react-konva` document with numbered field overlays (selected = blue, ring, label tag). **Right panel** with tabs **Fields / Properties**. Properties form for selected field: name input, Type (select), Page (select), Required (checkbox), Font (select, e.g. Playfair Display), Weight, Size Range (min–max px), Alignment (segmented), Color (swatch + hex), **Delete Field** (danger). Bottom-left zoom controls (− 100% + , pan/hand). *(Keep existing field schema/coords; QR/Barcode/Image can be visually present but flagged "coming soon" if not yet wired.)*

### 6–9. Generation wizard (`/generate`, `/batches/[id]`)
**VerticalStepper** down the left for all steps: Template · Import Data · Map Fields · Preview · Generate (checkmarks as you go).
- **6. Import Data**: "Import your data" + Dropzone for CSV, FileChip "data.csv · 12.4 KB ✓", Tips box ("First row = headers", "CSV UTF-8"). Next.
- **7. Map Fields**: "Map your fields / We've auto-mapped the columns. Please review." Two-column mapping rows: **Template Field → CSV Column** (select per row). Back / Next.
- **8. Preview**: "Preview Document" with a row paginator (1 of N, ‹ ›), live certificate render with real data, right-side **Quality Check** panel (green "Looks Good! / No issues found" or list of issues) + a Data panel of field values. Next.
- **9. Generate**: "Generating Documents / Please don't close this window." Large **CircularProgress** with % and "850 / 1,245" — bind to existing SSE progress.

### 10. Results (`/batches/[id]` completed)
"Generation Complete! 🎉 / Your documents are ready." Four StatCards: **Generated**, **Successful** (green), **Warnings** (amber), **Errors** (red). Buttons "Download All (ZIP)" (primary) + "Download Report" (outline). **Issue Summary** card with "View all": rows Text Shrunk / Text Wrapped / Text Truncated each with colored icon + "{n} documents".

### 11. Review Flagged Document (`/batches/[id]/review/[row]`)
Header: ← Back · "Row 24 of 1,245" · Previous / Next. Left: large document preview with the offending text highlighted red. Right: **Issues** list (red icon, "Text Shrunk", "Field: Participant Name — Text shrunk from 24pt to 10pt to fit in the box"). **Fix Options** as stacked buttons: Increase Box Width, Allow Text Wrap, Reduce Font Size Range, Ignore This Issue. Bottom: "Regenerate This Document" (primary) + "Mark as Reviewed" (outline). Wire regenerate to existing edit/regenerate route.

### 12. Templates list (`/templates`)
Title + "Manage your document templates." Toolbar: SearchBar + "All Templates" FilterSelect + "+ New Template". **Table**: Template (icon+name) · Last Edited · Documents · Issues (colored count) · Actions (👁 view, ⋯ menu: Edit/Generate/Duplicate/Delete). Hover rows, empty state.

### 13. Generations list (`/batches`)
Title + "Track all your document generation batches." SearchBar (by template or batch ID) + "All Status" filter. **Table**: Batch ID (mono) · Template · Date · Documents · **Status pill** (Completed green / Processing blue / Failed red) · Actions (download, view). 

*(Also create simple, on-brand **Assets** and **Settings** pages consistent with the shell — placeholders are fine, clearly scaffolded.)*

---

## STATES, MOTION, QUALITY
- Every list/table/dropzone needs **loading (skeletons), empty, and error** states.
- Status & issue colors must be consistent everywhere (shrunk=amber, wrapped=blue, truncated/error=red, success=green).
- Subtle motion only: 150–200ms ease transitions, stepper progress, progress ring animation, toast slide-in, dialog fade/scale. No gratuitous animation.
- Responsive: sidebar collapses to a drawer on mobile; tables become stacked cards or horizontally scroll; wizards stack vertically.
- Accessibility: visible focus rings, labelled inputs, keyboard-navigable menus/dialogs, aria on steppers/progress.

## DELIVERABLES
1. Tailwind config + theme tokens + global styles implementing the system above.
2. The shared component library (section "Core components").
3. All screens 1–13 + Assets/Settings, wired to existing routes/data where applicable, with realistic loading/empty/error states.
4. Replace the current dark theme entirely; keep all existing functionality working.
