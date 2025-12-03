# 🇵🇭 National Deployment Guide

Complete guide for deploying the **entire Philippines** barangay mapping system with ~42,000 barangays nationwide.

## 📊 What You'll Get

- ✅ **18 Regions**
- ✅ **~81 Provinces**
- ✅ **~1,500+ Municipalities/Cities**
- ✅ **~42,000+ Barangays**
- ✅ Complete hierarchical relationships
- ✅ Full boundary GeoJSON data

## ⏱️ Time Requirements

- **Conversion**: 5-10 minutes (one-time)
- **Database Import**: 15-30 minutes (one-time)
- **Total**: ~30-40 minutes for complete national setup

## 🚀 Quick Start

### Step 1: Convert Shapefiles (5-10 min)

```bash
node scripts/convert-all-philippines.js
```

This will:
- Process all 18 regions (PH01-PH18)
- Extract ~42,000 barangays
- Save to `data/philippines-all-localities.json`
- File size: ~100-200 MB

### Step 2: Import to Database (15-30 min)

```bash
# Make sure dev server is running first!
npm run dev

# In another terminal:
node scripts/seed-philippines.js
```

Or do both at once:
```bash
npm run seed:philippines
```

## 📋 Prerequisites

### 1. Shapefiles Ready
- ✅ You have the shapefiles in `data/shapefiles/`
- ✅ Files: PH01.*.zip through PH18.*.zip

### 2. Dependencies Installed
```bash
npm install
```

### 3. Database Ready
- ✅ MySQL running
- ✅ Database created
- ✅ `.env` configured

### 4. Dev Server Running
```bash
npm run dev
```

## 🔍 Expected Output

### Phase 1: Conversion

```
======================================================================
PHILIPPINE NATIONAL BARANGAY DATA CONVERTER
======================================================================

This will process ALL Philippine regions (PH01-PH18)
Expected: ~42,000+ barangays nationwide
This may take 5-10 minutes...

Processing PH01...
  ✓ Read 4250 barangays
  Sample: Barangay Poblacion, Vigan City, Ilocos Sur

Processing PH02...
  ✓ Read 2311 barangays
  ...

Processing PH18...
  ✓ Read 1219 barangays

======================================================================
Processing Complete!
======================================================================
Total barangays: 42,046

Breakdown by region:
  Region I (Ilocos Region): 3,265 barangays
  Region II (Cagayan Valley): 2,311 barangays
  Region III (Central Luzon): 3,102 barangays
  ...
  Region XVIII (Negros Island Region): 1,219 barangays

✓ Saved to: data/philippines-all-localities.json
  File size: 156.23 MB
```

### Phase 2: Database Import

```
======================================================================
PHILIPPINE NATIONAL DATABASE SEEDER
======================================================================

✓ Loaded 42,046 barangays

This will take 15-30 minutes. Please be patient...

Progress: 100/42,046 (0.2%) - R:18 P:81 M:145 B:98
Progress: 500/42,046 (1.2%) - R:18 P:81 M:456 B:487
Progress: 1000/42,046 (2.4%) - R:18 P:81 M:678 B:986
...
Progress: 42,046/42,046 (100%) - R:18 P:81 M:1,489 B:42,046

======================================================================
Seeding Complete!
======================================================================

Results:
  Regions: 18
  Provinces: 81
  Municipalities: 1,489
  Barangays: 42,046 created, 0 failed
  Total: 43,634 localities

Next steps:
  - Visit http://localhost:5173 to see the map
  - Visit http://localhost:5173/admin to manage localities
```

## 🗺️ Regional Breakdown

Expected barangays per region (approximate):

| Region | Name | Barangays |
|--------|------|-----------|
| PH01 | Ilocos Region | ~3,200 |
| PH02 | Cagayan Valley | ~2,300 |
| PH03 | Central Luzon | ~3,100 |
| PH04 | CALABARZON | ~4,000 |
| PH05 | MIMAROPA | ~1,500 |
| PH06 | Western Visayas | ~4,000 |
| PH07 | Central Visayas | ~3,000 |
| PH08 | Eastern Visayas | ~4,400 |
| PH09 | Zamboanga Peninsula | ~1,900 |
| PH10 | Northern Mindanao | ~2,000 |
| PH11 | Davao Region | ~2,400 |
| PH12 | SOCCSKSARGEN | ~1,900 |
| PH13 | NCR | ~1,700 |
| PH14 | CAR | ~1,200 |
| PH15 | ARMM/BARMM | ~2,500 |
| PH16 | Caraga | ~1,300 |
| PH17 | NIR | ~600 |
| PH18 | Negros Island Region | ~1,200 |

