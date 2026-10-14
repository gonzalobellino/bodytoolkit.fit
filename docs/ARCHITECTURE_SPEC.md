# Architecture Specification - Corrective Exercise Toolkit

## Overview
The Corrective Exercise Toolkit is a Progressive Web App (PWA) built with React 19, TypeScript, and Tailwind CSS. Video, photo, pose, catalogs, and UI state run in the browser. Content ships as static JSON under `public/data/`. There is no database. Vercel serverless functions in `api/` handle email through Resend (contact, notify-me, and form results).

**SECURITY CRITICAL**: React 19 is mandatory due to serious security vulnerabilities in React 18. Never downgrade to React 18.

## Technology Stack

### Core Technologies
- **React 19.2.0**: UI library (REQUIRED - React 18 has serious security vulnerabilities)
- **TypeScript 5.0+**: Type safety
- **Vite 8.3.4**: Build tool and dev server
- **Tailwind CSS v4**: Styling
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library

### Security Requirements

**CRITICAL**: React 19 is mandatory for security reasons. React 18 and earlier versions contain serious security vulnerabilities that have been fixed in React 19.

- **Minimum Version**: React 19.2.0 (or latest 19.x)
- **react-dom**: Must match React version (19.2.0+)
- **@types/react**: Must be 19.0.0+ for TypeScript support
- **Never Downgrade**: Under no circumstances should React be downgraded to version 18 or earlier
- **Dependency Compatibility**: All React-related packages must be compatible with React 19

**Verification**: Always check `package.json` contains:
```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0"
  }
}
```

### Key Dependencies
- **React Router**: Not used (custom navigation via state)
- **State Management**: React hooks (useState, useReducer)
- **Form Handling**: react-hook-form
- **Charts**: Recharts
- **PDF Generation**: jsPDF
- **Date Picker**: react-day-picker

## Project Structure

