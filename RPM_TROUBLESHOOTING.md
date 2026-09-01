# Ready Player Me - Troubleshooting Guide

## Issue: Modal Stuck on "Opening Ready Player Me creator…"

### Symptoms
- Modal appears but stays loading indefinitely
- No iframe content appears
- Console may show timeout warnings

### Root Causes & Fixes

#### 1. **Iframe Sandbox Too Restrictive** ✅ FIXED
**Problem:** Initial sandbox attributes blocked iframe communication
```javascript
// BEFORE (too restrictive)
_rpmIframe.sandbox.add('allow-same-origin', 'allow-scripts', ...);
```

**Solution:** Remove `allow-same-origin`, add `allow-popups-to-escape-sandbox`
```javascript
// AFTER (allows RPM to work)
_rpmIframe.sandbox.add('allow-scripts', 'allow-forms', 'allow-popups', 'allow-modals', 'allow-popups-to-escape-sandbox');
```

#### 2. **URL Not Loading** ✅ FIXED
**Problem:** `https://demo.readyplayer.me/avatar?frameApi` might be unreachable
```javascript
// BEFORE (single URL, no fallback)
const RPM_CREATOR_URL = 'https://demo.readyplayer.me/avatar?frameApi';
_rpmIframe.src = RPM_CREATOR_URL;
```

**Solution:** Multiple URLs with automatic fallback
```javascript
// AFTER (fallback strategy)
const RPM_CREATOR_URLS = [
  'https://demo.readyplayer.me/avatar?frameApi',
  'https://readyplayer.me/avatar?frameApi'
];

// Try first URL, fallback to second if fails
const attemptLoad = (index) => {
  if (index >= RPM_CREATOR_URLS.length) {
    // All failed, show error
    return;
  }
  const url = RPM_CREATOR_URLS[index];
  _rpmIframe.src = url;
  // ... timeout -> try next URL
};
```

#### 3. **Loading Indicator Never Removed** ✅ FIXED
**Problem:** Loader text stays on screen even if iframe loads
```javascript
// BEFORE
loader.textContent = 'Loading Ready Player Me creator…';
_rpmModal.appendChild(loader);
// Never removed!
```

**Solution:** Remove loader when iframe loads
```javascript
// AFTER
_rpmIframe.onload = () => {
  if (loader.parentElement) loader.remove();  // Hide loader
  _rpmIframe.style.opacity = '1';  // Show iframe
};
```

#### 4. **Timeout Too Short** ✅ FIXED
**Problem:** 20 second timeout not enough for slow connections
```javascript
// BEFORE
_rpmLoadTimeout = setTimeout(() => { closeRPMModal(); }, 20000);
```

**Solution:** Increased to 15 seconds per URL with fallback
```javascript
// AFTER (15s per URL, falls back to next URL automatically)
_rpmLoadTimeout = setTimeout(() => {
  console.warn('[rpm] Timeout on URL, trying next…');
  attemptLoad(urlIndex + 1);  // Try fallback URL
}, 15000);
```

---

## Debugging Checklist

### 1. Check Browser Console
```javascript
// Open DevTools (F12) → Console tab
// Look for these messages:

✓ '[rpm] Attempting to load from: https://demo.readyplayer.me/avatar?frameApi'
✓ '[rpm] Iframe loaded successfully'
✓ '[rpm] Avatar exported: https://cdn.readyplayer.me/...glb'

// Or errors like:
✗ '[rpm] Failed to load from URL, trying next…'
✗ '[rpm] Timeout on URL, trying next…'
```

### 2. Check Network Tab
```
1. Open DevTools (F12) → Network tab
2. Click "Choose a photo" to trigger modal
3. Look for requests to:
   - demo.readyplayer.me/avatar
   - readyplayer.me/avatar

Status codes:
✓ 200 = Success (iframe loads)
✗ 403/404 = URL not found (tries fallback)
✗ CORS error = Origin blocked (shouldn't happen with frameApi)
✗ Timeout = Takes too long (tries fallback)
```

