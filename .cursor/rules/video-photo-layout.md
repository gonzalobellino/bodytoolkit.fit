# Video / Photo Analysis – layout and scroll

## Rule: do not break page scroll

When changing the layout of **VideoAnalysis** or **PhotoAnalysis**:

1. **Root must NOT use fixed viewport height when media is loaded (and not fullscreen).**
   - Do **not** add `h-screen`, `fixed inset-0`, or `overflow-y-auto` on the root for the “video loaded” state.
   - Reason: that traps the page in one viewport and removes the ability to scroll to the controls or the rest of the content.

2. **Only fullscreen** should use viewport-fill layout (`w-full h-full overflow-hidden` on root and flex chain with `flex-1 min-h-0`).

3. **When media is loaded and not fullscreen:** root stays `min-h-screen` (no fixed height). Content (canvas + controls) defines height; the **page scrolls** so the user can move over the drop zone and over the video, and reach the controls below.

## Checklist after any layout change

- [ ] **No media:** drop zone is visible (good min-height, not 1px width).
- [ ] **With media:** user can scroll the page over the drop zone and over the video.
- [ ] **With media:** controls below the video are reachable by scrolling.
- [ ] **Fullscreen:** view fills viewport; zoom/pan reset on exit still works.
- [ ] **touch-none** only on the canvas container and on the canvas element when **fullscreen** (so scroll works over drop zone and image when not fullscreen).

## Reference

- Root: `isFullscreen ? 'w-full h-full overflow-hidden' : 'min-h-screen'` (no `h-screen` or `fixed` when video is loaded).
- Canvas when video/image: when not fullscreen, VideoAnalysis uses `min-h-[calc(100vh-18rem)]`; PhotoAnalysis uses `min-h-[calc(100vh-5rem)]` so total content exceeds the viewport and the page can scroll. No `flex-1` on root so scroll stays working.
- Canvas element (Photo): `touch-none` only when `isFullscreen`; otherwise omit so the page can scroll when the user touches the image area.
