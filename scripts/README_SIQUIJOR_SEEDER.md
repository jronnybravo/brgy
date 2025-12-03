# Siquijor Province Seeder

This guide explains how to populate your database with **real boundary data** for Siquijor Province, Philippines, including all municipalities and barangays.

## 🗺️ About Siquijor Province

Siquijor is an island province in the Central Visayas region of the Philippines. It consists of:

- **6 Municipalities:**
  - Enrique Villanueva
  - Larena
  - Lazi
  - Maria
  - San Juan
  - Siquijor (capital)

- **Approximately 140+ Barangays** across all municipalities

## 🚀 Quick Start (2 Steps)

### Prerequisites
- Dev server must be running: `npm run dev`
- Database must be set up (see QUICKSTART.md)
- Internet connection (to fetch from OpenStreetMap)

### Option 1: One Command (Fetch + Seed)

```bash
npm run seed:siquijor
```

This will:
1. Fetch boundary data from OpenStreetMap
2. Convert to our format
3. Import into your database

**Total time:** ~2-3 minutes

### Option 2: Step by Step

```bash
# Step 1: Fetch data from OpenStreetMap (takes 30-60 seconds)
npm run seed:siquijor:fetch

# Step 2: Import into database (takes 1-2 minutes)
npm run seed:siquijor:import
```

## 📋 Detailed Instructions

### Step 1: Fetch Boundary Data

```bash
node scripts/fetch-siquijor-data.js
```

**What it does:**
- Queries OpenStreetMap Overpass API
- Fetches all municipality and barangay boundaries
- Converts OSM format to GeoJSON
- Saves to `data/siquijor/siquijor-localities.json`

**Expected output:**
```
======================================================================
Siquijor Province Data Fetcher
======================================================================

Fetching Siquijor data from OpenStreetMap...
This may take 30-60 seconds...

✓ Fetched XX administrative boundaries

Found:
  - 6 municipalities
  - 140+ barangays

Converting municipalities...
  ✓ Enrique Villanueva (municipality)
  ✓ Larena (municipality)
  ...

Converting barangays...
  ✓ Barangay Banlasan (barangay)
  ✓ Barangay Bongtod (barangay)
  ...

======================================================================
Success!
======================================================================
Total localities: 146
Output file: /path/to/data/siquijor/siquijor-localities.json

Next step:
  node scripts/seed-siquijor.js
```

### Step 2: Seed the Database

```bash
node scripts/seed-siquijor.js
```

**What it does:**
- Reads the fetched data
- Creates municipalities first
- Creates barangays with proper relationships
- Imports all data into your database

**Expected output:**
```
======================================================================
Siquijor Province Database Seeder
======================================================================

Loading data...
Loaded 146 localities

Distribution:
  - 6 municipalities
  - 140 barangays

Step 1: Creating municipalities...
----------------------------------------------------------------------
  ✓ Enrique Villanueva (ID: 1)
  ✓ Larena (ID: 2)
  ✓ Lazi (ID: 3)
  ✓ Maria (ID: 4)
  ✓ San Juan (ID: 5)
  ✓ Siquijor (ID: 6)

Step 2: Creating barangays with parent relationships...
----------------------------------------------------------------------
  ✓ Banlasan (ID: 7)
  ✓ Bongtod (ID: 8)
  ...

======================================================================
Seeding Complete!
======================================================================

Results:
  Municipalities: 6 created, 0 failed
  Barangays: 140 created, 0 failed
  Total: 146 localities created

Next steps:
  - Visit http://localhost:5173 to see the map
  - Visit http://localhost:5173/admin to manage localities
```

## 🔍 View Your Data

After seeding:

1. **View on Map:**
   - Open http://localhost:5173
   - You'll see all municipalities and barangays displayed as polygons
   - Click on any boundary for information
   - Hover to highlight

2. **Admin Panel:**
   - Open http://localhost:5173/admin
   - See all 146 localities in a table
   - Edit, delete, or add more localities

3. **Via API:**
   ```bash
   # Get all localities
   curl http://localhost:5173/api/localities
   
   # Get as GeoJSON for mapping
   curl http://localhost:5173/api/localities/geojson
   ```

## 🛠️ How It Works

### Data Source: OpenStreetMap

