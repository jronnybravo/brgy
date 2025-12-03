/**
 * Direct database check bypassing the API
 */

import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { Locality } from '../src/lib/database/entities/Locality.js';

// Load environment variables
config();

const AppDataSource = new DataSource({
	type: 'mysql',
	host: process.env.DB_HOST || 'localhost',
	port: parseInt(process.env.DB_PORT || '3306'),
	username: process.env.DB_USERNAME || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_DATABASE || 'brgy_mapping',
	synchronize: true, // Auto-sync schema
	logging: false,
	entities: [Locality]
});

async function checkDatabase() {
	console.log('Connecting to database...\n');
	
	try {
		await AppDataSource.initialize();
		console.log('✓ Connected to database\n');
		
		const localityRepo = AppDataSource.getRepository(Locality);
		
		// Get total count
		const count = await localityRepo.count();
		console.log(`Total localities: ${count}`);
		
		// Get counts by type
		const barangays = await localityRepo.count({ where: { type: 'barangay' } });
		const municipalities = await localityRepo.count({ where: { type: 'municipality' } });
		const provinces = await localityRepo.count({ where: { type: 'province' } });
		const regions = await localityRepo.count({ where: { type: 'region' } });
		
		console.log('\nBy type:');
		console.log(`  Barangays: ${barangays}`);
		console.log(`  Municipalities: ${municipalities}`);
		console.log(`  Provinces: ${provinces}`);
		console.log(`  Regions: ${regions}`);
		
		// Get sample record
		const sample = await localityRepo.findOne({ where: { type: 'barangay' } });
		
		if (sample) {
			console.log('\nSample barangay:');
			console.log(`  Name: ${sample.name}`);
			console.log(`  Code: ${sample.code}`);
			console.log(`  Type: ${sample.type}`);
			console.log(`  Province Name: ${sample.provinceName || 'NULL'}`);
			console.log(`  Municipality Name: ${sample.municipalityName || 'NULL'}`);
			console.log(`  Region Name: ${sample.regionName || 'NULL'}`);
			
			const hasProvince = !!sample.provinceName;
			console.log(`\n${hasProvince ? '✓' : '✗'} Province name populated: ${hasProvince}`);
			
			if (!hasProvince) {
				console.log('\n⚠️  The provinceName field is NULL in existing records.');
				console.log('You need to re-seed the database to populate these fields.');
			} else {
				// Check for Siquijor
				const siquijorCount = await localityRepo.count({ 
					where: { 
						type: 'barangay',
						provinceName: 'SIQUIJOR'
					} 
				});
				console.log(`\nSiquijor barangays in database: ${siquijorCount}`);
			}
		}
		
		await AppDataSource.destroy();
		
	} catch (error) {
		console.error('\n❌ Error:', error.message);
		console.error(error);
		process.exit(1);
	}
}

checkDatabase();