**Total: ~42,000 barangays**

## 💾 Database Size Estimates

After full import:

- **MySQL Database**: ~2-3 GB
- **Table: localities**: ~43,000 rows
- **GeoJSON data**: ~150-200 MB
- **Indexes**: ~200-300 MB

## ⚡ Performance Optimization

### For Faster Import

1. **Increase batch size** (edit `seed-philippines.js`):
```javascript
const BATCH_SIZE = 500; // Default is 100
```

2. **Disable foreign key checks temporarily** (MySQL):
```sql
SET FOREIGN_KEY_CHECKS=0;
-- Run import
SET FOREIGN_KEY_CHECKS=1;
```

3. **Increase MySQL buffer sizes**:
```sql
SET GLOBAL innodb_buffer_pool_size = 2147483648; -- 2GB
```

### For Faster Map Loading

After import, consider:
- Using map clustering for barangay markers
- Implementing viewport-based loading
- Caching GeoJSON responses

## 🎯 Use Cases

### Local Government
- Municipality/city-wide barangay mapping
- Focus on one province or region
- Voter registration and management

### National Agencies
- Full national coverage
- Multi-region operations
- Statistical analysis across regions

### Research/Academic
- Population studies
- Geographical analysis
- Data visualization projects

## 📊 After Import - What You Can Do

### 1. View All Data
```bash
curl http://localhost:5173/api/localities | jq 'length'
# Should return ~43,000
```

### 2. Query by Region
```sql
SELECT COUNT(*) FROM localities WHERE type = 'barangay';
-- ~42,000

SELECT COUNT(*) FROM localities WHERE type = 'municipality';
-- ~1,500

SELECT COUNT(*) FROM localities WHERE type = 'province';
-- ~81
```

### 3. Search for Specific Barangay
```bash
curl http://localhost:5173/api/localities | jq '.[] | select(.name == "Poblacion")'
```

### 4. Export Region Data
```javascript
// Get all Siquijor data
const siquijor = await fetch('/api/localities')
  .then(r => r.json())
  .then(data => data.filter(l => 
    l.provinceName === 'Siquijor' || l.regionCode === 'PH18'
  ));
```

## 🔧 Troubleshooting

### "Out of memory" during conversion
- Process regions one at a time
- Edit script to process specific regions only

### Import is very slow
- Check database connection
- Increase batch size
- Disable unnecessary indexes temporarily

### Some barangays failed to import
- Check the error messages
- Verify GeoJSON format
- Check for duplicate codes

### Map is slow with all data
- Implement clustering
- Use viewport-based loading
- Add search/filter before displaying

## 🎨 Customization

### Import Specific Regions Only

Edit `convert-all-philippines.js`:

```javascript
// Only process specific regions
const REGIONS = [
	'PH07', // Central Visayas
	'PH18'  // Negros Island Region
];
```

### Import by Province

Filter during seeding:

```javascript
const barangays = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
  .filter(b => b.provinceName === 'Siquijor');
```

### Add Custom Fields

Modify the conversion script to include additional shapefile attributes.

## 📝 Data Hierarchy

```
Philippines
├── Region 1 (Ilocos Region)
│   ├── Ilocos Norte
│   │   ├── Laoag City
│   │   │   ├── Barangay 1
│   │   │   ├── Barangay 2
│   │   │   └── ...
│   │   └── ...
│   └── ...
├── Region 7 (Central Visayas)
│   ├── Siquijor
│   │   ├── Larena
│   │   │   ├── Poblacion
│   │   │   ├── Cabulihan
│   │   │   └── ...
│   │   └── ...
│   └── ...
└── ...
```

## 🚀 Production Deployment

For production with 42,000 barangays:

1. **Use production database**
2. **Enable caching** (Redis recommended)
3. **Add CDN** for static assets
4. **Implement pagination** for API responses
5. **Add search indexes** on name, code fields
6. **Monitor performance** and optimize queries

## 📞 Support

After national deployment:
- Database contains full Philippine administrative structure
- Ready for voter management at any barangay
- Scalable for national operations

---

**Ready to deploy nationally?**

```bash
npm run seed:philippines
```

This will give you the complete Philippine barangay mapping system! 🇵🇭🗺️