The data comes from OpenStreetMap's Overpass API, which provides:
- Official administrative boundaries
- Community-verified data
- Free and open access
- Regular updates

### Query Structure

The script queries for:
```
- admin_level=4: Province (Siquijor)
- admin_level=5: Municipalities (6 total)
- admin_level=7: Barangays (140+ total)
```

### Data Format

Each locality is stored as:
```json
{
  "name": "Municipality Name",
  "code": "PSGC-CODE",
  "type": "municipality",
  "boundaryGeoJSON": {
    "type": "Polygon",
    "coordinates": [[[lon, lat], [lon, lat], ...]]
  }
}
```

## ⚠️ Troubleshooting

### "Overpass API error" or timeout

**Problem:** The Overpass API is busy or down.

**Solutions:**
1. Wait a few minutes and try again
2. Check API status: https://overpass-api.de/api/status
3. Try during off-peak hours (avoid European afternoon)

### "Failed to create locality"

**Problem:** Database connection or validation error.

**Solutions:**
1. Make sure dev server is running: `npm run dev`
2. Check database credentials in `.env`
3. Verify MySQL is running: `mysql -u root -p`
4. Check the error message for specific issues

### "Data file not found"

**Problem:** Fetch script hasn't been run yet.

**Solution:**
```bash
node scripts/fetch-siquijor-data.js
```

### "No data returned from OpenStreetMap"

**Problem:** Network issue or OSM data unavailable.

**Solutions:**
1. Check internet connection
2. Try again later
3. Check if Overpass API is operational

### Duplicate entries

**Problem:** Running the seeder multiple times.

**Solution:**
1. Go to http://localhost:5173/admin
2. Delete existing Siquijor localities
3. Run seeder again

Or use MySQL:
```sql
DELETE FROM localities WHERE name LIKE '%Siquijor%';
```

## 📊 Data Quality

### What You Get
- ✅ Official administrative boundaries
- ✅ Accurate coordinates
- ✅ Municipality-barangay relationships
- ✅ PSGC codes (when available)
- ✅ Population data (when available)

### Limitations
- ⚠️ Data accuracy depends on OSM contributors
- ⚠️ Some boundaries may need manual adjustment
- ⚠️ Population data may be outdated
- ⚠️ Some parent-child relationships may need manual linking

## 🎨 Customization

### Fetch Other Provinces

Edit `scripts/fetch-siquijor-data.js`:

```javascript
// Change the province name in the query
area["name"="Cebu"]["admin_level"="4"]->.province;
// or
area["name"="Bohol"]["admin_level"="4"]->.province;
```

### Fetch Specific Municipalities

```javascript
// Get only one municipality
area["name"="Larena"]["admin_level"="5"]->.municipality;
```

### Adjust Query Timeout

If fetching times out:
```javascript
[out:json][timeout:180]; // Increase from 90 to 180 seconds
```

## 📚 Additional Scripts

### Verify Data After Seeding

```bash
# Count localities
curl http://localhost:5173/api/localities | jq 'length'

# List all municipalities
curl http://localhost:5173/api/localities | jq '.[] | select(.type=="municipality") | .name'

# List all barangays
curl http://localhost:5173/api/localities | jq '.[] | select(.type=="barangay") | .name'
```

### Export Data

```bash
# Export as GeoJSON
curl http://localhost:5173/api/localities/geojson > siquijor-export.geojson
```

## 🆘 Need Help?

1. **Check the main documentation:**
   - [QUICKSTART.md](../QUICKSTART.md) - Setup guide
   - [DATA_SOURCES.md](../DATA_SOURCES.md) - About boundary data
   - [API.md](../API.md) - API reference

2. **Verify prerequisites:**
   ```bash
   # Check if dev server is running
   curl http://localhost:5173/api/localities
   
   # Check database connection
   mysql -u root -p -e "USE brgy_mapping; SHOW TABLES;"
   ```

3. **Review logs:**
   - Check terminal output for specific error messages
   - Look for network errors, database errors, or API errors

## 🎉 Success!

Once seeding is complete, you'll have:
- ✅ 6 municipalities mapped
- ✅ 140+ barangays mapped
- ✅ All boundaries displayed on interactive map
- ✅ Complete administrative hierarchy
- ✅ Ready to add voter data

Enjoy exploring Siquijor Province on your map! 🗺️🇵🇭