```
corrective-toolkit/
├── src/
│   ├── App.tsx                 # Main app component, routing logic
│   ├── main.tsx                # React entry point
│   ├── app.css                 # Global styles
│   ├── components/             # React components
│   │   ├── HomePage.tsx
│   │   ├── LearnSection.tsx
│   │   ├── PracticeSection.tsx
│   │   ├── FieldToolsSection.tsx
│   │   ├── PatternDetail.tsx
│   │   ├── AssessmentDetail.tsx
│   │   ├── ExerciseDetail.tsx
│   │   ├── ConditionDetail.tsx
│   │   ├── QuizMode.tsx
│   │   ├── EvaluationMode.tsx
│   │   ├── VideoAnalysis.tsx
│   │   ├── PhotoAnalysis.tsx
│   │   ├── VisualAssessment.tsx
│   │   ├── Questionnaires.tsx
│   │   ├── FunctionalScales.tsx
│   │   ├── AboutPage.tsx
│   │   ├── ContactPage.tsx
│   │   ├── LegalPage.tsx
│   │   ├── Footer.tsx
│   │   └── ui/                  # Reusable UI components
│   │       ├── button.tsx
│   │       ├── badge.tsx
│   │       ├── slider.tsx
│   │       ├── sheet.tsx
│   │       └── ...
│   ├── hooks/                   # Custom React hooks
│   │   ├── useVideoPlayer.ts
│   │   ├── useVideoRecording.ts
│   │   ├── useCanvasDrawing.ts
│   │   └── useCamera.ts
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts
│   └── utils/                   # Utility functions
│       └── dataLoader.ts
├── public/
│   ├── data/                    # JSON data files
│   │   ├── patterns.json
│   │   ├── assessments.json
│   │   ├── exercises.json
│   │   ├── conditions.json
│   │   ├── clinical-cases.json
│   │   ├── quizTopics.json
│   │   ├── glossary.json
│   │   ├── client-questionnaire.json
│   │   ├── physical-activity-readiness.json
│   │   ├── lefs.json
│   │   └── uefi.json
│   ├── manifest.json            # PWA manifest
│   └── images/                  # Static images
├── dist/                        # Build output
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

## Architecture Patterns

### 1. Application Entry Point

#### `main.tsx`
- Renders React app to DOM
- Sets up root element

#### `App.tsx`
- **State Management**: Manages current section (home, learn, practice, field, about, contact, legal)
- **Data Loading**: Loads all JSON data on mount via `loadAllData()`
- **Routing**: Custom routing via state (no React Router)
- **Code Splitting**: Lazy loads route-level components
- **Error Handling**: Handles data loading errors gracefully

### 2. Data Layer

#### Data Loading (`utils/dataLoader.ts`)
- **Async Functions**: Each data type has its own loader function
- **Error Handling**: Returns empty arrays/objects on error
- **Type Safety**: Functions return typed data matching TypeScript interfaces
- **Form Validation**: Questionnaire and scale JSON is checked at runtime by `utils/formGuards.ts` before either the application catalog or a shared client link uses it. Invalid form data is rejected and shown as unavailable on client links.
- **Parallel Loading**: `loadAllData()` loads all data in parallel using `Promise.all()`

#### Data Flow
1. App mounts → `useEffect` calls `loadAllData()`
2. Data loaded → Stored in `App` component state
3. Data passed down → Via props to child components
4. No global state → Data flows down, events flow up

### 3. Component Architecture

#### Component Hierarchy
```
App
├── HomePage
│   └── (Feature cards, stats)
├── LearnSection
│   ├── (Tabs: patterns, assessments, exercises, conditions)
│   ├── PatternDetail
│   ├── AssessmentDetail
│   ├── ExerciseDetail
│   └── ConditionDetail
├── PracticeSection
│   ├── QuizMode
│   └── EvaluationMode
├── FieldToolsSection
│   ├── VideoAnalysis
│   ├── PhotoAnalysis
│   ├── VisualAssessment
│   ├── Questionnaires
│   └── FunctionalScales
└── Footer
```

#### Component Patterns

**Page Components** (HomePage, LearnSection, etc.)
- Receive data via props
- Handle navigation via callbacks
- Manage local UI state (tabs, filters, etc.)
- Render child components

**Detail Components** (PatternDetail, AssessmentDetail, etc.)
- Display full information about a single item
- Receive item data via props
- Handle back navigation
- May render related items (exercises, assessments, etc.)

**Feature Components** (VideoAnalysis, PhotoAnalysis, etc.)
- Complex interactive features
- Use custom hooks for logic
- Manage their own state
- May use canvas, video, or other advanced APIs

### 4. Custom Hooks

#### `useVideoPlayer`
- Manages video playback state
- Handles play, pause, seek, frame-by-frame
- Manages markers and loops
- Provides formatted time strings

#### `useVideoRecording`
- Handles webcam access
- Records video with countdown
- Returns blob and URL for recorded video

#### `useCanvasDrawing`
- Manages canvas drawing state
- Handles different drawing tools (line, angle, circle, etc.)
- Supports time-bound vs global drawings
- Provides undo/redo functionality

#### `useCamera`
- Wraps camera API access
- Handles permissions
- Provides camera stream

### 5. Type System

#### Type Definitions (`types/index.ts`)
- **Interfaces**: Define structure for all data types
- **Exports**: All types exported for use across app
- **Validation**: JSON must match these interfaces
- **Optional Fields**: Marked with `?` for optional properties

#### Type Usage
- **Component Props**: All components have typed props interfaces
- **Function Parameters**: All functions have typed parameters
- **Return Types**: All functions have explicit return types
- **No `any`**: Avoid `any` type, use `unknown` with type guards if needed

### 6. State Management

#### Local Component State
- **useState**: For simple local state
- **useReducer**: For complex state logic (if needed)
- **State Lifting**: Lift state up when multiple components need it

#### Data State
- **Loaded Once**: Data loaded in App component on mount
- **Passed Down**: Data passed via props
- **No Mutations**: Data is read-only, components don't mutate it
- **Derived State**: Components compute derived data from props

#### No Global State Library
- No Redux, Zustand, or similar
- State managed via React hooks
- Consider adding if complexity grows

### 7. Styling Architecture

#### Tailwind CSS
- **Utility Classes**: Use Tailwind utilities directly
- **Responsive**: Mobile-first with breakpoint prefixes
- **Design System**: Consistent spacing, colors, typography
- **Custom Classes**: Minimal custom CSS, prefer Tailwind

#### Component Styling
- **Inline Classes**: Tailwind classes in JSX
- **Conditional Classes**: Use `clsx` or `cn` utility
- **No CSS Modules**: Not used
- **No Styled Components**: Not used

### 8. Build & Development

#### Vite Configuration (`vite.config.ts`)
- **React Plugin**: SWC for fast compilation
- **Path Aliases**: `@` alias for `src/` directory
- **HTTPS**: Configured for camera access via `conf/certs/` (umbrel.local certs)
- **Code Splitting**: Manual chunks for app sections; vendor modules are not split manually
- **Public Directory**: `public/` served at root
- **MediaPipe Interop**: Vite 8's Rolldown build needs a named `Pose` export from MediaPipe's global script. The build-only transform exposes that existing global for `@tensorflow-models/pose-detection`.

#### Development Server
- **Port**: 5173
- **Host**: 0.0.0.0 (all interfaces)
- **HMR**: Hot module replacement enabled
- **HTTPS**: Optional for camera access

#### Production Build
- **Output**: `dist/` directory
- **Optimization**: Minification, tree-shaking
- **Code Splitting**: Automatic + manual chunks
- **Static Assets**: Copied to dist
- **CI Type Check**: `npm run typecheck` runs strict TypeScript checking before the production build.

### 9. PWA Features

#### Manifest (`public/manifest.json`)
- App metadata
- Icons
- Display mode
- Theme colors

#### Service Worker
- Implemented. `src/main.tsx` registers `/service-worker.js`.
- `vite-plugin-pwa` generates that worker with Workbox (`generateSW` in `vite.config.ts`), including in dev (`devOptions.enabled`).
- The production file is `dist/service-worker.js`. `public/service-worker.js` is a handwritten worker in the repo; the plugin output is what the production build emits under the same name.

## Data Flow Patterns

### Loading Data
```
App.tsx (mount)
  → loadAllData()
    → Promise.all([loadPatterns(), loadAssessments(), ...])
      → fetch('/data/*.json')
        → JSON.parse()
        → runtime validation for questionnaires and scales
            → setData()
              → Pass to components via props
