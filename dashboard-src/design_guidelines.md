# Design Guidelines: SEO Project Creation Dashboard

## Design Approach

**System Selected:** Material Design with Linear-inspired refinement
**Rationale:** This is a utility-focused, form-heavy productivity tool requiring clarity, efficiency, and professional polish. Material Design provides excellent patterns for complex forms and data input, while Linear's aesthetic adds modern refinement.

**Key Design Principles:**
- Information clarity over visual flair
- Progressive disclosure through multi-step wizard
- Immediate feedback for all user actions
- Scannable form layouts with clear hierarchy

## Typography

**Font Family:** Inter (primary), JetBrains Mono (code/URLs)

**Hierarchy:**
- Page Title: text-3xl font-semibold (36px)
- Step Headers: text-xl font-semibold (24px)
- Section Labels: text-sm font-medium uppercase tracking-wide (12px)
- Form Labels: text-sm font-medium (14px)
- Input Text: text-base (16px)
- Helper Text: text-sm (14px, secondary opacity)
- Button Text: text-sm font-medium (14px)

## Layout System

**Spacing Units:** Tailwind 2, 4, 6, 8, 12 units
- Component padding: p-6 to p-8
- Section spacing: space-y-6 to space-y-8
- Form field gaps: gap-4 to gap-6
- Page margins: px-8 to px-12

**Container Structure:**
- Max width: max-w-4xl for form content
- Wizard centered: mx-auto with py-12
- Two-column forms where appropriate: grid-cols-2 gap-6

## Component Library

### Core UI Elements

**Progress Indicator (Top):**
- Horizontal stepper with 5 steps
- Completed steps: filled circles with checkmarks
- Current step: larger circle with pulse effect
- Future steps: outlined circles
- Connecting lines between steps
- Step labels below circles

**Input Fields:**
- Height: h-11 for consistency
- Border: 1px solid with rounded-lg
- Focus state: 2px border with subtle shadow
- Placeholder: reduced opacity
- Icons: left-aligned within input (pl-10) for URL/search fields
- Error state: border change with error message below

**Multi-Input Components:**
- Keyword tags: Chip-style removable tags with × button
- Bulk textarea: min-h-32 with "Add" button below
- Competitor inputs: Add/remove dynamic rows with icon buttons

**Selection Controls:**
- Checkboxes: Custom styled, 20px size
- Radio groups: Horizontal layout for device type (Desktop/Mobile)
- Search engine toggles: Card-style multi-select with logos

**Buttons:**
- Primary: h-11 px-6 rounded-lg font-medium
- Secondary: outlined variant
- Text buttons: for "Skip" actions
- Icon buttons: 40px × 40px for add/remove actions

### Navigation

**Wizard Navigation (Bottom):**
- Fixed bottom bar or sticky component
- "Back" button (left, secondary style)
- "Next" button (right, primary style, prominent)
- "Save Draft" link (center, text style)
- Progress indicator (X of 5) near buttons

### Forms

**Step 1 - Project Details:**
- Project name input (full width)
- Website URL input with https:// prefix shown
- Country/Location dropdown with search
- Timezone selector

**Step 2 - Keywords:**
- Bulk textarea for keyword entry (one per line)
- Individual keyword input with "Add" button
- Tag display area showing added keywords as removable chips
- Keyword count indicator
- Category/folder selector (dropdown)

**Step 3 - Search Engines:**
- Grid of search engine cards (Google, Bing, Yahoo, etc.)
- Checkbox selection within each card
- Device type radio group per engine
- Location settings toggle

**Step 4 - Competitors:**
- 3-5 competitor URL input fields
- "Add competitor" button to expand more fields
- Remove button per field
- Helper text: "Track up to 10 competitors"

**Step 5 - Review:**
- Summary cards showing all entered data
- Edit buttons per section linking back to specific steps
- Confirmation message
- Final "Create Project" button (large, prominent)

### Data Displays

**Summary Cards:**
- Bordered containers with rounded-lg
- Section header with edit icon/button
- Key-value pairs in two columns
- Dividers between sections

### Overlays

**Validation Messages:**
- Inline error text below fields (text-sm)
- Toast notifications for successful actions (top-right)
- Modal for unsaved changes warning (centered, backdrop blur)

## Animations

**Minimal, purposeful only:**
- Step transitions: subtle slide fade (200ms)
- Button hover: slight scale (1.02)
- Focus states: border color transition (150ms)
- Tag removal: fade out (200ms)
- Progress bar: smooth width transition

## Images

**No hero image required** - This is a functional dashboard focused on form completion.

**Icons Required:**
- Search engine logos (Google, Bing, Yahoo) - use official brand icons
- Form field icons (globe for URL, tag for keywords, users for competitors)
- Check/cross marks for validation
- Plus/minus icons for add/remove actions
- Edit pencil icon for summary cards

Use Heroicons for all UI icons except brand logos.

## Page Structure

1. **Header Bar** (h-16): Logo/app name left, help icon right
2. **Progress Indicator** (py-8): Centered stepper
3. **Main Form Area** (max-w-4xl mx-auto): Current step content
4. **Navigation Footer** (h-20): Back/Next buttons with draft save option

**Overall Layout:** Single-column wizard flow, desktop-optimized (min-width 768px), vertical rhythm maintained with consistent py-8 between major sections.