# UX Specification - Corrective Exercise Toolkit

## Design System Reference
This specification is based on the Figma design system. For visual reference, see:
- Figma Design: https://www.figma.com/design/YY2vs80jSI2VMKS8DzlPek/Dise%C3%B1o-de-App-de-Movimiento

## Design Principles

### 1. Visual Hierarchy
- **Primary Actions**: Use blue-600/indigo-600 gradient for primary CTAs
- **Secondary Actions**: Outline buttons with slate borders
- **Information Hierarchy**: Clear typography scale (text-lg for headings, text-sm for body)
- **Content Sections**: White cards on slate-50/100 background

### 2. Color Palette
- **Primary**: Blue-600 to Indigo-600 gradient
- **Background**: Slate-50 to Slate-100 gradient
- **Surface**: White (bg-white)
- **Text Primary**: Slate-900
- **Text Secondary**: Slate-600
- **Text Muted**: Slate-400/500
- **Borders**: Slate-200
- **Success**: Green-500/600
- **Warning**: Yellow-500/600
- **Error**: Red-500/600
- **Info**: Blue-500/600

### 3. Typography
- **Headings**: Font weight 600-700, slate-900
- **Body**: Font weight 400, slate-600
- **Small Text**: text-xs, slate-500
- **Links**: Blue-600 with hover:blue-700

### 4. Spacing System
- **Container Padding**: px-4 sm:px-6 lg:px-8
- **Section Gaps**: gap-4, gap-6, gap-8
- **Card Padding**: p-4, p-6, p-8
- **Component Gaps**: gap-2, gap-3, gap-4

### 5. Component Patterns

#### Cards
- White background (bg-white)
- Rounded corners (rounded-xl)
- Border (border border-slate-200)
- Shadow: Subtle or none (rely on border)
- Padding: p-4 to p-8 depending on content

#### Buttons
- **Primary**: Blue gradient, white text, rounded-lg
- **Secondary**: Outline variant, slate border
- **Ghost**: Transparent, hover:bg-slate-100
- **Destructive**: Red variant for delete/stop actions
- Sizes: sm, default, lg

#### Badges
- Outline variant for tags/categories
- Solid variant for status indicators
- Small size (text-xs)

#### Inputs
- Border: border-slate-300
- Focus: ring-2 ring-blue-500
- Rounded: rounded-lg
- Padding: px-3 py-2

## Layout Structure

### 1. Header
- **Height**: h-16 (64px)
- **Background**: bg-white
- **Border**: border-b border-slate-200
- **Position**: sticky top-0 z-50
- **Content**: Logo, navigation, mobile menu
- **Max Width**: max-w-7xl mx-auto

### 2. Main Content Area
- **Container**: max-w-7xl mx-auto (or max-w-[1800px] for wide layouts)
- **Padding**: p-4 sm:p-6 lg:p-8
- **Background**: bg-slate-50 or bg-gradient-to-br from-slate-50 to-slate-100

### 3. Footer
- **Background**: bg-white or bg-slate-50
- **Border**: border-t border-slate-200
- **Padding**: py-8 to py-12
- **Content**: Links, copyright, legal info

## Section-Specific UX Patterns

### Home Page
- **Hero Section**: Large gradient background, centered content
- **Feature Cards**: Grid layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- **Stats Display**: Badge or number highlights
- **Navigation Cards**: Large clickable cards with icons

### Learn Section
- **Tab Navigation**: Horizontal tabs for patterns/assessments/exercises/conditions
- **Search Bar**: Prominent search with filter options
- **List/Grid Toggle**: Icons for list vs grid view
- **Detail View**: Full-width card with tabs for different content sections
- **Breadcrumbs**: Show navigation path

### Practice Section
- **Quiz Mode**: Question cards with multiple choice
- **Progress Indicator**: Progress bar or step indicator
- **Results View**: Score display with explanations
- **Clinical Cases**: Scenario cards with decision points

### Field Tools Section
- **Tool Cards**: Grid of tool options (Photo Analysis, Video Analysis, Questionnaires, etc.)
- **Form Layout**: Clean form design with sections
- **Body Map**: Interactive body diagram
- **Video Player**: Custom video controls with drawing tools
- **Timeline**: Slider-based timeline for video analysis

## Component Specifications

### Video Analysis Component
- **Video Container**: Aspect-video ratio, slate-900 background
- **Toolbar**: Vertical sidebar with drawing tools
- **Drawing Tools**: Select, Line, Angle, Circle, Rectangle, Arrow, Text, Eraser
- **Color Palette**: 7-color grid (Red, Blue, Green, Yellow, Purple, Pink, Cyan)
- **Drawing Modes**: Global (entire video) vs Timebound (2s range)
- **Controls**: Play/Pause, frame-by-frame, markers, loop, speed control
- **Timeline**: Slider with markers and loop range indicator
- **Keyboard Shortcuts**: Space (play/pause), Arrow keys (frame-by-frame), M (marker), Ctrl+Z (undo)

#### Observable layout behavior

- With no media loaded, the upload area remains visible and usable.
- With video loaded outside fullscreen, scrolling over the video reaches the controls below it.
- In fullscreen, the analysis fills the viewport; leaving fullscreen restores normal page scrolling and resets zoom/pan.
- The floating toolbar places Play/Still before Select, zoom controls, Fullscreen, and New (when present).
- The canvas only suppresses touch scrolling in fullscreen. See `.cursor/rules/video-photo-layout.md` and `.cursor/rules/floating-toolbar-video.md` for implementation constraints.