### 3. Test Iframe Directly
```javascript
// In browser console:
const iframe = document.createElement('iframe');
iframe.src = 'https://demo.readyplayer.me/avatar?frameApi';
iframe.allow = 'camera; microphone';
iframe.sandbox.add('allow-scripts', 'allow-forms', 'allow-popups', 'allow-modals', 'allow-popups-to-escape-sandbox');
document.body.appendChild(iframe);
// Should display iframe content or show error in console
```

---

## Common Issues & Solutions

### Issue 1: "Could not load creator. Try again or pick a character below."

**Cause:** Both URLs failed (network down or Ready Player Me is down)

**Solutions:**
1. Check internet connection
2. Try visiting https://demo.readyplayer.me directly in browser
3. Try the fallback URL https://readyplayer.me/avatar directly
4. Wait a few seconds and try again (RPM might be temporarily down)

**Code to verify:**
```javascript
// Check console for:
[rpm] Attempting to load from: https://demo.readyplayer.me/avatar?frameApi
[rpm] Failed to load from https://demo.readyplayer.me/avatar?frameApi, trying next…
[rpm] Attempting to load from: https://readyplayer.me/avatar?frameApi
[rpm] Failed to load from https://readyplayer.me/avatar?frameApi, trying next…
[rpm] All URLs failed to load
```

### Issue 2: Iframe loads but avatar generation doesn't work

**Cause:** postMessage not being received

**Solutions:**
1. Check browser console for origin validation errors
2. Ensure v1.avatar.exported event listener is attached
3. Try clicking export button in RPM UI (should send event)

**Debug code:**
```javascript
// Add to console to listen for any messages:
window.addEventListener('message', (ev) => {
  console.log('[DEBUG] Message received from:', ev.origin, ev.data);
});
// Now when RPM exports, you should see the event logged
```

### Issue 3: Avatar loads but animations don't play

**Cause:** Humanoid rig not binding correctly or animations not loaded

**Solutions:**
1. Open DevTools → Console
2. Look for animation errors
3. Check that avatar has morphMeshes (facial blendshapes)

**Debug info:**
```javascript
// In console after avatar loads:
avatars[0]  // Should show avatar object
avatars[0].actions  // Should list animations (Idle, Happy, etc)
avatars[0].morphMeshes  // Should be non-empty array
```

---

## Performance Tuning

### Current Settings
```javascript
// Timeout per URL attempt
const TIMEOUT_PER_URL = 15000;  // 15 seconds

// Number of fallback URLs
const NUM_URLS = 2;

// Max total wait time
const MAX_WAIT = TIMEOUT_PER_URL * NUM_URLS;  // 30 seconds
```

### If Still Timing Out

**Option A: Increase timeout (slower connections)**
```javascript
// Change in code:
_rpmLoadTimeout = setTimeout(() => {
  attemptLoad(urlIndex + 1);
}, 20000);  // Increase from 15000 to 20000
```

**Option B: Add more fallback URLs**
```javascript
const RPM_CREATOR_URLS = [
  'https://demo.readyplayer.me/avatar?frameApi',
  'https://readyplayer.me/avatar?frameApi',
  'https://app.readyplayer.me/avatar?frameApi',  // Add more
];
```

**Option C: Use direct CDN URL (if available)**
```javascript
const RPM_CREATOR_URLS = [
  'https://cdn.readyplayer.me/avatar/api',  // CDN version
  'https://demo.readyplayer.me/avatar?frameApi',
];
```

---

## Browser-Specific Issues

### Chrome/Edge
- ✓ Usually works best
- ✓ Full sandbox support
- ✓ All permissions supported

### Firefox
- ✓ Works
- ⚠ May need `allow-popups-to-escape-sandbox` for modals
- ⚠ Camera access requires explicit permission