```

### User Interaction
```
User Action
  → Component Event Handler
    → Update Local State OR
    → Call Parent Callback (onNavigate, onBack, etc.)
      → Parent Updates State
        → Re-render with New State
```

### Navigation
```
User Clicks Navigation
  → onNavigate('section')
    → setCurrentSection('section')
      → renderSection() switch
        → Lazy load component
          → Render with data props
```

## Performance Optimizations

### Code Splitting
- **Route-Level**: Lazy load major sections
- **Vendor Chunks**: Separate React, Radix UI, etc.
- **Manual Chunks**: Group related components

### React Optimizations
- **React.memo**: Use for expensive components (if needed)
- **useMemo**: Memoize expensive computations
- **useCallback**: Memoize callback functions (if needed)
- **Lazy Loading**: Already implemented for routes

### Data Loading
- **Parallel Loading**: All data loaded in parallel
- **Error Resilience**: Graceful degradation on missing data
- **No Re-fetching**: Data loaded once on mount

## Security Considerations

### Browser logic and serverless email
- There is no database. Analysis and catalog logic stay in the browser.
- `api/` runs server-side email handlers (Resend). It does not store clients, videos, or catalog data.
- Catalog JSON is public. There is no authentication.

### Input Validation
- Form validation via react-hook-form
- TypeScript type checking
- Runtime shape guards for questionnaire and scale JSON; build-time catalog validation via `npm run check:data`

### Camera Access
- Requires HTTPS or localhost
- User permission required
- No data stored, only temporary blobs

## Testing Strategy

### Unit Testing
- Not currently implemented
- Could test utility functions
- Could test custom hooks

### Component Testing
- Not currently implemented
- Could use React Testing Library
- Test component rendering and interactions

### Integration Testing
- Not currently implemented
- Could test data loading
- Could test navigation flow

### Manual Testing
- Currently primary testing method
- Test all features manually
- Test on different devices/browsers

## Deployment

### Build Process
```bash
npm run build  # from project root
```
- Creates optimized production build in `dist/`
- Static files ready to serve

### Serving
- **Development**: `npm run dev` from root - Vite dev server with HTTPS (if `conf/certs/` present)
- **Production**: Static `dist/` (e.g. Vercel or any static host)
- **PWA**: Can be installed on devices

### Environment
- The serverless email handlers require `RESEND_API_KEY`.
- Contact and notify-me also require `NOTIFY_ME_TO_EMAIL`. Form results are sent only to the
  `coachEmail` entered in the "Results will be sent here" field when creating a client form link.
- Form results optionally use `RESEND_FROM_EMAIL`; see `api/send-form-results.js`.
- The client reads optional `VITE_PREMIUM_PAYMENTS_ENABLED`, `VITE_SHOW_TPI_LEVEL1_BADGE`, and `VITE_SHOW_TPI_LEVEL2_BADGE` feature settings from `src/config/env.ts`.
- The client reads optional `VITE_CONTACT_EMAIL` for mailto links.
- A static-only host can serve the app, but the email forms require the Vercel functions or equivalent endpoints.

## Future Considerations

### Potential Improvements
1. **State Management**: Consider Zustand if state becomes complex
2. **Routing**: Consider React Router if navigation becomes complex
3. **Testing**: Add unit and integration tests
4. **Offline Coverage**: Verify and extend existing service worker behavior where needed
5. **Persistent Storage**: Add only if user data storage becomes a product requirement
6. **Authentication**: If user accounts needed
7. **API Integration**: If external data sources needed

### Scalability
- **Component Library**: Can grow with more UI components
- **Data Structure**: JSON files can grow, but consider database if very large
- **Code Organization**: Current structure supports growth
- **Performance**: Monitor bundle size, add more code splitting if needed

## Best Practices

### Code Organization
- One component per file
- Related components in same directory
- Shared utilities in `utils/`
- Types centralized in `types/`

### Naming Conventions
- **Components**: PascalCase (HomePage.tsx)
- **Hooks**: camelCase with `use` prefix (useVideoPlayer.ts)
- **Utilities**: camelCase (dataLoader.ts)
- **Types**: PascalCase (Pattern, Assessment)
- **Files**: Match export name

### TypeScript Usage
- Strict mode enabled
- No `any` types
- Explicit return types
- Interface for all props
- Type all function parameters

### Error Handling
- Try-catch for async operations
- Graceful degradation
- User-friendly error messages
- Console logging for debugging

## Architecture Decisions

### Why No React Router?
- Simple navigation needs
- Custom routing is sufficient
- Reduces bundle size
- Can add later if needed

### Why No Global State?
- Data flows down naturally
- No complex state sharing
- Simpler architecture
- Can add Zustand/Redux later if needed

### Why JSON Files?
- No backend needed
- Easy to edit
- Version control friendly
- Fast loading
- Can migrate to database later

### Why Custom Hooks?
- Reusable logic
- Testable
- Clean component code
- Follows React best practices

## References
- React Documentation: https://react.dev
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- Vite Documentation: https://vitejs.dev
- Tailwind CSS: https://tailwindcss.com
- Radix UI: https://www.radix-ui.com

