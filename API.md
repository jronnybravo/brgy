# API Reference

Complete API documentation for the Barangay Mapping System.

## Base URL

```
http://localhost:5173/api
```

---

## Localities API

### Get All Localities

```http
GET /api/localities
```

**Response:**

```json
[
  {
    "id": 1,
    "name": "Barangay San Antonio",
    "code": "BRG-001",
    "type": "barangay",
    "parentId": null,
    "boundaryGeoJSON": {
      "type": "Polygon",
      "coordinates": [[[121.0, 14.0], ...]]
    },
    "centroidLat": 14.01,
    "centroidLng": 121.01,
    "areaSqm": null,
    "population": 5200,
    "createdAt": "2024-12-02T10:00:00.000Z",
    "updatedAt": "2024-12-02T10:00:00.000Z"
  }
]
```

### Get Single Locality

```http
GET /api/localities/:id
```

**Parameters:**
- `id` (path parameter) - Locality ID

**Response:**

```json
{
  "id": 1,
  "name": "Barangay San Antonio",
  "code": "BRG-001",
  "type": "barangay",
  "boundaryGeoJSON": { ... },
  "parent": null,
  "children": []
}
```

**Error Response:**

```json
{
  "error": "Locality not found"
}
```

Status: `404 Not Found`

### Create Locality

```http
POST /api/localities
```

**Request Body:**

```json
{
  "name": "Barangay San Antonio",
  "code": "BRG-001",
  "type": "barangay",
  "population": 5200,
  "parentId": null,
  "boundaryGeoJSON": {
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
}
```

**Required Fields:**
- `name` - Locality name
- `boundaryGeoJSON` - Valid GeoJSON Polygon

**Optional Fields:**
- `code` - Official code
- `type` - Type (barangay, district, etc.)
- `population` - Population count
- `parentId` - Parent locality ID
- `areaSqm` - Area in square meters

**Response:**

```json
{
  "id": 1,
  "name": "Barangay San Antonio",
  "code": "BRG-001",
  ...
}
```

Status: `201 Created`

**Error Response:**

```json
{
  "error": "Name and boundaryGeoJSON are required"
}
```

Status: `400 Bad Request`

### Update Locality

```http
PUT /api/localities/:id
```

**Parameters:**
- `id` (path parameter) - Locality ID

**Request Body:** Same as Create Locality (all fields optional)

**Response:** Updated locality object

**Error Response:**

```json
{
  "error": "Locality not found"
}
```

Status: `404 Not Found`

### Delete Locality

```http
DELETE /api/localities/:id
```

**Parameters:**
- `id` (path parameter) - Locality ID

**Response:**

```json
{
  "message": "Locality deleted successfully"
}
```

**Error Response:**

```json
{
  "error": "Locality not found"
}
```

Status: `404 Not Found`

### Get GeoJSON FeatureCollection

```http
GET /api/localities/geojson
```

Returns all localities as a GeoJSON FeatureCollection, ready for mapping.

**Response:**

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 1,
        "name": "Barangay San Antonio",
        "code": "BRG-001",
        "type": "barangay",
        "population": 5200
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[121.0, 14.0], ...]]
      }
    }
  ]
}
```

---

## Voters API

### Get All Voters

```http
GET /api/voters
```

**Query Parameters:**
- `localityId` (optional) - Filter by locality

**Examples:**

```bash
# Get all voters
GET /api/voters