### Photo Analysis Component
- **Image Upload**: Drag-and-drop or file picker
- **Drawing Tools**: Similar to video analysis
- **Grid Overlay**: Optional grid for alignment
- **Export Options**: Download annotated image
- With an image loaded outside fullscreen, touch scrolling over the image reaches controls below it. Fullscreen fills the viewport and restores normal scrolling on exit.

### Questionnaires Component
- **Form Sections**: Collapsible sections with titles
- **Question Types**: Text, Yes/No, Textarea, Checkbox, Date, Body Map
- **Progress Indicator**: Show completion status
- **Save/Submit**: Clear action buttons
- **Send to Client**: Generate a form link clients can open on other devices and a QR code in
  the browser. Submissions email the coach address in the link.
- **Share**: Use the device share sheet for a completed summary and PDF when supported;
  otherwise copy the summary.

### Functional Scales Component
- **Scale Display**: Question list with radio options
- **Score Calculation**: Real-time score display
- **Results Interpretation**: Show score range and meaning
- **Send to Client and Share**: Use the same link, QR, and completed result sharing flows as
  questionnaires.

## Responsive Design

### Breakpoints
- **Mobile**: < 640px (sm)
- **Tablet**: 640px - 1024px (sm to lg)
- **Desktop**: > 1024px (lg+)

### Mobile Adaptations
- **Navigation**: Hamburger menu instead of horizontal nav
- **Grids**: Single column on mobile, multi-column on larger screens
- **Toolbars**: Collapsible or bottom sheet on mobile
- **Cards**: Full width on mobile, constrained on desktop
- **Text**: Smaller font sizes on mobile

### Tablet Adaptations
- **Grids**: 2 columns typically
- **Sidebars**: Can remain visible or collapsible
- **Forms**: 2-column layouts where appropriate

## Interaction Patterns

### Hover States
- **Buttons**: Slight scale or color change
- **Cards**: Subtle shadow increase or border color change
- **Links**: Color change (slate-600 to slate-900 or blue-600)

### Focus States
- **Inputs**: Ring-2 ring-blue-500
- **Buttons**: Ring-2 ring-blue-500
- **Keyboard Navigation**: Visible focus indicators

### Loading States
- **Skeleton Screens**: Placeholder content with shimmer
- **Spinners**: Centered spinner with text
- **Progress Bars**: For long operations

### Error States
- **Form Errors**: Red text below inputs
- **Data Errors**: Error message cards with retry option
- **Network Errors**: User-friendly error messages

### Success States
- **Form Submission**: Success message or redirect
- **Actions**: Brief confirmation (toast or inline message)

## Accessibility

### Keyboard Navigation
- **Tab Order**: Logical flow through interactive elements
- **Focus Indicators**: Visible focus rings
- **Shortcuts**: Documented keyboard shortcuts
- **Skip Links**: Skip to main content

### Screen Readers
- **ARIA Labels**: Proper labels for icons and buttons
- **Semantic HTML**: Use proper HTML elements
- **Alt Text**: Images have descriptive alt text
- **Live Regions**: Announce dynamic content changes

### Color Contrast
- **Text**: Minimum 4.5:1 contrast ratio
- **Interactive Elements**: Minimum 3:1 contrast ratio
- **Not Color-Only**: Don't rely solely on color for information

## Animation & Transitions

### Transitions
- **Hover**: transition-colors, transition-transform (150-200ms)
- **Page Transitions**: Fade or slide (if implemented)
- **Modal/Dialog**: Fade + scale (200-300ms)

### Animations
- **Loading**: Subtle pulse or spin
- **Success**: Brief scale or fade
- **Error**: Shake or highlight

## Icon System
- **Library**: Lucide React
- **Size**: w-4 h-4 (small), w-5 h-5 (medium), w-6 h-6 (large)
- **Color**: Inherit from text color or explicit slate/blue colors
- **Usage**: Consistent icon usage across similar actions

## Design Tokens (Tailwind Classes)

### Spacing
- xs: 0.5rem (8px)
- sm: 0.75rem (12px)
- base: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)
- 2xl: 3rem (48px)

### Border Radius
- sm: 0.25rem (4px)
- base: 0.5rem (8px)
- lg: 0.75rem (12px)
- xl: 1rem (16px)
- 2xl: 1.5rem (24px)

### Shadows
- Default: Subtle border instead of shadow
- When needed: shadow-sm or shadow-md

## Implementation Notes

### Component Library
- UI components in `src/components/ui/` (Button, Badge, Slider, Sheet, etc.)
- Based on Radix UI primitives with Tailwind styling
- Custom components follow same design patterns

### Responsive Utilities
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`
- Mobile-first approach: base styles for mobile, add larger breakpoints

### Dark Mode
- Not currently implemented
- Structure should support future dark mode (use CSS variables if needed)

## Figma Integration

### Accessing Design
- **Figma File**: https://www.figma.com/design/YY2vs80jSI2VMKS8DzlPek/Dise%C3%B1o-de-App-de-Movimiento
- **MCP Server**: Use Figma MCP tools to get design context
- **Export**: Can export assets from Figma when needed

### Design Sync
- Use Figma as source of truth for visual design
- Implement designs in code following this spec
- Reference Figma for spacing, colors, and component details

## Quality Checklist

When implementing UI components:
- [ ] Matches Figma design (spacing, colors, typography)
- [ ] Responsive on mobile, tablet, desktop
- [ ] Proper hover and focus states
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] Loading and error states implemented
- [ ] Consistent with design system
- [ ] Uses existing UI components when possible

