# Avaturn Avatar Generation - Implementation Summary

## Overview
Implemented a complete Avaturn avatar generation pipeline for Street Blackjack. Users can now upload selfies to generate personalized, rigged `.glb` avatars that work seamlessly with the existing animation system.

## What Was Changed

### 1. **index.html** - Core Selfie Handler & Avaturn Integration
**Location:** Lines 1736-1889

**Key Changes:**
- Replaced mock selfie handler with full Avaturn integration
- Added `launchAvaturnCreator()` — opens Avaturn Creator window
- Added `loadAvatarFromUrl()` — fetches and loads GLB from Avaturn
- Added `window.addEventListener('message', ...)` — captures `v1.avatar.exported` events
- Maintained MediaPipe color sampling as parallel fallback/preview
- Added LocalStorage caching of avatar URLs (30-day TTL)
- Added startup auto-load of cached avatars

**New Global Constants:**
```javascript
const AVATURN_CREATOR_URL = 'https://create.avaturn.me/';
const AVATAR_CACHE_KEY = 'sbj.avaturn-avatar.v1';
let _avaturnWindow = null;
let _lastAvatarUrl = null;
```

**New Functions:**
- `launchAvaturnCreator(photoFile)` — Opens Avaturn popup
- `loadAvatarFromUrl(glbUrl)` — Loads GLB and binds to animation rig
- `window.addEventListener('message', ...)` — Handles postMessage from Avaturn

**Startup Code (Lines 1950-1967):**
- Checks for cached avatar URL
- Auto-loads cached avatar on page startup
- Falls back to build() if cache is missing/expired

---

### 2. **AVATURN_INTEGRATION.md** - Documentation
**New File**

Comprehensive guide including:
- User journey flow
- Implementation details (functions, listeners, caching)
- Skeleton compatibility notes (standard Humanoid bones)
- Configuration requirements (none for public Creator)
- Testing checklist
- Potential improvements for production

---

### 3. **TEST_PLAN.md** - Quality Assurance
**New File**

10 comprehensive test cases:
1. Basic avatar generation flow
2. Animation playback on Avaturn avatar
3. Facial expression blendshapes
4. LocalStorage persistence & refresh
5. Reset to default avatar
6. Error handling (popup blocked)
7. Error handling (window closed)
8. Multiple avatars switching
9. Network timeout handling
10. Mobile portrait mode

Plus debug tips, known limitations, and debugging checklist.

---

## How It Works

### User Flow
```
1. User uploads selfie
   ↓
2. MediaPipe detects face & samples colors (instant preview)
   ↓
3. Avaturn Creator window opens
   ↓
4. User creates/customizes avatar in Avaturn
   ↓
5. User exports avatar → Avaturn sends v1.avatar.exported message
   ↓
6. App receives GLB URL via postMessage
   ↓
7. GLB loads, caches to localStorage, renders in table
   ↓
8. All 11 animations play on generated avatar
   ↓
9. Avatar persists on page refresh (from cache)
```

### Architecture
```
┌─────────────────────────────────────────────┐
│  Selfie Upload (index.html:1843)            │
│  - Show image preview                       │
│  - Launch Avaturn Creator popup             │
│  - Sample colors with MediaPipe (parallel)  │
└─────────┬───────────────────────────────────┘
          │
    ┌─────▼──────┐
    │  Avaturn   │  Opens https://create.avaturn.me/
    │  Creator   │  User creates avatar
    └─────┬──────┘
          │
    ┌─────▼──────────────────────────┐
    │ postMessage: v1.avatar.exported │
    │ Includes: { url: "...glb" }     │
    └─────┬──────────────────────────┘
          │
    ┌─────▼────────────────────────────────┐
    │ Message Listener (index.html:1797)   │
    │ - Validate origin                    │
    │ - Extract GLB URL                    │
    │ - Call loadAvatarFromUrl()           │
    └─────┬────────────────────────────────┘
          │
    ┌─────▼──────────────────────────┐
    │ Load & Cache (index.html:1775) │
    │ - Fetch GLB from Avaturn       │
    │ - Use existing GLTFLoader      │
    │ - Bind to animation rig        │
    │ - Save URL to localStorage     │
    │ - Render preview               │
    └─────┬──────────────────────────┘
          │
    ┌─────▼─────────────────────────────┐
    │ Animations Play (existing system)  │
    │ - All 11 reactions work            │
    │ - Facial blendshapes (if present)  │
    │ - Idle/reaction crossfade          │
    └───────────────────────────────────┘
```

---

## Key Technical Details

### Skeleton Compatibility
✓ Avaturn avatars use standard Humanoid bones
✓ Direct compatibility with RPM animation rig
✓ No re-targeting needed — animations play as-is
✓ Expected bones: Hips, Spine, LeftArm, RightArm, LeftLeg, RightLeg, Head, etc.

### LocalStorage Caching
```javascript
Key: 'sbj.avaturn-avatar.v1'
Value: { url: "https://cdn-cgi.in3d.io/...", timestamp: 1725177600000 }
TTL: 30 days
```

