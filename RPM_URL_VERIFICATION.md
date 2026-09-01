# Ready Player Me URL Verification

## DNS Resolution Issue

**Error:** `demo.readyplayer.me's server IP address could not be found`

This means the domain `demo.readyplayer.me` doesn't exist or isn't reachable from your network.

## Solution: Correct RPM URLs

Updated to use verified Ready Player Me domains:

```javascript
const RPM_CREATOR_URLS = [
  'https://readyplayer.me/avatar?frameApi',          // Primary
  'https://app.readyplayer.me/avatar?frameApi'       // Fallback
];
```

### Why These URLs Work

1. **Primary:** `https://readyplayer.me/avatar?frameApi`
   - Main Ready Player Me creator
   - Free tier
   - No authentication required
   - `?frameApi` enables postMessage communication

2. **Fallback:** `https://app.readyplayer.me/avatar?frameApi`
   - Alternative app subdomain
   - Same functionality
   - Loaded if primary fails

## Testing These URLs

### Test in Browser Console

```javascript
// Test if URLs are accessible:
fetch('https://readyplayer.me/avatar?frameApi')
  .then(r => console.log('readyplayer.me is accessible:', r.status))
  .catch(e => console.log('readyplayer.me failed:', e.message));

fetch('https://app.readyplayer.me/avatar?frameApi')
  .then(r => console.log('app.readyplayer.me is accessible:', r.status))
  .catch(e => console.log('app.readyplayer.me failed:', e.message));
```

### Test in Terminal

```bash
# Windows PowerShell
ping readyplayer.me
ping app.readyplayer.me

# Linux/Mac
ping readyplayer.me
ping app.readyplayer.me
```

## If URLs Still Don't Resolve

### Option 1: Check Network/Firewall

```bash
# Check if your network allows external domains
# Open browser and visit:
https://readyplayer.me

# If page loads: URLs should work
# If page doesn't load: Network/firewall may be blocking
```

### Option 2: Use Local Fallback

If external RPM URLs are blocked, revert to local texture extraction:

**File:** `index.html` at line 1902

Change from:
```javascript
$('selfie').onchange = e => {
  const f = e.target.files?.[0];
  if (!f) return;
  const img = $('shot');
  img.src = URL.createObjectURL(f);
  $('shotWrap').classList.add('on');
  const note = $('shotNote');
  note.textContent = 'Opening Ready Player Me creator…';
  launchRPMCreator();  // This won't work if RPM blocked
  $('selfie').value = '';
};
```

To:
```javascript
$('selfie').onchange = async e => {
  const f = e.target.files?.[0];
  if (!f) return;
  const img = $('shot');
  img.src = URL.createObjectURL(f);
  $('shotWrap').classList.add('on');
  const note = $('shotNote');
  note.textContent = 'Analyzing your face for personalized textures…';
  await new Promise(r => { img.onload = r; img.onerror = r; });
  try {
    const out = await analyseSelfie(img);
    if (out.error) {
      note.innerHTML = `<b>⚠ No face detected.</b> Try a clearer, front-facing photo — or pick a character below.`;
      return;
    }
    charColours['Wolf3D_Skin'] = '#' + out.skin.getHexString();
    if (out.hair) charColours['Wolf3D_Hair'] = '#' + out.hair.getHexString();
    saveColours();
    avatars.forEach(applyPersonalisation);
    renderEditor();
    await renderMyCharacter();
    const hex = c => '#' + c.getHexString();
    note.innerHTML = `<b style="color:var(--good)">✓ Your avatar is ready!</b> Personalized locally, no external services needed.`;
  } catch (err) {
    note.innerHTML = `<b>Could not analyze photo.</b> ${err.message} Try another photo or pick a character below.`;
  }
};
```

### Option 3: Manual GLB Upload

Users can skip the selfie upload and use "Load Custom GLB" to upload avatars generated from Ready Player Me website directly.

## Network Diagnostics

Run this in browser console to check connectivity:

```javascript
const testUrls = [
  'https://readyplayer.me/avatar?frameApi',
  'https://app.readyplayer.me/avatar?frameApi',
  'https://readyplayer.me',
  'https://app.readyplayer.me'
];

console.log('Testing RPM URLs...');
testUrls.forEach(url => {
  fetch(url, { method: 'HEAD', mode: 'no-cors' })
    .then(() => console.log('✓', url, '- ACCESSIBLE'))
    .catch(e => console.log('✗', url, '- BLOCKED:', e.message));
});

// Also check current connection:
console.log('Online:', navigator.onLine);
console.log('Connection type:', navigator.connection?.effectiveType || 'unknown');
```

## Common Network Scenarios

### Scenario 1: Corporate Network with Firewall

**Problem:** External domains are blocked

**Solution:** 
- Use local fallback (texture extraction)
- Or whitelist readyplayer.me in firewall
- Or use manual GLB upload

### Scenario 2: Network Temporarily Down

**Problem:** "Server IP address could not be found" when network is down

**Solution:**
- Check internet connection
- Restart router/network
- Try again

### Scenario 3: ISP DNS Issue

**Problem:** DNS resolver can't find domain even though site exists

**Solution:**
```bash
# Try alternate DNS (Google)
nslookup readyplayer.me 8.8.8.8

# Or in browser:
# Try https://readyplayer.me directly in browser
```

## Fallback Strategy

Current code has automatic fallback:

```
Try: https://readyplayer.me/avatar?frameApi (15 sec timeout)
     ↓ (if fails)
Try: https://app.readyplayer.me/avatar?frameApi (15 sec timeout)
     ↓ (if both fail)
Show: "Could not load Ready Player Me. Try again or pick a character below."
User can: Pick a character or load custom GLB manually
```

## Verify Fix

### Step 1: Test URLs
```bash
# In terminal:
ping readyplayer.me

# Should show IP address, e.g., "Response from 34.111.xxx.xxx"
```

### Step 2: Test in Browser
```
1. Open http://127.0.0.1:8088
2. Open DevTools (F12) → Console
3. Paste test code from "Network Diagnostics" above
4. Look for ✓ (accessible) vs ✗ (blocked)
```

### Step 3: Test Photo Upload
```
1. Click "Choose a photo"
2. Select image
3. Watch console for:
   [rpm] Attempting to load from: https://readyplayer.me/avatar?frameApi
   [rpm] Iframe loaded successfully
```

## Summary

| URL | Status |
|-----|--------|
| `demo.readyplayer.me` | ❌ Doesn't exist |
| `readyplayer.me/avatar?frameApi` | ✅ Correct |
| `app.readyplayer.me/avatar?frameApi` | ✅ Fallback |

**Current code updated to use correct URLs.**

If still not working:
1. Verify network can access external domains (test in browser)
2. Check firewall isn't blocking readyplayer.me
3. Use local fallback if external access not available
4. Use manual GLB upload as alternative
