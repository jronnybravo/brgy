# Project Summary: Barangay Mapping System

## Overview

A full-stack web application for managing and visualizing locality boundaries and voter data. Built with modern web technologies, this system allows you to:

1. **Store locality boundaries** as GeoJSON in a MySQL database
2. **Display interactive maps** with Leaflet.js showing boundaries
3. **Manage voter data** associated with localities
4. **Import boundary data** from various sources (OSM, PhilGIS, manual)

## Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Frontend Framework | SvelteKit | Full-stack framework for web app |
| UI Components | Svelte | Reactive components |
| Mapping | Leaflet.js | Interactive maps |
| Database | MySQL 8.0+ | Data persistence |
| ORM | TypeORM | Database abstraction |
| Language | TypeScript | Type-safe development |
| Styling | CSS | Component styling |
| Map Tiles | OpenStreetMap | Base map imagery |

## Project Structure

```
brgy/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── Map.svelte              # Leaflet map component
│   │   └── database/
│   │       ├── data-source.ts           # DB connection config
│   │       └── entities/
│   │           ├── Locality.ts          # Locality model
│   │           └── Voter.ts             # Voter model
│   ├── routes/
│   │   ├── +page.svelte                # Main map view
│   │   ├── admin/
│   │   │   └── +page.svelte            # Admin panel
│   │   └── api/
│   │       ├── localities/
│   │       │   ├── +server.ts          # CRUD endpoints
│   │       │   ├── [id]/+server.ts     # Single locality
│   │       │   └── geojson/+server.ts  # GeoJSON export
│   │       └── voters/
│   │           └── +server.ts          # Voter endpoints
│   ├── app.html                        # HTML template
│   ├── app.d.ts                        # Type declarations
│   └── hooks.server.ts                 # Server initialization
├── database/
│   ├── setup-mysql.sql                 # MySQL setup script
│   └── schema-postgres-postgis.sql     # PostgreSQL reference
├── sample-data/
│   ├── sample-locality.json            # Single locality example
│   ├── multiple-localities.json        # Multiple localities
│   └── sample-voters.json              # Sample voter data
├── scripts/
│   ├── import-localities.js            # Bulk import localities
│   ├── import-voters.js                # Bulk import voters
│   └── convert-osm-to-localities.js    # Convert OSM data
├── static/                             # Static assets
├── README.md                           # Main documentation
├── QUICKSTART.md                       # 5-minute setup guide
├── SETUP.md                            # Detailed setup
├── DATA_SOURCES.md                     # How to get boundary data
├── API.md                              # API reference
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── svelte.config.js                    # Svelte config
├── vite.config.ts                      # Vite config
└── env.example                         # Environment template
```

## Key Features

### 1. Interactive Map Display
- Leaflet-based interactive map
- Locality boundaries displayed as polygons
- Hover effects and popups
- Click handling for interactions
- Responsive design

### 2. Admin Panel
- Create, read, update, delete localities
- Form-based data entry
- GeoJSON validation
- Sample data loading
- Direct integration with geojson.io

### 3. RESTful API
- Full CRUD operations for localities
- Voter management endpoints
- GeoJSON export endpoint
- Query filtering support

### 4. Data Import Tools
- Bulk import from JSON files
- OSM data converter
- Command-line utilities
- Error handling and reporting

### 5. Database Schema
- Localities with GeoJSON boundaries
- Hierarchical locality relationships
- Voter records with geolocation
- Automatic timestamps
- Foreign key constraints

## Data Flow

### 1. Getting Boundary Data

```
OpenStreetMap API → OSM JSON → convert-osm-to-localities.js → localities.json
              OR
geojson.io → Draw boundaries → Copy GeoJSON → Admin form
              OR
PhilGIS → Shapefiles → QGIS → GeoJSON export
```

### 2. Importing Data

```
localities.json → import-localities.js → POST /api/localities → MySQL database
```

### 3. Displaying on Map

```
MySQL database → GET /api/localities → Map.svelte → Leaflet → User's browser
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/localities` | Get all localities |
| POST | `/api/localities` | Create locality |
| GET | `/api/localities/:id` | Get single locality |
| PUT | `/api/localities/:id` | Update locality |
| DELETE | `/api/localities/:id` | Delete locality |
| GET | `/api/localities/geojson` | GeoJSON FeatureCollection |
| GET | `/api/voters` | Get all voters |
| GET | `/api/voters?localityId=1` | Get voters by locality |
| POST | `/api/voters` | Create voter |

## Database Schema

### localities Table
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
name            VARCHAR(255) NOT NULL
code            VARCHAR(50) UNIQUE
type            VARCHAR(50)
parentId        INT (self-reference)
boundaryGeoJSON JSON NOT NULL
geometry        GEOMETRY(POLYGON, 4326)
centroidLat     DECIMAL(10, 7)
centroidLng     DECIMAL(10, 7)
areaSqm         DECIMAL(15, 2)
population      INT
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

