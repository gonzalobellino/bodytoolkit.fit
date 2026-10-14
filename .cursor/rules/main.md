# Cursor Rules for Corrective Exercise Toolkit

## Architecture

Do not restate stack, repo layout, or the service worker here. The normative description is [`docs/ARCHITECTURE_SPEC.md`](../../docs/ARCHITECTURE_SPEC.md). There is no application backend. React 19 is required. Never downgrade to React 18.

## Security Requirements

### React Version
- **MANDATORY**: Use React 19.2.0 or later (minimum version: 19.2.0)
- **FORBIDDEN**: Never use React 18 or earlier versions
- **Version Constraint**: React version MUST be `>= 19.2.0` in `package.json`
- **Reason**: React 18 contains serious security vulnerabilities that are fixed in React 19
- **Verification**: Always check `package.json` has `"react": "^19.2.0"` and `"react-dom": "^19.2.0"` (or exact version `>= 19.2.0`)
- **Dependencies**: Ensure all React-related packages are compatible with React 19
- **Package Lock**: Never accept or install React versions below 19.2.0, even if suggested by package managers

### Package Updates
- Always use the latest secure versions of dependencies
- Check for security advisories before adding new packages
- Prefer packages with active maintenance and security updates

## Core Development Principles

### 1. Separation of Concerns
- **Data Layer**: All business data lives in JSON files in `public/data/`
- **Logic Layer**: Business logic in reusable modules/services/hooks
- **Presentation Layer**: React components only render data and handle user interactions
- **NEVER** define business data directly in components or view code

### 2. TypeScript Best Practices
- **Strict Mode**: `tsconfig.json` MUST have `"strict": true` enabled at all times
- **Never Disable Strict**: Do not disable `strict` mode or any of its sub-options (strictNullChecks, strictFunctionTypes, etc.)
- **Strict Typing**: All components, functions, and data must be properly typed
- **Type Definitions**: All JSON schemas are defined in `src/types/index.ts`
- **Type Safety**: Always validate JSON data matches TypeScript interfaces
- **No `any` Types**: Use proper types or `unknown` with type guards - `any` is only allowed when absolutely necessary and must be justified with a comment
- **Type Guards**: When using `unknown`, always implement proper type guards before type assertions
- **Interface Consistency**: JSON files must match their corresponding TypeScript interfaces exactly
- **Type Verification**: After any `tsconfig.json` changes, verify `strict: true` is still enabled

### 3. Data Management
- **Data Loading**: Use `src/utils/dataLoader.ts` functions to load JSON data
- **Data Validation**: Validate loaded data against TypeScript types
- **Error Handling**: Gracefully handle missing or invalid data (return empty arrays/objects)
- **Referential Integrity**: All referenced IDs must exist in their respective collections
- **Namespaced IDs**: Use prefixes `p__*`, `a__*`, `e__*`, `c__*` for patterns, assessments, exercises, conditions

### 4. Component Architecture
- **Component Structure**: Functional components with TypeScript interfaces for props
- **Code Splitting**: Use React.lazy() for route-level components
- **Custom Hooks**: Extract reusable logic into custom hooks (e.g., `useVideoPlayer`, `useCanvasDrawing`)
- **UI Components**: Reusable UI components in `src/components/ui/`
- **Props Interface**: Always define explicit TypeScript interfaces for component props

### 5. State Management
- **Local State**: Use React hooks (useState, useReducer) for component-local state
- **Data State**: Application data loaded once and passed down via props
- **No Global State Library**: Avoid Redux/Zustand unless absolutely necessary
- **State Lifting**: Lift state up when multiple components need it

### 6. Styling
- **Tailwind CSS**: Use Tailwind utility classes for styling
- **Design System**: Follow consistent spacing, colors, and typography
- **Responsive Design**: Mobile-first approach with responsive breakpoints
- **Dark Mode**: Not currently implemented, but structure should support it

### 7. Content Language
- **MANDATORY**: All user-facing content MUST be in English
- **Text Labels**: All button labels, UI text, error messages, and user-visible content must be in English
- **Examples**: Use "See more" (not "ver más"), "See less" (not "ver menos"), "Loading..." (not "Cargando..."), etc.
- **Code Comments**: Code comments can be in any language, but user-facing strings must be English
- **Error Messages**: All error messages displayed to users must be in English
- **Button Text**: All button labels and interactive element text must be in English
- **Placeholders**: Input placeholders and helper text must be in English
- **No Exceptions**: This rule applies to all user-visible content regardless of context

