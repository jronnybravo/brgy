# Data Sources for Locality Boundaries

This guide explains how to obtain real boundary data for your localities.

## 1. OpenStreetMap (Free)

OpenStreetMap is a free, community-driven mapping database with extensive coverage.

### Using Overpass Turbo (Interactive)

1. Visit: https://overpass-turbo.eu/
2. Enter a query to find administrative boundaries:

```
// For Philippine Barangays in a specific city
[out:json];
area["name"="Quezon City"]["admin_level"="5"]->.city;
(
  relation(area.city)["admin_level"="7"];
);
out geom;
```

3. Click "Run" to see results
4. Click "Export" → "GeoJSON" to download

### Using Overpass API (Programmatic)

```bash
# Replace "Quezon City" with your target city
curl -X POST \
  "https://overpass-api.de/api/interpreter" \
  --data '[out:json];area["name"="Quezon City"];relation(area)["admin_level"="7"];out geom;' \
  > boundaries.json
```

### Admin Levels Reference
- `admin_level=4` - Province
- `admin_level=5` - City/Municipality  
- `admin_level=7` - Barangay
- `admin_level=8` - Purok/Sitio

## 2. Philippine GIS Data Portal (Official)

### PhilGIS - https://philgis.org/

1. Navigate to the downloads section
2. Download administrative boundary shapefiles
3. Convert to GeoJSON using one of these methods:

#### Method A: Using QGIS (GUI)
1. Download QGIS: https://qgis.org/
2. Open the shapefile in QGIS
3. Right-click layer → Export → Save Features As
4. Format: GeoJSON
5. CRS: EPSG:4326 (WGS 84)
6. Save

#### Method B: Using ogr2ogr (Command Line)
```bash
# Install GDAL first
# Mac: brew install gdal
# Ubuntu: sudo apt-get install gdal-bin

# Convert shapefile to GeoJSON
ogr2ogr -f GeoJSON \
  -t_srs EPSG:4326 \
  output.geojson \
  input.shp
```

## 3. National Mapping and Resource Information Authority (NAMRIA)

- Website: https://www.namria.gov.ph/
- Provides official government mapping data
- May require formal request for detailed boundary data

## 4. Local Government Unit (LGU) Websites

Many cities and municipalities publish GIS data on their websites:
- Check the Planning and Development Office
- IT or MIS Department
- Public Affairs Office

## 5. Manual Digitization

For areas without available data, you can manually trace boundaries:

### Using geojson.io

1. Visit: https://geojson.io/
2. Use drawing tools to trace boundaries on the map
3. Edit properties panel on the right:
   ```json
   {
     "name": "Barangay Name",
     "code": "BRG-001",
     "type": "barangay",
     "population": 5000
   }
   ```
4. Click "Save" → Download GeoJSON

### Tips for Manual Digitization:
- Use satellite imagery for accuracy
- Follow natural boundaries (rivers, roads)
- Zoom in closely for precise boundaries
- Validate with local maps or residents

## 6. Converting Your Data to the Required Format

Once you have GeoJSON data, structure it for your API:

### Single Locality Format:

```json
{
  "name": "Barangay Name",
  "code": "BRG-001",
  "type": "barangay",
  "population": 5000,
  "boundaryGeoJSON": {
    "type": "Polygon",
    "coordinates": [
      [
        [121.0, 14.0],
        [121.05, 14.0],
        [121.05, 14.05],
        [121.0, 14.05],
        [121.0, 14.0]
      ]
    ]
  }
}
```

### Important Notes:

1. **Coordinate Order**: GeoJSON uses `[longitude, latitude]` order
2. **CRS**: Use EPSG:4326 (WGS 84) - the standard for web maps
3. **Ring Closure**: Polygon rings must be closed (first = last coordinate)
4. **Topology**: No self-intersections allowed

## 7. Importing Data into Your System

### Using cURL:

```bash
# Single locality
curl -X POST http://localhost:5173/api/localities \
  -H "Content-Type: application/json" \
  -d @sample-data/sample-locality.json

# Multiple localities (requires a script)
for file in data/*.json; do
  curl -X POST http://localhost:5173/api/localities \
    -H "Content-Type: application/json" \
    -d @"$file"
done
```

### Using a Node.js Script:

Create `scripts/import-localities.js`:

```javascript
import fs from 'fs';
import path from 'path';

const API_URL = 'http://localhost:5173/api/localities';
const DATA_DIR = './data';

async function importLocality(locality) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(locality)
  });
  
  if (!response.ok) {
    throw new Error(`Failed to import: ${locality.name}`);
  }
  
  return response.json();
}

async function main() {
  const files = fs.readdirSync(DATA_DIR)
    .filter(f => f.endsWith('.json'));
  
  for (const file of files) {
    const data = JSON.parse(
      fs.readFileSync(path.join(DATA_DIR, file), 'utf8')
    );
    
    if (Array.isArray(data)) {
      for (const locality of data) {
        console.log(`Importing: ${locality.name}`);
        await importLocality(locality);
      }
    } else {
      console.log(`Importing: ${data.name}`);
      await importLocality(data);
    }
  }
  
  console.log('Import complete!');
}

main().catch(console.error);
```

Run it:
```bash
node scripts/import-localities.js
```

## 8. Validating Your Data

Before importing, validate your GeoJSON:

- Online: https://geojson.io/ (paste your GeoJSON)
- CLI: https://github.com/mapbox/geojsonhint

```bash
npm install -g @mapbox/geojsonhint
geojsonhint your-file.geojson
```

## 9. Data Quality Tips

- **Simplify complex boundaries**: Use tools like Mapshaper (https://mapshaper.org/) to reduce file size
- **Check for gaps**: Neighboring areas should share boundaries
- **Verify coordinates**: Ensure they're in the correct location
- **Test with small datasets first**: Import a few localities before doing bulk imports

## 10. Example: Getting Quezon City Barangay Data

Complete workflow example:

```bash
# 1. Get data from OSM
curl -X POST "https://overpass-api.de/api/interpreter" \
  --data '[out:json];area["name"="Quezon City"];relation(area)["admin_level"="7"];out geom;' \
  > qc-barangays.json

# 2. Process the data (you may need to write a script to convert OSM format)
# OSM format needs conversion to your schema

# 3. Import to your system
curl -X POST http://localhost:5173/api/localities \
  -H "Content-Type: application/json" \
  -d @processed-data.json
```

## Need Help?

- **OSM Wiki**: https://wiki.openstreetmap.org/
- **GeoJSON Spec**: https://geojson.org/
- **QGIS Tutorials**: https://www.qgistutorials.com/

