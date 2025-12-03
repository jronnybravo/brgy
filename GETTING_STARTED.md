# Getting Started with Barangay Mapping System

Welcome! This guide will help you understand how to work with locality boundaries and get your mapping system up and running.

## 🎯 What This System Does

This application helps you:

1. **Store geographical boundaries** of localities (barangays, districts, etc.) in a database
2. **Display those boundaries** on an interactive map
3. **Manage voter data** associated with each locality
4. **Import boundary data** from various sources

## 📊 Understanding Boundary Data

### What Are Boundary Data?

Boundary data define the geographical area of a locality. They consist of coordinates that form a polygon outlining the area.

**Example**: A simple rectangular barangay boundary
```
(121.0, 14.0) -------- (121.02, 14.0)
     |                        |
     |    Barangay Area       |
     |                        |
(121.0, 14.02) ------- (121.02, 14.02)
```

### How Boundaries Are Stored

We use **GeoJSON format** - a standard way to represent geographical data:

```json
{
  "type": "Polygon",
  "coordinates": [
    [
      [121.0, 14.0],
      [121.02, 14.0],
      [121.02, 14.02],
      [121.0, 14.02],
      [121.0, 14.0]
    ]
  ]
}
```

**Key Points:**
- Coordinates are `[longitude, latitude]` pairs
- The first and last point must be the same (closed polygon)
- Outer array can contain multiple rings (for holes)

## 🗺️ Where to Get Boundary Data

You have three main options:

### Option 1: OpenStreetMap (Recommended - Free)

OpenStreetMap (OSM) is a free, community-maintained map of the world.

**Step by step:**

1. **Find your area on OSM**: https://www.openstreetmap.org/
2. **Use Overpass Turbo** to query boundaries: https://overpass-turbo.eu/

Example query for Philippine barangays:
```
[out:json];
area["name"="Quezon City"];
relation(area)["admin_level"="7"];
out geom;
```

3. **Export as GeoJSON**
4. **Convert** using our script:
```bash
node scripts/convert-osm-to-localities.js osm-data.json localities.json
```

5. **Import** to your database:
```bash
node scripts/import-localities.js localities.json
```

### Option 2: Draw Your Own (Easy, No Technical Skills)

Perfect if you want to manually create boundaries:

1. Go to https://geojson.io
2. Use the polygon tool to draw on the map
3. Edit the properties on the right:
   ```json
   {
     "name": "Barangay San Antonio",
     "code": "BRG-001",
     "type": "barangay",
     "population": 5000
   }
   ```
4. Copy the entire JSON from the right panel
5. Paste into the Admin Panel in your app

### Option 3: Official Government Data

For the Philippines:

**PhilGIS**: https://philgis.org/
- Download official shapefiles
- Convert using QGIS:
  1. Open shapefile in QGIS
  2. Right-click layer → Export → Save Features As
  3. Format: GeoJSON
  4. CRS: EPSG:4326
  5. Save

**Other countries**: Check your national mapping agency.

## 🚀 Quick Setup (5 Minutes)

### Prerequisites
- Node.js 18+ installed
- MySQL 8.0+ installed

### Steps

**1. Install dependencies**
```bash
npm install
```

**2. Create database**
```bash
mysql -u root -p
```
```sql
CREATE DATABASE brgy_mapping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

**3. Configure environment**
```bash
cp env.example .env
```

Edit `.env`:
```env
DB_USERNAME=root
DB_PASSWORD=your_mysql_password
```

**4. Start the app**
```bash
npm run dev
```

Visit: http://localhost:5173

**5. Add sample data**
```bash
node scripts/import-localities.js sample-data/multiple-localities.json
```

Refresh your browser - you should see localities on the map!

## 📝 How to Add Your Own Data

### Method 1: Using the Admin Panel (GUI)

1. Go to http://localhost:5173/admin
2. Click "Add New Locality"
3. Fill in the form:
   - **Name**: E.g., "Barangay San Antonio"
   - **Code**: E.g., "BRG-001" (optional)
   - **Type**: Select from dropdown
   - **Population**: Number of residents (optional)
   - **Boundary GeoJSON**: Paste GeoJSON here

**To get GeoJSON:**
- Click "Create on geojson.io" link
- Draw your boundary
- Copy the JSON

4. Click "Create Locality"

### Method 2: Using JSON Files (Bulk Import)

1. Create a JSON file with your data:

**Single locality** (`my-locality.json`):
```json
{
  "name": "Barangay San Antonio",
  "code": "BRG-001",
  "type": "barangay",
  "population": 5200,
  "boundaryGeoJSON": {
    "type": "Polygon",
    "coordinates": [[[121.0, 14.0], [121.02, 14.0], ...]]
  }
}
```

**Multiple localities** (`my-localities.json`):
```json
[
  { "name": "Barangay 1", ... },
  { "name": "Barangay 2", ... },
  { "name": "Barangay 3", ... }
]
```

2. Import using the script:
```bash
node scripts/import-localities.js my-localities.json
```

### Method 3: Using the API Directly

```bash
curl -X POST http://localhost:5173/api/localities \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Barangay San Antonio",
    "boundaryGeoJSON": {
      "type": "Polygon",
      "coordinates": [[[121.0, 14.0], ...]]
    }
  }'
