# Avaturn Avatar Generation - Test Plan

## Setup
1. Run `node serve.mjs` to start the local server
2. Open the app on a real phone or desktop browser
3. Click "MY CHARACTER" button
4. Click "Choose a photo" to upload a selfie

## Test Cases

### Test 1: Basic Avatar Generation Flow
**Goal:** Verify the complete selfie-to-avatar flow works

**Steps:**
1. Upload a clear, front-facing selfie
2. Observe MediaPipe color preview appears (skin/hair swatches shown)
3. Avaturn Creator window opens in new tab/window
4. User manually creates/generates avatar in Avaturn
5. User clicks "Export" or "Download" in Avaturn to export avatar
6. Watch for `v1.avatar.exported` message in browser console (DevTools → Console)
7. Avatar should load automatically and replace the preview

**Expected Result:**
- ✓ Preview colors appear instantly
- ✓ Avaturn window opens successfully
- ✓ Avatar exports and loads within 2-3 seconds
- ✓ New avatar renders in `renderMyCharacter()` preview
- ✓ "Avatar created!" message shown with stats (face meshes, triangles)

---

### Test 2: Animation Playback
**Goal:** Verify animations work on the Avaturn avatar

**Steps:**
1. After avatar loads (Test 1), click "Done" to close the sheet
2. Tap the felt to fire random reactions
3. Click individual reaction buttons in dev panel: Dance, Laugh, Point, Celebrate, Win, Lose
4. Watch the avatar animate

