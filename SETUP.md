# Setup Guide

This guide will help you set up the Barangay Mapping System with SvelteKit, MySQL, and TypeORM.

## Prerequisites

- Node.js 18+ installed
- MySQL 8.0+ installed and running
- npm or pnpm package manager

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up MySQL Database

### Create the database:

```sql
CREATE DATABASE brgy_mapping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Optional: Create a dedicated user

```sql
CREATE USER 'brgy_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON brgy_mapping.* TO 'brgy_user'@'localhost';
FLUSH PRIVILEGES;
```

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory (copy from `env.example`):

```bash
cp env.example .env
```

Edit `.env` with your database credentials:

```
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=brgy_mapping
NODE_ENV=development
```

## Step 4: Start the Development Server

```bash
npm run dev
```

The application will:
1. Automatically connect to MySQL
2. Create tables based on TypeORM entities (in development mode)
3. Start the dev server at http://localhost:5173

## Step 5: Add Sample Locality Data

You can add localities in several ways:

### Option 1: Use the API directly

```bash
curl -X POST http://localhost:5173/api/localities \
  -H "Content-Type: application/json" \
  -d @sample-data/sample-locality.json
```

### Option 2: Use a database GUI

Import the SQL file:
```bash
mysql -u root -p brgy_mapping < sample-data/sample-localities.sql
```

### Option 3: Create your own GeoJSON

Visit https://geojson.io to draw boundaries on a map and export as GeoJSON.

## Getting Boundary Data

### For Philippine Barangays:

1. **PhilGIS** - https://philgis.org/
   - Download official shapefiles
   - Convert to GeoJSON using tools like QGIS or ogr2ogr

2. **OpenStreetMap Overpass API**
   ```
   https://overpass-api.de/api/interpreter?data=[out:json];area["name"="Your City"];relation(area)["admin_level"="7"];out geom;
   ```

3. **Manual Digitization**
   - Use https://geojson.io
   - Draw boundaries on the map
   - Export as GeoJSON

## Database Schema

TypeORM will automatically create these tables:

### localities
- `id` - Primary key
- `name` - Locality name
- `code` - Official code (optional)
- `type` - Type (barangay, district, etc.)
- `parentId` - For hierarchical relationships
- `boundaryGeoJSON` - JSON column with GeoJSON Polygon
- `geometry` - MySQL spatial column (optional)
- `centroidLat`, `centroidLng` - Center coordinates
- `areaSqm` - Area in square meters
- `population` - Population count
- `createdAt`, `updatedAt` - Timestamps

### voters
- `id` - Primary key
- `firstName`, `lastName`, `middleName`
- `localityId` - Foreign key to localities
- `address` - Text address
- `latitude`, `longitude` - Precise location
- `voterId` - Official voter ID
- `registeredDate` - Registration date
- `status` - Voter status
- `phoneNumber`, `email` - Contact info
- `createdAt`, `updatedAt` - Timestamps

## API Endpoints

### Localities

- `GET /api/localities` - Get all localities
- `GET /api/localities/:id` - Get single locality
- `POST /api/localities` - Create new locality
- `PUT /api/localities/:id` - Update locality
- `DELETE /api/localities/:id` - Delete locality
- `GET /api/localities/geojson` - Get all as GeoJSON FeatureCollection

### Voters

- `GET /api/voters` - Get all voters
- `GET /api/voters?localityId=1` - Get voters by locality
- `POST /api/voters` - Create new voter

## Troubleshooting

### Database connection error

- Check MySQL is running: `mysql -u root -p`
- Verify credentials in `.env`
- Ensure database exists

### TypeORM synchronization issues

- Set `synchronize: true` in development only
- For production, use migrations

### Map not displaying

- Check browser console for errors
- Ensure localities have valid GeoJSON data
- Verify Leaflet CSS is loading

## Next Steps

1. Add more localities using the API
2. Import voter data
3. Customize the map styling
4. Add authentication
5. Create admin dashboard for data management

## Production Deployment

For production:

1. Set `NODE_ENV=production` in `.env`
2. Change `synchronize: false` in `data-source.ts`
3. Create and run TypeORM migrations
4. Build the application: `npm run build`
5. Preview: `npm run preview`

## Resources

- [SvelteKit Documentation](https://kit.svelte.dev/)
- [TypeORM Documentation](https://typeorm.io/)
- [Leaflet Documentation](https://leafletjs.com/)
- [GeoJSON Specification](https://geojson.org/)

