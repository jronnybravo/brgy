import {
	Entity,
	PrimaryGeneratedColumn,
	Column,
	CreateDateColumn,
	UpdateDateColumn,
	Tree,
	TreeChildren,
	TreeParent,
	BaseEntity
} from 'typeorm';
import type { GeoJSON } from 'geojson';

@Entity('localities')
@Tree('closure-table')
export class Locality extends BaseEntity {
	@PrimaryGeneratedColumn()
	id!: number;

	@Column({ type: 'varchar', length: 255 })
	name!: string;

	@Column({ type: 'varchar', length: 50, unique: true, nullable: true })
	code?: string; // Official code (e.g., barangay code)

	@Column({ type: 'varchar', length: 50, nullable: true })
	type?: string; // 'barangay', 'district', 'municipality', etc.

	// Tree entity relationships
	@TreeParent()
	parent?: Locality;

	@TreeChildren()
	children?: Locality[];
	
	// Keep parentId for backward compatibility and easier queries
	@Column({ type: 'int', nullable: true })
	parentId?: number;

	// Store boundary as GeoJSON
	// MySQL spatial types can be complex, so we store as JSON and provide geometry column
	@Column({ type: 'json' })
	boundaryGeoJSON!: GeoJSON;

	// For MySQL 8.0+ with spatial support
	// NOTE: Commented out due to TypeORM bug with MySQL 8.0.42+ using AsText instead of ST_AsText
	// If you need spatial indexing, manually create the geometry column after schema sync
	// @Column({
	// 	type: 'geometry',
	// 	spatialFeatureType: 'Polygon',
	// 	srid: 4326,
	// 	nullable: true
	// })
	// geometry?: string; // This will store the actual geometry in MySQL spatial format

	// Store centroid as separate point for quick lookups
	@Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
	centroidLat?: number;

	@Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
	centroidLng?: number;

	// Metadata
	@Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
	areaSqm?: number; // Area in square meters

	@Column({ type: 'int', nullable: true })
	population?: number;

	@CreateDateColumn()
	createdAt!: Date;

	@UpdateDateColumn()
	updatedAt!: Date;

	// Helper method to get coordinates for Leaflet
	getBounds(): [number, number][][] | null {
		if (
			this.boundaryGeoJSON.type === 'Polygon' &&
			Array.isArray(this.boundaryGeoJSON.coordinates)
		) {
			// Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
			return this.boundaryGeoJSON.coordinates.map((ring) =>
				ring.map(([lng, lat]) => [lat, lng])
			);
		}
		return null;
	}

	// Helper method to get GeoJSON feature
	toGeoJSONFeature() {
		return {
			type: 'Feature',
			properties: {
				id: this.id,
				name: this.name,
				code: this.code,
				type: this.type,
				population: this.population,
				areaSqm: this.areaSqm
			},
			geometry: this.boundaryGeoJSON
		};
	}
}

