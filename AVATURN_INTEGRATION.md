# Avaturn Avatar Generation Integration

## Overview
The selfie upload feature now integrates with **Avaturn** (https://avaturn.me) to generate rigged, personalized avatars from user photos.

## Flow

### User Journey
1. User clicks "MY CHARACTER" → "Upload a selfie"
2. Selects a photo from their device
3. MediaPipe preview shows color sampling (instant feedback)
4. Avaturn Creator window opens in a popup
5. User creates/generates avatar in Avaturn's interface
6. User exports the avatar as a `.glb` file
7. Avaturn sends `v1.avatar.exported` message with the GLB download URL
8. Avatar automatically loads and plays animations

## Implementation Details

### New Functions & Listeners

**`launchAvaturnCreator(photoFile)`**
- Opens Avaturn Creator at https://create.avaturn.me/ in a new window
- Currently user uploads photo manually in the Creator (more reliable)
- Production version could pass photo data via API if Avaturn supports it

**`loadAvatarFromUrl(glbUrl)`**
- Fetches and caches the generated GLB from Avaturn
- Loads via existing `GLTFLoader` mechanism
- Binds to RPM animation rig (Avaturn uses standard Humanoid bones)
- Returns info about mesh/blendshape count

**`window.addEventListener('message', ...)`**
- Listens for `v1.avatar.exported` event from Avaturn popup
- Validates origin (https://create.avaturn.me, https://avaturn.me, https://in3d.io)
- Triggers GLB download and loading on export

### LocalStorage Caching
- Avatar URL cached in `sbj.avaturn-avatar.v1` key
- Expires after 30 days
- Auto-loads cached avatar on page startup if available
- User can reset to default avatar via "Use default instead" link

### MediaPipe Fallback
- Runs in parallel while Avaturn generates avatar
- Samples skin/hair colors from photo
- Applies as tint to current avatar model
- Provides instant visual feedback while waiting for Avaturn

### Error Handling
- Gracefully falls back to pre-loaded avatar if Avaturn generation fails
- Handles popup blocking
- Handles network errors during GLB download
- Provides user-friendly error messages

## Configuration

### Required
No API keys needed for public Avaturn Creator access.

### Optional (For Production)
If using Avaturn's API directly to generate avatars server-side:
- Avaturn API key/credentials
- Backend endpoint to handle photo uploads and generate avatars
- CORS configuration for postMessage from Avaturn domains

## Skeleton Compatibility

Avaturn avatars ship with standard **Humanoid** bone structure:
- Hips, Spine, Chest, Neck, Head
- LeftShoulder, LeftArm, LeftForeArm, LeftHand (+ fingers)
- RightShoulder, RightArm, RightForeArm, RightHand (+ fingers)
- LeftUpLeg, LeftLeg, LeftFoot
- RightUpLeg, RightLeg, RightFoot

This matches our existing RPM animation rig, so all 11 animations (Idle, Dance, Laugh, Win, Lose, etc.) play without re-targeting.

## Testing Checklist

- [ ] Upload a selfie → MediaPipe colors appear in preview
- [ ] Avaturn Creator window opens
- [ ] User can create/customize avatar in Avaturn
- [ ] Export avatar → postMessage received
- [ ] Avatar loads and renders in table view
- [ ] Idle animation plays smoothly
- [ ] Reaction animations (win, lose, laugh) work correctly
- [ ] Face blendshapes (if present) animate with reactions
- [ ] Avatar persists after page refresh
- [ ] "Use default instead" link resets to fallback avatar
- [ ] Error handling: close Avaturn window → graceful fallback
- [ ] Error handling: network timeout → fallback tinted mesh

## Potential Improvements

1. **Server-side generation**: If direct photo-to-avatar API needed, implement backend endpoint
2. **Photo pre-upload**: Use Avaturn API to upload photo and pre-seed Creator
3. **Instant retargeting**: Add rig re-targeting if Avaturn uses non-standard bones
4. **Multiple export formats**: Support both GLB and USDZ if needed
5. **Avatar editor**: Allow color customization post-generation (currently MediaPipe only)

## References

- Avaturn: https://avaturn.me
- Avaturn Creator: https://create.avaturn.me
- Avatar Generation Docs: https://avaturn.me/api (if available)
- Standard Humanoid Bones: https://en.wikipedia.org/wiki/Skeletal_animation