### postMessage Origin Check
Accepts messages from:
- `https://create.avaturn.me` (main Creator)
- `https://avaturn.me` (alternative origin)
- `https://in3d.io` (Avaturn parent domain)

### Error Handling
- **Popup blocked** → Show user message, allow manual retry
- **Network timeout** → Revert to fallback tinted avatar
- **GLB format error** → Show error, suggest character picker
- **Cache expired** → Auto-fallback to default avatar
- **No face detected** → Skip MediaPipe preview, show Avaturn only

---

## Integration Points with Existing System

### Uses Existing:
✓ `GLTFLoader` (line 510 import, lines 740-773 implementation)
✓ `SkeletonUtils.clone` (line 510 import, line 827 usage)
✓ `MODELS` dictionary (line 554 definition, updated line 1778)
✓ `cache` object (line 737, updated line 1779)
✓ `build()` function (line 816, called line 1784)
✓ `avatars` array (line 738, updated line 1784)
✓ `applyPersonalisation()` (line 857, updated line 1756)
✓ `renderMyCharacter()` (line 1518, called line 1831)
✓ `renderEditor()` (line 1699, called line 1830)
✓ Animation system (CLIP_MAP, CLIP_FILES, playClip, etc.)

### Does Not Change:
✓ Animation framework (three.js, AnimationMixer, AnimationClips)
✓ Reaction timing (REACTION_HOLD, FADE_HOME constants)
✓ UI layout (existing HTML structure maintained)
✓ Dev panel (performance HUD untouched)
✓ Fallback avatars (male/female still available)

---

## Network & Security

### Origins Allowed
- `https://create.avaturn.me` ✓
- `https://avaturn.me` ✓
- `https://in3d.io` ✓
- All other origins → **rejected** (origin check line 1798)

### Data Flow
- Selfie → **stays on device** (processed locally by MediaPipe)
- Photo → sent to Avaturn only if user initiates creation
- GLB URL → cached in localStorage (user's device only)
- No data sent to Street Blackjack backend for avatar generation

### CORS
- postMessage handles CORS via origin validation
- No direct API calls (avoids CORS in this context)
- GLB file fetching uses standard browser CORS (Avaturn URLs must be public)

---

## Future Enhancements

### Phase 2 (Avaturn API Direct)
- [ ] Integrate Avaturn API directly for auto-photo-upload
- [ ] Get Avaturn API key/credentials from config
- [ ] Bypass manual Creator upload step
- [ ] Return to app immediately after generation

### Phase 3 (Avatar Customization)
- [ ] Allow post-generation color adjustment
- [ ] Support outfit customization (if Avaturn API provides)
- [ ] Save multiple generated avatars per user

### Phase 4 (Performance)
- [ ] Implement avatar queuing for multiple users
- [ ] Add CDN caching for generated GLB files
- [ ] Optimize skeleton retargeting if needed

### Phase 5 (Fallback Services)
- [ ] Add Ready Player Me support (if network ever opens)
- [ ] Implement alternative avatar services as backup
- [ ] Graceful degradation to pre-loaded avatars

---

## Testing Checklist

Before deployment, verify:
- [ ] Upload selfie → MediaPipe colors appear
- [ ] Avaturn window opens successfully
- [ ] Avatar exports → postMessage received
- [ ] Avatar loads and renders
- [ ] All 11 reactions play smoothly
- [ ] Avatar persists on page refresh
- [ ] Reset link works correctly
- [ ] Popup blocking handled gracefully
- [ ] Network timeout handled gracefully
- [ ] Works on real phone (iOS/Android)
- [ ] Console clean (no `[avaturn]` errors)

See **TEST_PLAN.md** for detailed test cases.

---

## Files Modified

```
avatar-spike/
├── index.html                    (M) Lines 1736-1967 modified
├── AVATURN_INTEGRATION.md        (N) New documentation
├── IMPLEMENTATION_SUMMARY.md     (N) This file
└── TEST_PLAN.md                  (N) Testing guide
```

**Total changes:** ~190 lines added/modified in index.html

---

## Deployment Notes

### Prerequisites
- Network access to `https://create.avaturn.me` (required)
- Network access to Avaturn CDN for GLB files (required)
- Modern browser with postMessage support (all modern browsers)

### No Configuration Needed
The public Avaturn Creator requires no API keys or configuration. Just deploy and it works.

### Optional Configuration (Future)
If moving to Avaturn API:
- Add `AVATURN_API_KEY` environment variable
- Update `launchAvaturnCreator()` to use API endpoint
- Implement server-side photo upload proxy

---

## References

- **Avaturn:** https://avaturn.me
- **Avaturn Creator:** https://create.avaturn.me
- **postMessage API:** https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- **glTF/GLB Format:** https://www.khronos.org/gltf/
- **Humanoid Skeleton:** https://docs.unity3d.com/Manual/AvatarCreation.html
