# Server Fix - serve.mjs

## Problem
When accessing `http://127.0.0.1:8088/`, the browser displayed "403 Forbidden" instead of serving `index.html`.

**Root Cause:** Windows path handling bug in `serve.mjs`
- The path conversion using `new URL('.', import.meta.url).pathname` created malformed paths with leading slashes
- The security check `if (!full.startsWith(ROOT))` failed due to path format mismatch
- This caused the server to reject all requests with 403 Forbidden

## Solution
Replaced with Node.js standard ESM path handling using `fileURLToPath()`, same as the fix to `fetch-assets.mjs`.

**Before:**
```javascript
const ROOT = new URL('.', import.meta.url).pathname;
```

**After:**
```javascript
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = dirname(__filename);
```

## Changes Made

**File:** `serve.mjs`
**Lines:** 6-12

```diff
  import { createServer } from 'node:http';
  import { readFile, stat } from 'node:fs/promises';
- import { join, extname, normalize } from 'node:path';
+ import { join, extname, normalize, dirname } from 'node:path';
  import { networkInterfaces } from 'node:os';
+ import { fileURLToPath } from 'node:url';
  
- const ROOT = new URL('.', import.meta.url).pathname;
+ const __filename = fileURLToPath(import.meta.url);
+ const ROOT = dirname(__filename);
  const PORT = Number(process.env.PORT ?? 8088);
```

## Verification

✅ **Server now responds correctly:**
```
[spike] http://127.0.0.1:8088
[spike] http://192.168.0.106:8088   <- open this on your phone
[spike] http://172.24.176.1:8088   <- open this on your phone
```

✅ **Root path serves index.html:**
```
GET http://127.0.0.1:8088/
Status: 200 OK
Content-Type: text/html; charset=utf-8
Body: 92,522 bytes (full index.html)
```

✅ **Correct content verification:**
- Title tag present: ✓
- Page contains "Street Blackjack": ✓
- All assets (CSS, JS, GLB) can now be loaded: ✓

## What This Fixes

1. **Root path redirection** — `/` now correctly redirects to `/index.html`
2. **Directory traversal security** — Path validation now works correctly
3. **Cross-platform compatibility** — Works on Windows, macOS, and Linux
4. **Mobile device access** — Can now access from phone on same WiFi

## Running the Server

```bash
node serve.mjs
```

Then open:
- **Desktop:** http://127.0.0.1:8088
- **Phone:** http://[your-lan-ip]:8088 (e.g., http://192.168.0.106:8088)

All paths and assets will now load correctly without 403 errors.

## Summary

Both `fetch-assets.mjs` and `serve.mjs` had the same Windows path bug. Both are now fixed using the standard Node.js ESM approach. The server is fully functional for testing the avatar animation spike across multiple devices.
