-- PostgreSQL with PostGIS Extension
-- This is the RECOMMENDED approach for geographical data

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Localities table (barangays, districts, neighborhoods, etc.)
CREATE TABLE localities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE, -- Official code (e.g., barangay code)
    type VARCHAR(50), -- 'barangay', 'district', 'municipality', etc.
    parent_id INTEGER REFERENCES localities(id), -- For hierarchical relationships
    
    -- Geographical data
    geometry GEOMETRY(POLYGON, 4326), -- The actual boundary polygon (SRID 4326 = WGS84)
    centroid GEOGRAPHY(POINT, 4326), -- Center point for quick lookups
    
    -- Metadata
    area_sqm DECIMAL(15, 2), -- Area in square meters
    population INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index for fast geographical queries
CREATE INDEX idx_localities_geometry ON localities USING GIST (geometry);
CREATE INDEX idx_localities_centroid ON localities USING GIST (centroid);
CREATE INDEX idx_localities_parent ON localities(parent_id);

-- Voters table
CREATE TABLE voters (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    locality_id INTEGER REFERENCES localities(id),
    
    -- Location data
    address TEXT,
    location GEOGRAPHY(POINT, 4326), -- Precise voter location if available
    
    -- Metadata
    registered_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voters_locality ON voters(locality_id);
CREATE INDEX idx_voters_location ON voters USING GIST (location);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_localities_updated_at BEFORE UPDATE ON localities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voters_updated_at BEFORE UPDATE ON voters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Example: Insert a locality from GeoJSON
-- INSERT INTO localities (name, code, type, geometry) 
-- VALUES (
--     'Sample Barangay',
--     'BRG-001',
--     'barangay',
--     ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[121.0,14.0],[121.1,14.0],[121.1,14.1],[121.0,14.1],[121.0,14.0]]]}')
-- );

-- Example: Query to get locality as GeoJSON
-- SELECT 
--     id,
--     name,
--     code,
--     ST_AsGeoJSON(geometry) as boundary_geojson
-- FROM localities
-- WHERE id = 1;

-- Example: Find which locality contains a point
-- SELECT l.* 
-- FROM localities l
-- WHERE ST_Contains(l.geometry, ST_SetSRID(ST_MakePoint(121.05, 14.05), 4326));

-- Example: Get all localities within a bounding box
-- SELECT * FROM localities
-- WHERE geometry && ST_MakeEnvelope(121.0, 14.0, 121.2, 14.2, 4326);

