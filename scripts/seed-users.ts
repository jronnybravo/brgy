import { AppDataSource } from '../src/lib/database/data-source.js';
import { User } from '../src/lib/database/entities/User.js';
import { Locality } from '../src/lib/database/entities/Locality.js';
import { Role } from '../src/lib/database/entities/Role.js';
import bcryptjs from 'bcryptjs';
import { faker } from '@faker-js/faker';

async function seedUsers() {
	console.log('🌱 Initializing database connection...');
	
	if (!AppDataSource.isInitialized) {
		await AppDataSource.initialize();
	}

	try {
		console.log('🌱 Fetching all barangays...');
		
		// Get all barangays (locality type = 'barangay')
		const barangays = await Locality.find({
			where: { type: 'barangay' }
		});

		if (barangays.length === 0) {
			console.warn('⚠️  No barangays found in the database');
			return;
		}

		console.log(`✅ Found ${barangays.length} barangays`);

		// Get roles 2 and 7
		const role2 = await Role.findOne({ where: { id: 2 } });
		const role7 = await Role.findOne({ where: { id: 7 } });

		if (!role2 || !role7) {
			console.error('❌ Roles 2 or 7 not found in the database');
			return;
		}

		console.log(`✅ Found roles: ${role2.name} (ID: 2), ${role7.name} (ID: 7)`);

		let usersCreated = 0;

		// For each barangay, create 2 users with different roles
		for (const barangay of barangays) {
			// User 1 with role 2
			const user1 = new User();
			user1.username = faker.internet.username();
			user1.email = faker.internet.email();
			user1.password = await bcryptjs.hash('password', 10); // Default password
			user1.roleId = role2.id;
			user1.jurisdictions = [barangay];

			await user1.save();
			usersCreated++;
			console.log(`✅ Created user: ${user1.username} (Role: ${role2.name})`);

			// User 2 with role 7
			const user2 = new User();
			user2.username = faker.internet.username();
			user2.email = faker.internet.email();
			user2.password = await bcryptjs.hash('password', 10); // Default password
			user2.roleId = role7.id;
			user2.jurisdictions = [barangay];

			await user2.save();
			usersCreated++;
			console.log(`✅ Created user: ${user2.username} (Role: ${role7.name})`);
		}

		console.log(`\n✅ Seeding completed! Created ${usersCreated} users`);
	} catch (error) {
		console.error('❌ Error during seeding:', error);
	} finally {
		if (AppDataSource.isInitialized) {
			await AppDataSource.destroy();
		}
	}
}

seedUsers();