### 8. Linting Rules
- **ESLint Configuration**: ESLint should be configured and enforced for all TypeScript/JavaScript files
- **Top 10 Essential Rules** (MUST be enabled - highest priority):
  1. `@typescript-eslint/no-explicit-any`: Error on use of `any` type (prevents type safety issues)
  2. `@typescript-eslint/no-unused-vars`: Error on unused variables (prevents dead code)
  3. `@typescript-eslint/no-use-before-define`: Error on using variables/functions before they are defined (prevents hoisting issues and reference errors)
  4. `react-hooks/rules-of-hooks`: Enforce React hooks rules (prevents hooks violations)
  5. `react-hooks/exhaustive-deps`: Warn about missing dependencies in useEffect/useMemo/useCallback (prevents stale closures)
  6. `@typescript-eslint/explicit-function-return-type`: Functions must have explicit return types (improves type safety)
  7. `react/jsx-key`: Error on missing keys in lists (prevents React rendering issues)
  8. `@typescript-eslint/no-non-null-assertion`: Discourage non-null assertions (`!`) (prevents potential runtime errors)
  9. `prefer-const`: Use `const` when variables are not reassigned (prevents accidental mutations)
  10. `no-var`: Disallow `var`, use `let` or `const` (prevents hoisting issues)
- **Additional Required Rules**:
  - `no-console`: Warn on console.log (use console.error for errors only)
  - `@typescript-eslint/no-unnecessary-type-assertion`: Error on unnecessary type assertions
  - `@typescript-eslint/prefer-nullish-coalescing`: Prefer `??` over `||` for null/undefined checks
  - `@typescript-eslint/prefer-optional-chain`: Prefer optional chaining (`?.`) over nested property access
- **Code Quality Rules**:
  - Maximum line length: 100 characters (prefer breaking long lines)
  - Use meaningful variable and function names
  - Avoid deeply nested code (max 3-4 levels)
  - Prefer early returns to reduce nesting
- **React-Specific Rules**:
  - Components must be defined as functions (not arrow functions assigned to const)
  - Props interfaces must be defined explicitly
  - Use React.memo for expensive components
  - Extract complex logic into custom hooks
- **TypeScript-Specific Rules**:
  - No `@ts-ignore` or `@ts-expect-error` without justification comment
  - Prefer type assertions (`as Type`) over type casts only when necessary
  - Use type guards instead of type assertions when possible
- **Linting Workflow**:
  - Run linter before committing code
  - Fix all errors before merging
  - Warnings should be addressed unless explicitly justified
  - Linter configuration should be version-controlled

## Data Integrity Rules

### When Editing JSON Data Files
1. **Taxonomy Enforcement**:
   - `patterns.json`: Only movement patterns/findings
   - `assessments.json`: Only tests/protocols/screens
   - `exercises.json`: Only interventions/exercises
   - `conditions.json`: Only pathologies/diagnoses

2. **Schema Requirements**:
   - Patterns: Must have `id`, `name`, `description`, `assessment_ids[]`, `exercise_ids[]`
   - Assessments: Must have `id`, `name`, `purpose`, `protocol[]`, `views[]`, `positive_indicators[]`
   - Exercises: Must have `id`, `name`, `description`, `cues[]`, `progressions[]`

3. **Referential Integrity**:
   - Every ID in `*_ids` arrays must exist in the referenced collection
   - No broken references allowed
   - If `primary_assessment_ids` exists, it must be a subset of `assessment_ids`
   - No duplicate IDs in any `*_ids` array

4. **Bidirectional Consistency**:
   - If `exercises.pattern_ids` exists, ensure `patterns.exercise_ids` includes the exercise
   - Maintain symmetric relationships when both sides are defined

5. **ID Naming Convention**:
   - Patterns: `p__knee_valgus`, `p__forward_head_posture`
   - Assessments: `a__overhead_squat_assessment`, `a__single_leg_squat_assessment`
   - Exercises: `e__chin_tuck`, `e__clamshell`
   - Conditions: `c__patellofemoral_pain_syndrome`

## Adding New Features