**Expected Result:**
- ✓ All 11 animations play smoothly without glitching
- ✓ No broken bone bindings (character doesn't deform strangely)
- ✓ Reactions fade in/out correctly
- ✓ Idle animation plays between reactions

---

### Test 3: Facial Expressions
**Goal:** Verify face blendshapes work (if Avaturn avatar has them)

**Steps:**
1. With Avaturn avatar loaded, trigger reactions: Laugh, Win, Angry, Lose
2. Watch the face for expressions

**Expected Result:**
- ✓ If avatar has facial blendshapes, mouth and eyes animate with reactions
- ✓ If not, character body alone animates (graceful degradation)
- ✓ Message shown: "X face meshes" or "no facial blendshapes"

---

### Test 4: LocalStorage Persistence
**Goal:** Verify avatar caches and reloads on page refresh

**Steps:**
1. Generate and load an Avaturn avatar (Test 1)
2. Verify in DevTools → Application → LocalStorage → Key: `sbj.avaturn-avatar.v1`
3. Refresh the page (F5 or Cmd+R)
4. Observe startup console logs

**Expected Result:**
- ✓ Log message: `[startup] Loading cached Avaturn avatar: https://...`
- ✓ Avatar loads automatically without re-opening Avaturn
- ✓ Avatar renders in the same state as before refresh
- ✓ Cache entry shows `{ url: "...", timestamp: ... }`

---

### Test 5: Reset to Default Avatar
**Goal:** Verify "Use default instead" link works

**Steps:**
1. Load an Avaturn avatar (Test 1)
2. Click "Use default instead" link
3. Observe model switches back to male/female

**Expected Result:**
- ✓ Avatar reverts to the pre-loaded male/female model
- ✓ LocalStorage cleared (`sbj.avaturn-avatar.v1` removed)
- ✓ Message shown: "Reset to default avatar."
- ✓ Animations still play on default avatar

---

### Test 6: Error Handling - Popup Blocked
**Goal:** Verify graceful handling of popup blocking

**Steps:**
1. Enable popup blocker in browser settings
2. Upload a selfie
3. Try to launch Avaturn

**Expected Result:**
- ✓ Error message shown: "Popup blocked. Please allow popups for avaturn.me..."
- ✓ MediaPipe preview still shows colors
- ✓ App doesn't crash

---

### Test 7: Error Handling - Close Avaturn Window
**Goal:** Verify app handles user closing Avaturn without exporting

**Steps:**
1. Upload a selfie
2. Avaturn window opens
3. User closes it without exporting
4. Wait 5+ seconds

**Expected Result:**
- ✓ App stays responsive
- ✓ MediaPipe preview remains visible
- ✓ No console errors
- ✓ User can try again by uploading a new photo

---

### Test 8: Multiple Avatars
**Goal:** Verify switching between generated avatars

**Steps:**
1. Generate Avaturn avatar A (Test 1)
2. Upload new selfie, generate Avaturn avatar B
3. Observe avatar switches

**Expected Result:**
- ✓ Latest Avaturn avatar loads
- ✓ LocalStorage updated with new URL
- ✓ Animations play correctly on new avatar
- ✓ Page refresh loads avatar B (not A)

---

### Test 9: Network Timeout
**Goal:** Verify handling of slow/failed GLB download

**Steps:**
1. Use DevTools Network tab to throttle connection (e.g., "Slow 3G")
2. Generate an Avaturn avatar
3. Observe loading state and timeout behavior

**Expected Result:**
- ✓ Loading message shown: "Loading your avatar…"
- ✓ If timeout > ~30s, error message shown with fallback option
- ✓ If successful despite slow connection, avatar eventually loads
- ✓ No "Cannot read property of undefined" errors

---

### Test 10: Mobile Portrait Mode
**Goal:** Verify avatar generation works on mobile

**Steps:**
1. Run on a real phone (or DevTools mobile emulation)
2. Upload a selfie in portrait mode
3. Avaturn window opens (may need landscape or full-screen)
4. Generate and export avatar

**Expected Result:**
- ✓ Selfie preview responsive to screen size
- ✓ Avaturn window can be generated and exported on mobile
- ✓ Avatar loads and plays reactions on mobile
- ✓ Frame rate acceptable (>30 FPS)

---

## Debug Tips

### Check Avaturn Message
Open browser DevTools → Console and filter for `[avaturn]`:
```
[avaturn] Avatar exported: https://cdn-cgi.in3d.io/...glb
```

### Check Startup Logs
```
[startup] Loading cached Avaturn avatar: https://...
```

### Inspect Generated Model
In DevTools → Console:
```javascript
console.log(window.__spike.avatars[0].baseHeight, 'triangles:', window.__spike.renderer.info.render.triangles)
```

### Force Clear Cache
```javascript
localStorage.removeItem('sbj.avaturn-avatar.v1')
location.reload()
```

### Check Skeleton Bones
```javascript
const bones = new Set();
window.__spike.scene.traverse(o => { if (o.isBone) bones.add(o.name); });
console.log(Array.from(bones).sort());
```

---

## Known Limitations

1. **Manual Upload in Avaturn** — User must upload photo manually in the Creator window (not passed automatically)
   - *Workaround:* Implement Avaturn API integration to pass photo directly

2. **postMessage Origin Check** — May need to update allowed origins if Avaturn uses different domain
   - *Check:* Look at `ev.origin` in DevTools when message fires

3. **No Real-time Preview** — Avatar only loads after export, not live preview
   - *Future:* Could implement polling or WebSocket for real-time status

4. **Cache Duration** — Avaturn URLs may expire after 30 days
   - *Workaround:* Regenerate avatar or download and save locally

---

## Debugging Checklist

- [ ] Check browser console for `[avaturn]` and `[startup]` logs
- [ ] Verify `ev.origin` in postMessage listener matches Avaturn domain
- [ ] Confirm `ev.data.type === 'v1.avatar.exported'` in event
- [ ] Check LocalStorage for cached URL (`sbj.avaturn-avatar.v1`)
- [ ] Verify GLB file loads (DevTools Network tab → filter `.glb`)
- [ ] Confirm skeleton has expected bones (Hips, Spine, LeftArm, etc.)
- [ ] Run `verify.mjs` headless test if available
- [ ] Test on real device (not just desktop emulation)