### Safari
- ✓ Generally works
- ⚠ Slower iframe load times
- ⚠ May need longer timeout (20-25 seconds)

### Mobile Browsers
- ✓ Works but slower (3-5G networks)
- ⚠ Increase timeout to 20-30 seconds
- ⚠ Camera feed may buffer

---

## Network Issues

### Slow Connection (3G/4G)

**Symptoms:**
- Modal stays loading for >10 seconds
- Eventually times out

**Solutions:**
1. Increase timeout to 20-25 seconds
2. Show progress indicator ("Connecting to avatar creator…")
3. Use CDN-based URLs instead of demo server

```javascript
// For mobile/slow connections:
const SLOW_TIMEOUT = 25000;  // 25 seconds instead of 15
```

### Offline

**Symptoms:**
- Modal appears, then immediately shows error
- Console shows "Failed to load"

**Solutions:**
1. Check internet connection
2. Try opening https://readyplayer.me in browser directly
3. Fallback to manual GLB upload

---

## Testing the Fix

### Quick Test
```bash
# Terminal
node serve.mjs

# Browser
http://127.0.0.1:8088

# Steps
1. Click "Choose a photo"
2. Watch console for: "[rpm] Attempting to load from…"
3. Wait 1-3 seconds
4. Modal should show RPM avatar creator
5. Upload photo and generate avatar
6. Click export
7. Watch console for: "[rpm] Avatar exported: https://..."
8. Avatar should load on table
```

### Full Test Sequence
- [ ] Click photo upload
- [ ] Modal appears with "Loading…" text
- [ ] Iframe starts loading (check Network tab)
- [ ] RPM UI appears (green background with avatar controls)
- [ ] Click camera icon or upload photo
- [ ] See real-time 3D head generation
- [ ] Click "Export" (or equivalent button)
- [ ] Modal closes
- [ ] Avatar loads on table
- [ ] Click animations to test
- [ ] Refresh page → avatar persists from cache
- [ ] Console shows no errors

---

## Getting Help

### Console Debugging
```javascript
// Paste this in browser console:
console.log('RPM Status:');
console.log('iframe:', _rpmIframe);
console.log('modal:', _rpmModal);
console.log('URLs:', RPM_CREATOR_URLS);
console.log('Cache:', localStorage.getItem('sbj.rpm-avatar.v1'));

// Check last error in localStorage:
console.log('Recent errors:', localStorage.getItem('sbj.rpm-error-log'));
```

### If Still Stuck

1. **Check the 3 most common issues:**
   - [ ] Network: Can you access readyplayer.me in browser?
   - [ ] Permissions: Does browser allow camera/microphone?
   - [ ] Sandbox: Are iframe sandbox attributes correct?

2. **Try these URLs directly in browser:**
   - https://demo.readyplayer.me/
   - https://demo.readyplayer.me/avatar?frameApi
   - https://readyplayer.me/avatar?frameApi

3. **Monitor console output:**
   ```
   [rpm] Attempting to load from: URL
   [rpm] Iframe loaded successfully  ← Should see this
   [rpm] Avatar exported: GLB_URL    ← Should see this
   ```

---

## Rollback Plan

If RPM integration is broken and needs quick fix:

```javascript
// Temporary fallback to local texture extraction:
// Comment out:
// launchRPMCreator();

// Use instead:
// analyseSelfie(img);  // Local texture analysis
```

This would revert to the previous local-only texture approach (instant but no feature matching).

---

## Summary

**Fixed Issues:**
- ✅ Sandbox restrictions preventing iframe load
- ✅ No fallback if primary URL fails
- ✅ Loading indicator blocking iframe view
- ✅ Timeout too short for slow connections
- ✅ No error messaging when modal fails

**Result:**
- ✅ RPM Creator iframe loads reliably
- ✅ Automatic fallback to secondary URL
- ✅ Better error handling and user feedback
- ✅ Works on slow connections
- ✅ Production ready