### Before Implementing
1. **Check Existing Architecture**: Review similar features in the codebase
2. **Review Type Definitions**: Ensure types exist in `src/types/index.ts`
3. **Plan Data Structure**: Determine if new JSON files or fields are needed
4. **Consider Reusability**: Can existing components/hooks be reused?

### Implementation Checklist
- [ ] Create/update TypeScript interfaces in `src/types/index.ts`
- [ ] Add data loading function in `src/utils/dataLoader.ts` if new data file
- [ ] Create component with proper TypeScript props interface
- [ ] Use existing UI components from `src/components/ui/` when possible
- [ ] Implement error handling and loading states
- [ ] Ensure responsive design (mobile-first)
- [ ] Add proper TypeScript types (no `any`)
- [ ] Test data integrity (referential checks)

### Code Quality Standards
- **Naming**: Use descriptive, clear names (camelCase for variables/functions, PascalCase for components)
- **Comments**: Minimal but meaningful comments for complex logic
- **Error Handling**: Always handle errors gracefully with user-friendly messages
- **Performance**: Use React.memo, useMemo, useCallback when appropriate
- **Accessibility**: Include proper ARIA labels and keyboard navigation

## File Organization

### Component Files
- One component per file (except small related components)
- File name matches component name (PascalCase)
- Export component as named export: `export function ComponentName() {}`

### Hook Files
- One hook per file (except related hooks)
- File name: `useHookName.ts`
- Export hook as named export: `export function useHookName() {}`

### Type Files
- Centralized in `src/types/index.ts`
- Group related types together
- Export all types for use across the app

### Utility Files
- One utility module per concern (e.g., `dataLoader.ts`)
- Export functions as named exports
- Include JSDoc comments for public functions

## Testing & Validation

### Data Validation
- Verify all JSON files are valid JSON
- Check that all referenced IDs exist
- Ensure TypeScript types match JSON structure
- Validate no duplicate IDs within collections

### Component Testing
- Components should handle missing data gracefully
- Loading states should be implemented
- Error states should display user-friendly messages
- Responsive behavior should be tested

## Running the Application

### Development
```bash
npm install
npm run dev
```
- Server runs on `https://localhost:5173` (or `http` if certs not configured)
- Hot reload enabled
- HTTPS available for camera access (if certificates configured)

### Production Build
```bash
npm run build
```
- Output in `dist/`
- Serve `dist/` with any static host (e.g. Vercel)

## PWA & Service Worker Configuration Guidelines

### VitePWA Plugin Configuration (`vite.config.ts`)

#### Core Principles
- **Unified Configuration**: Use the same configuration for development and production - avoid conditional logic based on environment
- **Automatic Behavior**: Keep configuration simple and automatic to prevent errors in production
- **Best Practices**: Follow official VitePWA documentation patterns

#### Workbox Configuration Rules

1. **Precaching (`globPatterns` & `globIgnores`)**:
   - ✅ **DO**: Include all production assets: `['**/*.{js,css,html,json,png,svg,ico,jpg,jpeg}']`
   - ✅ **DO**: Exclude Vite source files: `globIgnores: ['**/src/**', '**/@/**', '**/_/**']`
   - ❌ **DON'T**: Include source files in precache (they don't exist in production)
   - ❌ **DON'T**: Use environment-specific glob patterns

2. **Service Worker Updates**:
   - ✅ **DO**: Use `skipWaiting: true` and `clientsClaim: true` for faster updates
   - ⚠️ **AWARE**: This may cause issues with multiple tabs - document if needed
   - ✅ **DO**: Use `cleanupOutdatedCaches: true` to remove old caches
   - ✅ **DO**: Set `maximumFileSizeToCacheInBytes: 5 * 1024 * 1024` (5MB) or appropriate size