### voters Table
```sql
id              INT PRIMARY KEY AUTO_INCREMENT
firstName       VARCHAR(100) NOT NULL
lastName        VARCHAR(100) NOT NULL
middleName      VARCHAR(100)
localityId      INT NOT NULL (FK to localities)
address         TEXT
latitude        DECIMAL(10, 7)
longitude       DECIMAL(10, 7)
voterId         VARCHAR(50) UNIQUE
registeredDate  DATE
status          VARCHAR(20)
phoneNumber     VARCHAR(20)
email           VARCHAR(100)
createdAt       TIMESTAMP
updatedAt       TIMESTAMP
```

## Setup Steps (Quick)

1. **Install**: `npm install`
2. **Database**: `mysql -u root -p < database/setup-mysql.sql`
3. **Configure**: `cp env.example .env` (edit with credentials)
4. **Run**: `npm run dev`
5. **Import**: `node scripts/import-localities.js sample-data/multiple-localities.json`

See [QUICKSTART.md](QUICKSTART.md) for details.

## How Data Is Stored

### Locality Boundaries (GeoJSON)

```json
{
  "name": "Barangay San Antonio",
  "code": "BRG-001",
  "type": "barangay",
  "boundaryGeoJSON": {
    "type": "Polygon",
    "coordinates": [
      [
        [121.0, 14.0],    // [longitude, latitude]
        [121.02, 14.0],
        [121.02, 14.02],
        [121.0, 14.02],
        [121.0, 14.0]     // Closes the polygon
      ]
    ]
  }
}
```

**Key Points:**
- Stored as JSON in MySQL
- GeoJSON Polygon format
- Coordinates: `[longitude, latitude]` order
- First = Last coordinate (closed polygon)
- EPSG:4326 (WGS 84) coordinate system

### Why This Format?

1. **Web Standard**: GeoJSON is the standard for web mapping
2. **Leaflet Compatible**: Direct support in Leaflet.js
3. **Human Readable**: JSON is easy to read/edit
4. **Interoperable**: Works with all mapping libraries
5. **Flexible**: Easy to import/export

## How to Access Boundary Data

### Method 1: OpenStreetMap

```bash
# Query OSM Overpass API
curl -X POST "https://overpass-api.de/api/interpreter" \
  --data '[out:json];area["name"="Your City"];relation(area)["admin_level"="7"];out geom;' \
  > osm-data.json

# Convert to locality format
node scripts/convert-osm-to-localities.js osm-data.json localities.json

# Import to database
node scripts/import-localities.js localities.json
```

### Method 2: Manual Drawing

1. Go to https://geojson.io
2. Draw boundaries on map
3. Copy GeoJSON from right panel
4. Paste into Admin Panel form
5. Save

### Method 3: Government Data

1. Download from PhilGIS or local government
2. Open in QGIS
3. Export as GeoJSON (EPSG:4326)
4. Import using script or admin panel

## Customization

### Change Map Tiles

Edit `src/lib/components/Map.svelte`:

```javascript
// Satellite
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')

// Dark theme
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
```

### Change Boundary Colors

Edit `src/lib/components/Map.svelte`:

```javascript
style: (feature) => ({
  fillColor: '#3388ff',  // Fill color
  weight: 2,             // Border width
  opacity: 1,
  color: '#0066cc',      // Border color
  fillOpacity: 0.3       // Transparency
})
```

### Add New Entity Types

1. Create entity in `src/lib/database/entities/`
2. Add to `data-source.ts` entities array
3. Create API routes in `src/routes/api/`
4. Create UI components as needed

## Future Enhancements

- [ ] User authentication/authorization
- [ ] Advanced search and filtering
- [ ] Data export (CSV, Excel, Shapefile)
- [ ] Analytics dashboard
- [ ] Voter statistics by locality
- [ ] Heat maps
- [ ] Mobile app
- [ ] Offline support
- [ ] Real-time collaboration
- [ ] Audit logging

## Documentation Files

| File | Purpose |
|------|---------|
| README.md | Main documentation, project overview |
| QUICKSTART.md | 5-minute setup guide |
| SETUP.md | Detailed setup instructions |
| DATA_SOURCES.md | How to obtain boundary data |
| API.md | API endpoint reference |
| PROJECT_SUMMARY.md | This file - comprehensive overview |

## Dependencies

### Production
- `@sveltejs/kit` - SvelteKit framework
- `svelte` - UI framework
- `leaflet` - Mapping library
- `mysql2` - MySQL driver
- `typeorm` - ORM
- `reflect-metadata` - TypeORM requirement

### Development
- `@sveltejs/adapter-auto` - SvelteKit adapter
- `@sveltejs/vite-plugin-svelte` - Vite integration
- `typescript` - Type checking
- `vite` - Build tool
- `@types/leaflet` - Type definitions
- `@types/geojson` - Type definitions

## Support & Resources

- **SvelteKit**: https://kit.svelte.dev/
- **TypeORM**: https://typeorm.io/
- **Leaflet**: https://leafletjs.com/
- **GeoJSON**: https://geojson.org/
- **OpenStreetMap**: https://www.openstreetmap.org/
- **PhilGIS**: https://philgis.org/

## License

MIT License (or your preferred license)

---

**Questions?** See the documentation files or open an issue on GitHub!

