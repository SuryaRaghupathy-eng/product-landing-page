# Map Coordinate Navigator - Design Guidelines

## Design Approach

**Selected Approach**: Design System (Material Design-inspired) with Google Maps/Mapbox reference patterns

**Rationale**: This is a utility-focused application where precision, clarity, and ease of use are paramount. Following established mapping interface conventions ensures users can quickly understand and use the tool without learning new patterns.

## Core Design Elements

### Typography
- **Primary Font**: Inter or Roboto via Google Fonts CDN
- **Hierarchy**:
  - Input labels: 14px, medium weight (500)
  - Coordinate values: 16px, regular weight (400), monospace for numbers
  - Helper text: 12px, regular weight (400)
  - Map controls: 14px, medium weight (500)

### Layout System
**Spacing Units**: Use Tailwind units of 2, 4, 6, and 8 consistently
- Component padding: p-4 or p-6
- Section gaps: gap-4
- Button spacing: px-6, py-3
- Form field spacing: space-y-4

**Grid Structure**:
- Full-screen layout with sidebar + map split
- Desktop: Sidebar (w-80 to w-96), Map (flex-1)
- Tablet/Mobile: Stack vertically, sidebar collapses to top panel

### Component Library

#### 1. Application Shell
- Full viewport height (h-screen)
- Flex layout: sidebar (fixed width) + map container (flexible)
- No traditional header needed - controls integrated into sidebar

#### 2. Coordinate Input Panel (Sidebar)
**Structure**:
- Fixed width sidebar (320-384px on desktop)
- Sticky positioning at top
- Sections with clear visual separation using borders or spacing

**Elements**:
- Application title/logo at top (text-xl, font-semibold, mb-6)
- Coordinate input form:
  - Two input fields for Latitude and Longitude
  - Clear labels with degree symbols (°)
  - Input fields: full width, h-12, rounded-lg, border
  - Placeholder examples: "e.g., 40.7128" format
- Submit button: full width, h-12, rounded-lg, prominent styling
- Current location display section showing active coordinates
- Map center coordinates display (read-only, monospace font)
- Clear/reset button below form

**Spacing**: p-6 for panel padding, space-y-4 between form elements

#### 3. Map Container
- Fills remaining viewport space (flex-1)
- Position relative for overlaid controls
- Map library container (e.g., Leaflet, Mapbox GL)

**Map Controls** (overlaid on map):
- Zoom controls: Positioned top-right or bottom-right
  - Vertical stack of buttons
  - Size: w-10 h-10 each
  - Rounded: rounded-lg
  - Spacing: space-y-2
  - Icons: Plus/Minus from Heroicons
- Location marker: Custom pin icon at coordinates
- Coordinate tooltip: Shows lat/lng on hover, positioned above marker

#### 4. Form Inputs
- Border style: border-2 when focused, border when default
- Height: h-12 for all inputs
- Padding: px-4
- Border radius: rounded-lg
- Font: Font size 16px to prevent mobile zoom

#### 5. Buttons
**Primary Button** (Navigate/Search):
- Full width in sidebar
- Height: h-12
- Padding: px-6
- Border radius: rounded-lg
- Font weight: medium (500)
- Icon + text combination (map pin icon from Heroicons)

**Secondary Button** (Clear/Reset):
- Same dimensions as primary
- Visual distinction through border treatment

**Map Control Buttons**:
- Square: w-10 h-10
- Rounded: rounded-lg
- Center-aligned icons
- Subtle shadow for depth

#### 6. Status Indicators
- Success state: Green-tinted border on inputs after successful navigation
- Error state: Red-tinted border for invalid coordinates
- Loading state: Spinner overlay on map during navigation
- Error messages: text-sm, below relevant input field

#### 7. Map Marker
- Custom SVG pin icon (from Heroicons "MapPin")
- Size: 40x40px
- Animated drop-in effect when navigating to new coordinates
- Pulse animation on initial placement

### Responsive Behavior

**Desktop (lg:)**
- Side-by-side layout: sidebar (fixed) + map (flex)
- All controls visible

**Tablet (md:)**
- Sidebar width reduced to w-72
- Maintain side-by-side if space permits
- Otherwise stack vertically

**Mobile (base):**
- Full vertical stack
- Sidebar becomes collapsible drawer or top panel
- Panel height: max-h-64 when open
- Map takes remaining viewport
- Touch-friendly tap targets (min h-12)

### Interaction Patterns

- Coordinate input validates on blur
- Enter key submits form
- Map pans smoothly to coordinates (animated transition)
- Marker appears with subtle drop animation
- Double-click map to copy coordinates to clipboard
- URL updates with current coordinates for sharing

### Icons
**Library**: Heroicons via CDN

**Required Icons**:
- `MapPinIcon`: Location marker in inputs and on map
- `MagnifyingGlassIcon`: Search/navigate button
- `XMarkIcon`: Clear button
- `PlusIcon`: Zoom in
- `MinusIcon`: Zoom out
- `ArrowPathIcon`: Reset view

### Accessibility
- All inputs have associated labels
- Focus visible states for keyboard navigation
- ARIA labels for map controls
- Color contrast meets WCAG AA standards
- Screen reader announcements for coordinate navigation
- Keyboard shortcuts: Enter to submit, Escape to clear

### Map Library Integration
Use Leaflet.js or Mapbox GL JS via CDN. Maintain clean integration with:
- Tile layer for base map (OpenStreetMap or Mapbox)
- Custom marker styling matching overall design
- Zoom controls hidden (use custom controls)

This utility-focused design prioritizes clarity, precision, and ease of use while maintaining a clean, modern aesthetic appropriate for a mapping tool.