# Get voters in specific locality
GET /api/voters?localityId=1
```

**Response:**

```json
[
  {
    "id": 1,
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "middleName": "Santos",
    "localityId": 1,
    "locality": {
      "id": 1,
      "name": "Barangay San Antonio"
    },
    "address": "123 Main Street",
    "latitude": 14.01,
    "longitude": 121.01,
    "voterId": "V-2024-001",
    "registeredDate": "2024-01-15",
    "status": "active",
    "phoneNumber": "+63-912-345-6789",
    "email": "juan.delacruz@example.com",
    "createdAt": "2024-12-02T10:00:00.000Z",
    "updatedAt": "2024-12-02T10:00:00.000Z"
  }
]
```

### Create Voter

```http
POST /api/voters
```

**Request Body:**

```json
{
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  "middleName": "Santos",
  "localityId": 1,
  "address": "123 Main Street",
  "latitude": 14.01,
  "longitude": 121.01,
  "voterId": "V-2024-001",
  "registeredDate": "2024-01-15",
  "status": "active",
  "phoneNumber": "+63-912-345-6789",
  "email": "juan.delacruz@example.com"
}
```

**Required Fields:**
- `firstName` - First name
- `lastName` - Last name
- `localityId` - Locality ID (must exist)

**Optional Fields:**
- `middleName` - Middle name
- `address` - Address
- `latitude`, `longitude` - Coordinates
- `voterId` - Official voter ID (must be unique)
- `registeredDate` - Registration date (YYYY-MM-DD)
- `status` - Status (active, inactive, etc.)
- `phoneNumber` - Phone number
- `email` - Email address

**Response:**

```json
{
  "id": 1,
  "firstName": "Juan",
  "lastName": "Dela Cruz",
  ...
}
```

Status: `201 Created`

**Error Response:**

```json
{
  "error": "First name, last name, and localityId are required"
}
```

Status: `400 Bad Request`

---

## Data Models

### Locality

```typescript
{
  id: number;
  name: string;
  code?: string;
  type?: string;
  parentId?: number;
  parent?: Locality;
  children?: Locality[];
  boundaryGeoJSON: GeoJSON;
  geometry?: string;
  centroidLat?: number;
  centroidLng?: number;
  areaSqm?: number;
  population?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

### Voter

```typescript
{
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  localityId: number;
  locality: Locality;
  address?: string;
  latitude?: number;
  longitude?: number;
  voterId?: string;
  registeredDate?: Date;
  status?: string;
  phoneNumber?: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### GeoJSON Polygon

```typescript
{
  type: "Polygon";
  coordinates: [
    [
      [longitude, latitude],
      [longitude, latitude],
      ...
    ]
  ]
}
```

**Important Notes:**
- Coordinates are in `[longitude, latitude]` order (GeoJSON standard)
- The first and last coordinate must be the same (closed polygon)
- Use EPSG:4326 (WGS 84) coordinate system

---

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200 OK` - Successful GET/PUT/DELETE
- `201 Created` - Successful POST
- `400 Bad Request` - Invalid request data
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses have this format:

```json
{
  "error": "Error message description"
}
```

---

## Examples

### cURL Examples

```bash
# Get all localities
curl http://localhost:5173/api/localities

# Create locality
curl -X POST http://localhost:5173/api/localities \
  -H "Content-Type: application/json" \
  -d @sample-data/sample-locality.json

# Get voters by locality
curl "http://localhost:5173/api/voters?localityId=1"

# Create voter
curl -X POST http://localhost:5173/api/voters \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Juan",
    "lastName": "Dela Cruz",
    "localityId": 1
  }'
```

### JavaScript/TypeScript Examples

```typescript
// Get all localities
const localities = await fetch('/api/localities')
  .then(res => res.json());

// Create locality
const newLocality = await fetch('/api/localities', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Barangay San Antonio',
    boundaryGeoJSON: { type: 'Polygon', coordinates: [...] }
  })
}).then(res => res.json());

// Get voters by locality
const voters = await fetch('/api/voters?localityId=1')
  .then(res => res.json());

// Create voter
const newVoter = await fetch('/api/voters', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    localityId: 1
  })
}).then(res => res.json());
```

---

## Rate Limiting

Currently, there is no rate limiting implemented. For production deployments, consider adding rate limiting middleware.

## Authentication

Currently, the API is open and does not require authentication. For production deployments, implement authentication and authorization.

## CORS

CORS is not explicitly configured. The SvelteKit development server handles same-origin requests. For production with separate frontend/backend, configure CORS appropriately.

