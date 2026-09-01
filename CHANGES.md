# Code Changes - Avaturn Integration

## File: index.html

### Summary of Changes
- **Lines 1736-1751:** New Avaturn configuration constants and cache loading
- **Lines 1753-1773:** `launchAvaturnCreator()` function
- **Lines 1775-1794:** `loadAvatarFromUrl()` function
- **Lines 1796-1840:** postMessage listener for `v1.avatar.exported`
- **Lines 1842-1889:** Updated `$('selfie').onchange` handler (completely rewritten)
- **Lines 1950-1967:** Updated startup function to auto-load cached avatar

### What Was Removed
Old selfie handler (lines 1738-1774 in previous version):
```javascript
$('selfie').onchange = async e => {
  const f = e.target.files?.[0];
  if (!f) return;
  const img = $('shot');
  img.src = URL.createObjectURL(f);
  $('shotWrap').classList.add('on');
  const note = $('shotNote');
  note.textContent = 'Reading your colours…';
  await new Promise(r => { img.onload = r; img.onerror = r; });
  try {
    const out = await analyseSelfie(img);
    if (out.error) {
      note.innerHTML = `<b>No face found.</b> Try a clearer, front-facing photo — or pick a character below.`;
      return;
    }
    charColours['Wolf3D_Skin'] = '#' + out.skin.getHexString();
    if (out.hair) charColours['Wolf3D_Hair'] = '#' + out.hair.getHexString();
    saveColours();
    avatars.forEach(applyPersonalisation);
    renderEditor();
    await renderMyCharacter();
    // ... reset link
  } catch (err) {
    note.innerHTML = `<b>Could not read that photo.</b> ${err.message}`;
  }
};
```

### What Was Added

#### 1. Constants (1740-1743)
```javascript
const AVATURN_CREATOR_URL = 'https://create.avaturn.me/';
const AVATAR_CACHE_KEY = 'sbj.avaturn-avatar.v1';
let _avaturnWindow = null;
let _lastAvatarUrl = null;
```

#### 2. Cache Loading (1745-1751)
```javascript
try {
  const cached = JSON.parse(localStorage.getItem(AVATAR_CACHE_KEY) || 'null');
  if (cached?.url && Date.now() - cached.timestamp < 30 * 24 * 60 * 60 * 1000) {
    _lastAvatarUrl = cached.url;
  }
} catch {}
```

#### 3. launchAvaturnCreator() (1753-1773)
Opens Avaturn Creator in a popup window.

#### 4. loadAvatarFromUrl() (1775-1794)
Fetches GLB from Avaturn URL and loads it using existing system.

#### 5. postMessage Listener (1796-1840)
Captures `v1.avatar.exported` events from Avaturn popup.

#### 6. New Selfie Handler (1842-1889)
- Opens Avaturn Creator
- Runs MediaPipe color sampling in parallel
- Shows preview while waiting for Avaturn
- Listens for avatar export via postMessage

#### 7. Startup Logic (1952-1960)
```javascript
// Try to load cached Avaturn avatar first
if (_lastAvatarUrl) {
  console.log('[startup] Loading cached Avaturn avatar:', _lastAvatarUrl);
  try {
    await loadAvatarFromUrl(_lastAvatarUrl);
  } catch (err) {
    console.warn('[startup] Failed to load cached avatar, falling back:', err.message);
  }
}
```

---

## Line-by-Line Reference

### Configuration Block (1736-1751)
**Before:** Comment about preview-only implementation
**After:** Avaturn constants + cache initialization

### Function Definitions (1753-1840)
**Before:** None
**After:** Three new functions for Avaturn integration

### Event Handler (1842-1889)
**Before:** MediaPipe-only handler
**After:** Avaturn-first handler with MediaPipe fallback

### Startup (1950-1967)
**Before:** Direct build() call
**After:** Check for cached avatar, auto-load, then build()

---

## Unchanged Code

The following were NOT modified:
- HTML structure (no new elements needed)
- `GLTFLoader` import and caching (reused as-is)
- `SkeletonUtils.clone()` (reused as-is)
- Animation system (CLIP_FILES, triggerAll, etc.)
- `renderMyCharacter()` preview function
- `applyPersonalisation()` color tinting
- Character selector UI
- Dev panel and performance HUD
- All other event handlers

---

## Testing the Changes

### Manual Verification
1. Build and deploy
2. Open DevTools → Console
3. Upload a selfie
4. Look for logs:
   - `[startup] Loading cached Avaturn avatar: ...` (on page load)
   - `[avaturn] Avatar exported: ...` (after export)
   - Errors logged as: `console.error('[avaturn] ...')`

### Quick Test
```javascript
// Check if cache exists
JSON.parse(localStorage.getItem('sbj.avaturn-avatar.v1'))

// Check current avatar
window.__spike.avatars[0].root.name

// Clear cache
localStorage.removeItem('sbj.avaturn-avatar.v1')
location.reload()
```

---

## Backward Compatibility

✓ **Fully backward compatible**
- Existing fallback avatars (male/female) still work
- GLB upload path unchanged
- All animations unchanged
- MediaPipe color sampling still available as fallback
- LocalStorage keys isolated (`sbj.avaturn-avatar.v1` is new key)

---

## Performance Impact

### Additions
- ~190 lines of JavaScript (~3 KB gzipped)
- One additional localStorage entry (~200 bytes)
- Avaturn Creator popup (hosted externally)

### No Changes To
- Three.js performance
- Animation system
- Rendering pipeline
- Table layout

**Expected impact:** Negligible (Avaturn hosted separately)

---

## Security Considerations

### Origin Validation (1798)
```javascript
if (ev.origin !== 'https://create.avaturn.me' && 
    ev.origin !== 'https://avaturn.me' && 
    ev.origin !== 'https://in3d.io') {
  return;
}
```
**Effect:** Only accepts messages from Avaturn domains

### No Credential Storage
- API keys not hardcoded
- No sensitive data in messages
- GLB URLs are public, cacheable assets

### Data Privacy
- Selfie stays on user device (not uploaded to backend)
- Only sent to Avaturn if user initiates
- Generated avatar URL cached locally

---

## Debugging

### Add Debug Logs
To see postMessage events in real-time:
```javascript
window.addEventListener('message', ev => {
  console.log('[DEBUG] Message received:', {
    origin: ev.origin,
    type: ev.data?.type,
    url: ev.data?.url?.substring(0, 50) + '...'
  });
  // ... rest of handler
});
```

### Monitor Cache
```javascript
setInterval(() => {
  const cached = localStorage.getItem('sbj.avaturn-avatar.v1');
  if (cached) console.log('Cache state:', JSON.parse(cached));
}, 5000);
```

### Trace Avatar Loading
```javascript
// After loadAvatarFromUrl() called
console.log('Current model:', currentModel);
console.log('Avatar count:', avatars.length);
console.log('Triangles:', window.__spike.renderer.info.render.triangles);
```
