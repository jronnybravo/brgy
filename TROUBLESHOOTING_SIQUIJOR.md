# Troubleshooting Siquijor Data Fetch

## Problem: "No data returned from OpenStreetMap"

### Solution 1: Use the Bounding Box Method (More Reliable) ✅

I've created an alternative fetch script that's more reliable:

```bash
node scripts/fetch-siquijor-bbox.js
```

This uses geographical coordinates instead of area names, which is more reliable.

### Solution 2: Check Overpass API Status

The Overpass API might be overloaded. Check status:

```bash
curl https://overpass-api.de/api/status
```

Or visit: https://overpass-api.de/api/status

**If "available" shows 0**, the API is busy. Wait 5-10 minutes and try again.

### Solution 3: Try Alternative Overpass Servers

Edit the script and change the API endpoint:

```javascript
// Try these alternatives:
const OVERPASS_API = 'https://overpass.kumi.systems/api/interpreter';
// or
const OVERPASS_API = 'https://overpass.openstreetmap.ru/api/interpreter';
```

### Solution 4: Use Pre-Downloaded Data

If the API continues to fail, you can manually download the data:

1. Visit: https://overpass-turbo.eu/
2. Paste this query:
```
[out:json][timeout:90];
(
  relation["boundary"="administrative"]["admin_level"="5"](9.1,123.4,9.3,123.7);
  relation["boundary"="administrative"]["admin_level"="7"](9.1,123.4,9.3,123.7);
);
out geom;
```
3. Click "Run"
4. Click "Export" → "raw data directly from Overpass API"
5. Save as `siquijor-raw.json`
6. Use the convert script (see below)

### Solution 5: Test with a Simple Query

Test if Overpass API is working at all:

```bash
curl -X POST "https://overpass-api.de/api/interpreter" \
  --data 'data=[out:json];node(14.5995,120.9842,14.6,120.99);out;' \
  | jq '.elements | length'
```

If this returns `0` or errors, the API is definitely down.

## Which Script to Use?

### ✅ Recommended: Bounding Box Method
```bash
node scripts/fetch-siquijor-bbox.js
```

**Pros:**
- More reliable
- Doesn't depend on area name matching
- Faster query

**Cons:**
- May include nearby areas (but we filter by name)

### Alternative: Area-Based Method
```bash
node scripts/fetch-siquijor-data.js
```

**Pros:**
- More precise (only Siquijor)

**Cons:**
- May fail if area name doesn't match exactly
- More complex query

## Common Errors

### Error: "ECONNREFUSED" or "Network error"

**Cause:** Can't reach Overpass API

**Solutions:**
1. Check internet connection
2. Try a different network (VPN might block it)
3. Try alternative API server (see Solution 3 above)

### Error: "Timeout"

**Cause:** Query takes too long

**Solutions:**
1. The bbox method should be faster
2. Try during off-peak hours (avoid European afternoon)
3. Increase timeout in the script:
```javascript
[out:json][timeout:180]; // Changed from 90 to 180
```

### Error: "429 Too Many Requests"

**Cause:** Rate limited

**Solutions:**
1. Wait 5-10 minutes
2. Don't run multiple queries simultaneously

## Testing Your Fix

After making changes, test:

```bash
# Test fetch
node scripts/fetch-siquijor-bbox.js

# Expected output: Should show 6 municipalities and 140+ barangays
# Check: data/siquijor/siquijor-localities.json should exist

# Test import
node scripts/seed-siquijor.js

# Expected: Should create all localities in database
```

## Manual Workaround

If all else fails, you can create a manual dataset:

1. Download from another source (PhilGIS, etc.)
2. Convert to GeoJSON
3. Format as:
```json
[
  {
    "name": "Municipality Name",
    "type": "municipality",
    "boundaryGeoJSON": {
      "type": "Polygon",
      "coordinates": [[[lon, lat], ...]]
    }
  }
]
```
4. Save as `data/siquijor/siquijor-localities.json`
5. Run: `node scripts/seed-siquijor.js`

## Getting Help

If none of these solutions work:

1. **Check API Status:** https://overpass-api.de/api/status
2. **Test simple query:** Run the curl command in Solution 5
3. **Try different time:** European afternoon is peak time
4. **Check Overpass Wiki:** https://wiki.openstreetmap.org/wiki/Overpass_API

## Quick Reference

### Current Working Command
```bash
# Most reliable method
node scripts/fetch-siquijor-bbox.js

# Then seed
node scripts/seed-siquijor.js

# Or both at once
npm run seed:siquijor
```

### Expected Timeline
- **Fetch:** 30-60 seconds
- **Seed:** 1-2 minutes
- **Total:** ~3 minutes

### Files Created
- `data/siquijor/siquijor-localities.json` - Fetched data
- Database entries for all localities

### Success Indicators
- ✅ "Success!" message displayed
- ✅ File created with 140+ localities
- ✅ Seeding shows "X localities created"
- ✅ Map displays boundaries at http://localhost:5173

---

**Current Status:** The bounding box method (`fetch-siquijor-bbox.js`) is more reliable and should work even when the area-based query fails.

Try: `node scripts/fetch-siquijor-bbox.js`