```

## 🔍 Understanding the Database

After importing, your data is stored in MySQL:

```
localities table
├── id (auto-generated)
├── name
├── code
├── type
├── boundaryGeoJSON (the coordinates)
├── centroidLat (calculated center)
├── centroidLng (calculated center)
├── population
└── timestamps
```

The app:
1. Reads localities from database
2. Converts GeoJSON to Leaflet format
3. Displays as polygons on the map

## 🎨 What You Can Do Next

### View the Map
- Visit http://localhost:5173
- See your localities displayed
- Click on boundaries for info popups
- Hover for highlighting

### Manage Data
- Visit http://localhost:5173/admin
- Add, edit, or delete localities
- View all localities in a table

### Add Voters
```bash
node scripts/import-voters.js sample-data/sample-voters.json
```

### Access via API
```javascript
// Get all localities
fetch('/api/localities')
  .then(res => res.json())
  .then(data => console.log(data));

// Get as GeoJSON for mapping
fetch('/api/localities/geojson')
  .then(res => res.json())
  .then(geojson => {
    // Use with Leaflet or other mapping libraries
  });
```

## 🛠️ Customization

### Change Map Appearance

Edit `src/lib/components/Map.svelte`:

```javascript
// Change tile layer (map background)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')

// Style boundaries
style: (feature) => ({
  fillColor: '#3388ff',    // Change colors
  weight: 2,               // Border thickness
  color: '#0066cc',
  fillOpacity: 0.3
})
```

### Add New Fields

1. Edit `src/lib/database/entities/Locality.ts`
2. Add your field:
```typescript
@Column({ type: 'varchar', length: 100, nullable: true })
mayorName?: string;
```
3. Restart the app (TypeORM auto-updates in dev mode)
4. Update forms and displays as needed

## 📚 Complete Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Fast setup guide
- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[DATA_SOURCES.md](DATA_SOURCES.md)** - How to get boundary data
- **[API.md](API.md)** - API endpoint reference
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Technical overview

## ❓ Common Questions

**Q: What coordinate system should I use?**
A: WGS 84 (EPSG:4326) - the standard for web mapping. Longitude/latitude in decimal degrees.

**Q: How accurate should boundaries be?**
A: As accurate as you need. For overview maps, simplified boundaries work fine. For detailed work, use precise coordinates.

**Q: Can I import data from Google Maps?**
A: Google Maps data is proprietary. Use OpenStreetMap, government sources, or draw your own.

**Q: My polygon doesn't close properly**
A: Ensure the first and last coordinate are identical: `[121.0, 14.0]` at start and end.

**Q: The map shows wrong location**
A: Check coordinate order - GeoJSON uses `[longitude, latitude]`, not `[latitude, longitude]`.

**Q: Can I have holes in polygons?**
A: Yes! Add additional coordinate arrays for holes:
```json
{
  "type": "Polygon",
  "coordinates": [
    [[outer boundary...]],
    [[hole 1...]],
    [[hole 2...]]
  ]
}
```

## 🆘 Troubleshooting

**Database connection failed**
- Check MySQL is running: `mysql -u root -p`
- Verify password in `.env`

**Map not showing**
- Check browser console for errors (F12)
- Verify you have imported localities
- Check GeoJSON is valid

**Import script errors**
- Ensure dev server is running (`npm run dev`)
- Check JSON file format
- Verify file path is correct

## 🎓 Learning Resources

- **GeoJSON**: https://geojson.org/
- **Leaflet**: https://leafletjs.com/examples.html
- **OSM**: https://wiki.openstreetmap.org/
- **QGIS**: https://www.qgistutorials.com/

## 💡 Tips

1. **Start small**: Import 2-3 localities first to test
2. **Validate GeoJSON**: Use https://geojson.io/ to check
3. **Simplify boundaries**: Complex boundaries with thousands of points are slow. Use tools like Mapshaper to simplify.
4. **Back up data**: Export GeoJSON regularly
5. **Test coordinates**: Plot a single point first to ensure correct location

---

**Ready to start?** Follow the Quick Setup section above!

**Need help?** Check the other documentation files or open an issue.