3. **Navigation Fallback**:
   - ✅ **DO**: Use `navigateFallback: '/index.html'` for SPA routing
   - ✅ **DO**: Exclude Vite routes: `navigateFallbackDenylist: [/^\/_/, /^\/src\//, /^\/@/]`
   - ✅ **DO**: These exclusions are safe (routes don't exist in production)
   - ❌ **DON'T**: Remove these exclusions - they prevent SW from intercepting dev routes

4. **Runtime Caching**:
   - ✅ **DO**: Only cache dynamic content (APIs, external resources)
   - ✅ **DO**: Use appropriate strategies:
     - `NetworkFirst`: For APIs where fresh data matters
     - `CacheFirst`: For static assets like images/fonts
   - ✅ **DO**: Always specify `cacheableResponse.statuses: [0, 200]` explicitly
   - ✅ **DO**: Set appropriate expiration: `maxEntries` and `maxAgeSeconds`
   - ❌ **DON'T**: Add Vite routes (`/src/`, `/@`, `/_`) to `runtimeCaching`
   - ❌ **DON'T**: Use `NetworkOnly` for routes you want to exclude - exclusion should be via `navigateFallbackDenylist` or `devOptions.navigateFallbackAllowlist`
   - ❌ **DON'T**: Intercept routes that should bypass the service worker entirely

5. **Development Options (`devOptions`)**:
   - ✅ **DO**: Enable SW in dev: `enabled: true` (if testing PWA features)
   - ✅ **DO**: Use `type: 'module'` for ES modules support
   - ✅ **DO**: Use `navigateFallbackAllowlist: [/^\/$/]` in development
   - ✅ **CRITICAL**: `navigateFallbackAllowlist` prevents SW from intercepting Vite HMR routes
   - ❌ **DON'T**: Remove `navigateFallbackAllowlist` - it's essential for Vite HMR to work
   - ❌ **DON'T**: Use different SW behavior in dev vs production

#### Common Mistakes to Avoid

1. **Intercepting Vite Routes**:
   - ❌ **WRONG**: Adding `/src/`, `/@`, or `/_` to `runtimeCaching` (even with `NetworkOnly`)
   - ✅ **CORRECT**: Exclude via `navigateFallbackDenylist` and `devOptions.navigateFallbackAllowlist`

2. **Environment-Specific Logic**:
   - ❌ **WRONG**: Conditional configuration based on `import.meta.env.DEV`
   - ✅ **CORRECT**: Unified configuration that works in both environments

3. **Over-Intercepting**:
   - ❌ **WRONG**: Using `runtimeCaching` to "bypass" routes (defeats the purpose)
   - ✅ **CORRECT**: Don't add routes to `runtimeCaching` if they shouldn't be intercepted

4. **Missing Cache Configuration**:
   - ❌ **WRONG**: Not specifying `cacheableResponse.statuses`
   - ✅ **CORRECT**: Always specify `cacheableResponse: { statuses: [0, 200] }`

#### Example Configuration Pattern

```typescript
VitePWA({
  registerType: 'autoUpdate',
  filename: 'service-worker.js',
  workbox: {
    // Precaching
    globPatterns: ['**/*.{js,css,html,json,png,svg,ico,jpg,jpeg}'],
    globIgnores: ['**/src/**', '**/@/**', '**/_/**'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    
    // Cache management
    cleanupOutdatedCaches: true,
    skipWaiting: true,
    clientsClaim: true,
    
    // SPA fallback
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/_/, /^\/src\//, /^\/@/],
    
    // Runtime caching - ONLY for dynamic content
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/api\.example\.com\/.*/i,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
          cacheableResponse: { statuses: [0, 200] },
        },
      },
    ],
  },
  devOptions: {
    enabled: true,
    type: 'module',
    navigateFallbackAllowlist: [/^\/$/], // CRITICAL for Vite HMR
  },
})
```

#### When Modifying Service Worker Configuration

1. **Before Making Changes**:
   - Understand what each option does (read Workbox/VitePWA docs)
   - Test in development mode first
   - Verify HMR still works after changes

2. **Testing Checklist**:
   - [ ] Vite HMR works (hot reload functions)
   - [ ] Service worker registers correctly
   - [ ] No console errors about failed module imports
   - [ ] Offline functionality works in production build
   - [ ] Cache updates properly when new version is deployed

3. **After Making Changes**:
   - Clear service worker and cache in browser DevTools
   - Hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`)
   - Verify no errors in console
   - Test offline functionality

#### Troubleshooting

- **"Failed to fetch dynamically imported module"**: Service worker is intercepting Vite routes - check `navigateFallbackDenylist` and `devOptions.navigateFallbackAllowlist`
- **HMR not working**: Service worker intercepting WebSocket - ensure `devOptions.navigateFallbackAllowlist: [/^\/$/]` is set
- **Old cache persists**: Use `cleanupOutdatedCaches: true` and clear cache manually in DevTools
- **Service worker not updating**: Check `skipWaiting` and `clientsClaim` are enabled

## Common Patterns

### Loading Data
```typescript
import { loadPatterns } from '../utils/dataLoader';
const patterns = await loadPatterns();
```

### Component Props
```typescript
interface ComponentProps {
  data: DataType[];
  onAction: (id: string) => void;
}
export function Component({ data, onAction }: ComponentProps) {
  // ...
}
```

### Error Handling
```typescript
try {
  const data = await loadData();
  // Use data
} catch (error) {
  console.error('Error loading data:', error);
  // Show user-friendly error message
}
```

## Agent Conduct Guidelines

### Security First
1. **React Version**: ALWAYS verify React 19.2.0+ (minimum 19.2.0) is in package.json before making changes
2. **Version Check**: React version MUST be `>= 19.2.0` - reject any version below this threshold
3. **Never Downgrade**: If you see React 18 or earlier, immediately update to React 19.2.0 or later
4. **Dependency Check**: When adding new packages, ensure they're compatible with React 19
5. **Security Updates**: Prioritize security updates over feature additions
6. **Version Lock**: Never suggest or implement downgrades to React 18 for any reason
7. **TypeScript Strict**: ALWAYS verify `strict: true` is enabled in tsconfig.json
8. **Linting**: Ensure linting rules are enforced and all errors are resolved before committing

### When Adding Functionality
1. **Understand First**: Read existing code to understand patterns
2. **Maintain Consistency**: Follow existing code style and architecture
3. **Type Safety**: Never use `any` without justification and type guards
4. **TypeScript Strict**: Verify `strict: true` remains enabled in tsconfig.json
5. **Data Integrity**: Always validate data and check references
6. **User Experience**: Consider loading states, error states, and edge cases
7. **Documentation**: Update relevant docs when adding significant features
8. **Security Check**: Verify React 19.2.0+ is maintained after any dependency changes
9. **Linting**: Run linter and fix all errors before completing the feature
10. **React Version**: Ensure React version is `>= 19.2.0` after any package changes
11. **English Content**: All user-facing text, button labels, and messages MUST be in English

### When Modifying Data
1. **Backup**: Consider backing up JSON files before major changes
2. **Validation**: Verify JSON is valid and matches TypeScript types
3. **References**: Check all referenced IDs still exist
4. **Consistency**: Maintain naming conventions and structure
5. **Testing**: Test the changes in the application
6. **Form/questionnaire/scale JSONs**: When editing any form or scale in `public/data/` (e.g. client-questionnaire, PAR-Q, LEFS, UEFI, movement-analysis), **always** provide both languages: `en` and `es` for every Translatable field. No fallback. See `.cursor/rules/forms-bilingual.md`.

### When Refactoring
1. **Incremental**: Make small, focused changes
2. **Test**: Ensure functionality still works after refactoring
3. **Type Safety**: Maintain or improve type safety
4. **Documentation**: Update comments/docs if structure changes

## Prohibited Practices

- ❌ **Using React 18 or earlier** (SECURITY CRITICAL - React 19.2.0+ required, minimum 19.2.0)
- ❌ **Disabling TypeScript strict mode** (SECURITY CRITICAL - `strict: true` must always be enabled)
- ❌ **Using React versions below 19.2.0** (even if package manager suggests it)
- ❌ **Using non-English text for user-facing content** (MANDATORY - All UI text, buttons, labels, and messages must be in English)
- ❌ Defining business data in components
- ❌ Using `any` type without type guards and justification
- ❌ Disabling TypeScript strict mode or its sub-options
- ❌ Using `@ts-ignore` or `@ts-expect-error` without justification comments
- ❌ Breaking referential integrity in JSON files
- ❌ Mixing data loading logic with presentation
- ❌ Creating components without TypeScript interfaces
- ❌ Ignoring error handling
- ❌ Ignoring linting errors
- ❌ Hardcoding values that should come from data
- ❌ Creating duplicate functionality instead of reusing
- ❌ Downgrading React version for any reason
- ❌ Committing code with linting errors

## References
- TypeScript types: `src/types/index.ts`
- Data loader: `src/utils/dataLoader.ts`
- Component examples: `src/components/`
- Architecture spec: `docs/ARCHITECTURE_SPEC.md`
- UX spec: `docs/UX_SPEC.md`
- Data spec: `docs/DATA_SPEC.md`

