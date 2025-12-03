# 🚀 Siquijor Province - Quick Start

Populate your database with **real boundary data** for Siquijor Province in 2 minutes!

## Prerequisites ✓

Make sure these are done first:

```bash
# 1. Dev server is running
npm run dev

# 2. Database is set up
# (Check QUICKSTART.md if not done yet)
```

## Seed Siquijor Province (One Command)

```bash
npm run seed:siquijor
```

That's it! ✨

## What Happens

1. **Fetches data from OpenStreetMap** (~30-60 seconds)
   - 6 municipalities
   - 140+ barangays
   - All geographical boundaries

2. **Imports into your database** (~1-2 minutes)
   - Creates all municipalities
   - Creates all barangays
   - Sets up relationships

3. **Ready to view!**
   - Open http://localhost:5173
   - See Siquijor Province on the map
   - Click boundaries for info

## Expected Output

```
Fetching Siquijor data from OpenStreetMap...
✓ Fetched 146 administrative boundaries

Found:
  - 6 municipalities  
  - 140 barangays

Converting municipalities...
  ✓ Enrique Villanueva (municipality)
  ✓ Larena (municipality)
  ✓ Lazi (municipality)
  ✓ Maria (municipality)
  ✓ San Juan (municipality)
  ✓ Siquijor (municipality)

Converting barangays...
  ✓ Banlasan (barangay)
  ✓ Bongtod (barangay)
  ...
  (140+ barangays)

Seeding Complete!
  Total: 146 localities created
```

## View Your Data

### On the Map
```
http://localhost:5173
```
- See all boundaries displayed
- Click for information
- Hover to highlight

### In Admin Panel
```
http://localhost:5173/admin
```
- View all 146 localities
- Edit or manage data

### Via API
```bash
curl http://localhost:5173/api/localities
```

## Alternative: Step by Step

```bash
# Fetch only
npm run seed:siquijor:fetch

# Import only (after fetching)
npm run seed:siquijor:import
```

## What You Get

✅ **6 Municipalities:**
- Enrique Villanueva
- Larena
- Lazi
- Maria
- San Juan
- Siquijor

✅ **140+ Barangays** across all municipalities

✅ **Real Boundaries** from OpenStreetMap

✅ **Ready to Use** - Add voters, visualize, analyze

## Troubleshooting

**Problem: "Overpass API error"**
- Wait a few minutes and try again
- The API may be busy

**Problem: "Failed to create locality"**
- Make sure `npm run dev` is running
- Check your `.env` database credentials

**Problem: "Data file not found"**
- Run: `npm run seed:siquijor:fetch` first

## Next Steps

After seeding:

1. **Add voter data** for specific barangays
2. **Customize** the map colors in `Map.svelte`
3. **Export** data: `curl http://localhost:5173/api/localities/geojson > siquijor.geojson`
4. **Add more provinces** using the same scripts (see README_SIQUIJOR_SEEDER.md)

## Need More Details?

See [scripts/README_SIQUIJOR_SEEDER.md](scripts/README_SIQUIJOR_SEEDER.md) for:
- Detailed explanations
- Troubleshooting guide
- Customization options
- How to fetch other provinces

---

**Happy mapping! 🗺️🇵🇭**

