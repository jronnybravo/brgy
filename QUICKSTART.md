# Quick Start Guide

Get up and running with the Barangay Mapping System in 5 minutes!

## Step 1: Install Dependencies (1 min)

```bash
npm install
```

## Step 2: Set Up MySQL (2 min)

### Start MySQL (if not running)

```bash
# macOS (using Homebrew)
brew services start mysql

# Linux
sudo systemctl start mysql

# Windows - Start MySQL from Services
```

### Create Database

```bash
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE brgy_mapping CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
exit;
```

Or use the provided script:

```bash
mysql -u root -p < database/setup-mysql.sql
```

## Step 3: Configure Environment (30 sec)

Create `.env` file:

```bash
cp env.example .env
```

Edit `.env` with your MySQL password:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=YOUR_MYSQL_PASSWORD
DB_DATABASE=brgy_mapping
NODE_ENV=development
```

## Step 4: Start the Application (30 sec)

```bash
npm run dev
```

Visit: http://localhost:5173

TypeORM will automatically create the database tables on first run!

## Step 5: Add Sample Data (1 min)

Open a new terminal and run:

```bash
node scripts/import-localities.js sample-data/multiple-localities.json
```

Refresh your browser to see the localities on the map!

---

## What's Next?

### Add Your Own Data

**Option 1: Use the Admin Panel**
- Visit http://localhost:5173/admin
- Click "Add New Locality"
- Fill in the form or use geojson.io to create boundaries

**Option 2: Get Real Boundary Data**
- Read [DATA_SOURCES.md](DATA_SOURCES.md) for detailed instructions
- Use OpenStreetMap, PhilGIS, or other sources

**Option 3: Draw Boundaries Manually**
1. Go to https://geojson.io
2. Draw your boundaries on the map
3. Copy the GeoJSON from the right panel
4. Paste into the admin form

### Common Issues

**"Database connection failed"**
- Make sure MySQL is running
- Check your `.env` credentials
- Verify the database exists: `mysql -u root -p -e "SHOW DATABASES;"`

**"Cannot find module"**
- Run `npm install` again
- Delete `node_modules` and run `npm install`

**"Port 5173 already in use"**
- Kill the process: `lsof -ti:5173 | xargs kill -9`
- Or change the port in `vite.config.ts`

**"Map not showing"**
- Check browser console for errors
- Ensure you have added localities
- Verify GeoJSON format is correct

### Project Structure

```
brgy/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── Map.svelte          # Leaflet map component
│   │   └── database/
│   │       ├── data-source.ts      # Database connection
│   │       └── entities/           # Data models
│   ├── routes/
│   │   ├── +page.svelte           # Main map page
│   │   ├── admin/                 # Admin panel
│   │   └── api/                   # REST API endpoints
│   └── hooks.server.ts            # Server initialization
├── sample-data/                   # Sample localities
├── scripts/                       # Utility scripts
└── database/                      # SQL scripts
```

### API Quick Reference

```bash
# Get all localities
curl http://localhost:5173/api/localities

# Create locality
curl -X POST http://localhost:5173/api/localities \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Barangay","boundaryGeoJSON":{...}}'

# Get GeoJSON for mapping
curl http://localhost:5173/api/localities/geojson
```

### Development Tips

1. **Auto-reload**: Changes to code automatically refresh the browser
2. **Database sync**: TypeORM automatically updates tables in development
3. **Logging**: Database queries are logged in development mode
4. **Hot reload**: Svelte components update without full page reload

### Learn More

- **Full Setup Guide**: See [SETUP.md](SETUP.md)
- **Data Sources**: See [DATA_SOURCES.md](DATA_SOURCES.md)
- **Technology Docs**:
  - [SvelteKit](https://kit.svelte.dev/)
  - [TypeORM](https://typeorm.io/)
  - [Leaflet](https://leafletjs.com/)
  - [MySQL](https://dev.mysql.com/doc/)

---

**Need help?** Check the documentation or open an issue on GitHub!

