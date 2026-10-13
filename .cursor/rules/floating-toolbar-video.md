# Floating toolbar (Video / Photo analysis)

## Video Analysis – floating toolbar order (bottom-right)

When implementing or changing the floating toolbar over the video (bottom-right), keep this order (left to right):

1. **Play/Still** – first on the left (Play when paused, Pause/Still when playing)
2. Separator `|`
3. **Select** (Move)
4. Separator `|`
5. **Zoom out** → **XX%** → **Zoom in**
6. Separator `|`
7. **Fullscreen** (Maximize/Minimize)
8. If applicable: separator + **New** (Trash2)

```
[KeypointToolbar]  |  [Play/Still] | [Select] | [−] XX% [+] | [Fullscreen] | [New]
```

Play/Still must be the first control in the white toolbar bar (leftmost).
