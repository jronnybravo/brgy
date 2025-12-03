# Barangay Mapping System

A full-stack web application for managing and visualizing locality boundaries and voter data, built with SvelteKit, MySQL, and Leaflet.

![License](https://img.shields.io/badge/license-MIT-blue.svg)

## ✨ Features

- 🗺️ **Interactive Mapping**: Visualize locality boundaries on interactive Leaflet maps
- 📊 **Voter Management**: Track and manage voter data by locality
- 🎯 **GeoJSON Support**: Store and display geographical boundary data
- 🔄 **RESTful API**: Full CRUD operations for localities and voters
- 📱 **Responsive Design**: Modern, mobile-friendly interface
- 🚀 **Real-time Updates**: Dynamic map rendering with live data

## 🛠️ Technology Stack

- **Frontend**: SvelteKit, Leaflet.js
- **Backend**: SvelteKit API Routes
- **Database**: MySQL 8.0+ with TypeORM
- **Mapping**: Leaflet.js with OpenStreetMap tiles
- **Language**: TypeScript

## 📋 Prerequisites

- Node.js 18+ 
- MySQL 8.0+
- npm or pnpm

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd brgy
npm install
```

### 2. Set Up Database

```sql
CREATE DATABASE brgy_mapping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Configure Environment

Copy `env.example` to `.env` and update with your credentials:

```bash
cp env.example .env
```

Edit `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=brgy_mapping
NODE_ENV=development
```

### 4. Start Development Server

```bash
npm run dev
```

Visit http://localhost:5173

## 📁 Project Structure

```
brgy/
├── src/
│   ├── lib/
│   │   ├── components/      # Svelte components
│   │   │   └── Map.svelte   # Leaflet map component
│   │   └── database/        # Database configuration
│   │       ├── data-source.ts
│   │       └── entities/    # TypeORM entities
│   │           ├── Locality.ts
│   │           └── Voter.ts
│   ├── routes/
│   │   ├── api/            # API endpoints
│   │   │   ├── localities/
│   │   │   └── voters/
│   │   └── +page.svelte    # Main page
│   └── hooks.server.ts     # Server initialization
├── sample-data/            # Sample locality data
├── scripts/                # Utility scripts
├── database/               # Database schemas
└── docs/                   # Documentation
```

## 📖 Documentation

- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[DATA_SOURCES.md](DATA_SOURCES.md)** - How to obtain boundary data
- **[API Documentation](#api-endpoints)** - API reference

## 🗺️ Getting Boundary Data

### Option 1: OpenStreetMap

```bash
curl -X POST "https://overpass-api.de/api/interpreter" \
  --data '[out:json];area["name"="Your City"];relation(area)["admin_level"="7"];out geom;'
```

### Option 2: Manual Drawing

Visit [geojson.io](https://geojson.io) to draw boundaries and export as GeoJSON.

### Option 3: Official Sources

- **PhilGIS**: https://philgis.org/ (for Philippine data)
- **Local government GIS portals**

See [DATA_SOURCES.md](DATA_SOURCES.md) for detailed instructions.

## 📥 Importing Data

### Option 1: Import ALL Philippines (~42,000 Barangays) 🇵🇭 ⭐

**National deployment** - Import the entire Philippines with all regions, provinces, municipalities, and barangays:

```bash
# Convert all shapefiles and import (30-40 minutes)
npm run seed:philippines
```

This will populate your database with:
- **18 Regions**
- **~81 Provinces**
- **~1,500 Municipalities/Cities**
- **~42,000 Barangays**
- Complete hierarchical relationships

See [NATIONAL_DEPLOYMENT.md](NATIONAL_DEPLOYMENT.md) for full guide.

### Option 2: Seed Siquijor Province Only

Get complete boundary data for Siquijor Province:

```bash
npm run seed:siquijor
```

This will populate your database with:
- 6 municipalities
- 140+ barangays  
- Real geographical boundaries

See [scripts/README_SIQUIJOR_SEEDER.md](scripts/README_SIQUIJOR_SEEDER.md) for details.

### Option 2: Use Sample Data

```bash
# Single file
node scripts/import-localities.js sample-data/sample-locality.json

# Multiple files from directory
node scripts/import-localities.js sample-data/
```

### Option 3: Use the API

```bash
curl -X POST http://localhost:5173/api/localities \
  -H "Content-Type: application/json" \
  -d @sample-data/sample-locality.json
```

## 🔌 API Endpoints

### Localities

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/localities` | Get all localities |
| GET | `/api/localities/:id` | Get single locality |
| POST | `/api/localities` | Create new locality |
| PUT | `/api/localities/:id` | Update locality |
| DELETE | `/api/localities/:id` | Delete locality |
| GET | `/api/localities/geojson` | Get GeoJSON FeatureCollection |

### Voters

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/voters` | Get all voters |
| GET | `/api/voters?localityId=1` | Get voters by locality |
| POST | `/api/voters` | Create new voter |

### Example Request

```javascript
// Create a new locality
const response = await fetch('/api/localities', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Barangay San Antonio',
    code: 'BRG-001',
    type: 'barangay',
    population: 5200,
    boundaryGeoJSON: {
      type: 'Polygon',
      coordinates: [[[121.0, 14.0], [121.02, 14.0], [121.02, 14.02], [121.0, 14.02], [121.0, 14.0]]]
    }
  })
});
```

## 💾 Database Schema

### Localities Table

- `id` - Primary key
- `name` - Locality name
- `code` - Official code (unique)
- `type` - Type (barangay, district, etc.)
- `parentId` - Parent locality (for hierarchy)
- `boundaryGeoJSON` - GeoJSON Polygon
- `centroidLat`, `centroidLng` - Center point
- `areaSqm` - Area in square meters
- `population` - Population count
- Timestamps: `createdAt`, `updatedAt`

### Voters Table

- `id` - Primary key
- `firstName`, `lastName`, `middleName`
- `localityId` - Foreign key to localities
- `address`, `latitude`, `longitude`
- `voterId` - Official voter ID
- `registeredDate`, `status`
- `phoneNumber`, `email`
- Timestamps: `createdAt`, `updatedAt`

## 🎨 Customization

### Map Styling

Edit `src/lib/components/Map.svelte`:

```javascript
style: (feature) => ({
  fillColor: '#3388ff',    // Change fill color
  weight: 2,               // Border width
  opacity: 1,
  color: '#0066cc',        // Border color
  fillOpacity: 0.3
})
```

### Map Tiles

Replace OpenStreetMap with other providers:

```javascript
// Satellite imagery
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}')

// Dark theme
L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png')
```

## 🧪 Development

```bash
# Run development server
npm run dev

# Type checking
npm run check

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📦 Production Deployment

1. Update `.env` for production:
   ```
   NODE_ENV=production
   ```

2. Disable auto-sync in `data-source.ts`:
   ```typescript
   synchronize: false
   ```

3. Build and deploy:
   ```bash
   npm run build
   npm run preview  # or deploy dist/ to your server
   ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Database Connection Failed
- Verify MySQL is running: `mysql -u root -p`
- Check credentials in `.env`
- Ensure database exists

### Map Not Displaying
- Check browser console for errors
- Verify Leaflet CSS is loading
- Ensure localities have valid GeoJSON data

### TypeORM Errors
- In development, `synchronize: true` auto-creates tables
- For production, use migrations

## 📞 Support

For issues and questions:
- Check [SETUP.md](SETUP.md) for detailed setup instructions
- See [DATA_SOURCES.md](DATA_SOURCES.md) for data import help
- Open an issue on GitHub

## 🗓️ Roadmap

- [ ] User authentication and authorization
- [ ] Advanced search and filtering
- [ ] Data export (CSV, Excel, GeoJSON)
- [ ] Voter analytics dashboard
- [ ] Mobile app
- [ ] Offline support
- [ ] Multi-language support

---

Built with ❤️ using SvelteKit

