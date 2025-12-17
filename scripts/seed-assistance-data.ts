import { AppDataSource } from '../src/lib/database/data-source.js';
import { Person, Sex } from '../src/lib/database/entities/Person.js';
import { Locality } from '../src/lib/database/entities/Locality.js';
import { FinancialAssistance, MedicineAssistance, FinancialAssistanceType } from '../src/lib/database/entities/Assistance.js';
import { faker } from '@faker-js/faker';

const MEDICINES = [
	{ name: 'Amoxicillin', generic: 'Amoxicillin', dosage: '500mg', unit: 'tablets' },
	{ name: 'Paracetamol', generic: 'Acetaminophen', dosage: '500mg', unit: 'tablets' },
	{ name: 'Ibuprofen', generic: 'Ibuprofen', dosage: '200mg', unit: 'tablets' },
	{ name: 'Vitamin C', generic: 'Ascorbic Acid', dosage: '1000mg', unit: 'tablets' },
	{ name: 'Metformin', generic: 'Metformin', dosage: '500mg', unit: 'tablets' },
	{ name: 'Atorvastatin', generic: 'Atorvastatin', dosage: '10mg', unit: 'tablets' },
	{ name: 'Omeprazole', generic: 'Omeprazole', dosage: '20mg', unit: 'capsules' },
	{ name: 'Cough Syrup', generic: 'Dextromethorphan', dosage: '10mg/5ml', unit: 'ml' },
	{ name: 'Antihistamine', generic: 'Cetirizine', dosage: '10mg', unit: 'tablets' },
	{ name: 'Blood Pressure Medication', generic: 'Lisinopril', dosage: '10mg', unit: 'tablets' }
];

const FINANCIAL_ASSISTANCE_TYPES = [
	FinancialAssistanceType.AICS,
	FinancialAssistanceType.MAIP,
	FinancialAssistanceType.TUPAD,
	FinancialAssistanceType.BURIAL_CASH_ASSISTANCE,
	FinancialAssistanceType.MEDICAL_CASH_ASSISTANCE
];

const PUROKS = [
	'Purок 1', 'Purок 2', 'Purок 3', 'Purок 4', 'Purок 5',
	'Sitio A', 'Sitio B', 'Sitio C', 'Downtown', 'Uptown'
];

function getRandomElement<T>(array: T[]): T {
	return array[Math.floor(Math.random() * array.length)];
}

async function seedPeople(barangayIds: number[]) {
	console.log('🌱 Seeding people...');
	const people: Person[] = [];

	// Create 50-150 people per barangay
	for (const barangayId of barangayIds) {
		const peopleCount = faker.number.int({ min: 50, max: 150 });

		for (let i = 0; i < peopleCount; i++) {
			const person = new Person();
			const firstName = faker.person.firstName();
			const lastName = faker.person.lastName();
			
			person.firstName = firstName;
			person.lastName = lastName;
			person.middleName = faker.datatype.boolean({ probability: 0.7 }) ? faker.person.lastName() : null;
			person.barangayId = barangayId;
			person.sex = faker.datatype.boolean() ? Sex.MALE : Sex.FEMALE;
			person.birthdate = faker.date.birthdate({ min: 18, max: 80, mode: 'age' });
			person.purok = getRandomElement(PUROKS);
			person.isSupporter = faker.datatype.boolean({ probability: 0.3 });
			person.isLeader = faker.datatype.boolean({ probability: 0.05 });
			person.precinct = String(faker.number.int({ min: 1, max: 300 })).padStart(3, '0');

			await person.save();
            await seedFinancialAssistances(person);
            await seedMedicineAssistances(person);
		}
	}

	console.log(`✅ Created ${people.length} people`);
	return people;
}

async function seedFinancialAssistances(person: Person) {
	console.log('🌱 Seeding financial assistances...');

	// Create 1-5 financial assistances per person (about 60% of people get one)
    if (faker.datatype.boolean({ probability: 0.6 })) {
        const assistanceCount = faker.number.int({ min: 1, max: 5 });

        for (let i = 0; i < assistanceCount; i++) {
            const assistance = new FinancialAssistance();
            assistance.personId = person.id;
            assistance.type = getRandomElement(FINANCIAL_ASSISTANCE_TYPES);
            assistance.disbursed_date = faker.date.past({ years: 2 });

            // Random amounts based on assistance type
            const amounts: Record<FinancialAssistanceType, number> = {
                [FinancialAssistanceType.AICS]: faker.number.int({ min: 5000, max: 10000 }),
                [FinancialAssistanceType.MAIP]: faker.number.int({ min: 15000, max: 23000 }),
                [FinancialAssistanceType.TUPAD]: faker.number.int({ min: 5000, max: 15000 }),
                [FinancialAssistanceType.BURIAL_CASH_ASSISTANCE]: 5000,
                [FinancialAssistanceType.MEDICAL_CASH_ASSISTANCE]: faker.number.int({ min: 5000, max: 25000 })
            };

            assistance.value = amounts[assistance.type] ?? 5000;
            await assistance.save();
        }
    }
}

async function seedMedicineAssistances(person: Person) {
	console.log('🌱 Seeding medicine assistances...');
	const medicineAssistances: MedicineAssistance[] = [];

	// Create 1-3 medicine assistances per person (about 40% of people get one)
    if (faker.datatype.boolean({ probability: 0.4 })) {
        const assistanceCount = faker.number.int({ min: 1, max: 3 });

        for (let i = 0; i < assistanceCount; i++) {
            const medicine = getRandomElement(MEDICINES);
            const assistance = new MedicineAssistance();
            
            assistance.personId = person.id;
            assistance.medicine_name = medicine.name;
            assistance.generic_name = medicine.generic;
            assistance.dosage = medicine.dosage;
            assistance.quantity = faker.number.int({ min: 10, max: 50 });
            assistance.unit = medicine.unit;
            assistance.disbursed_date = faker.date.past({ years: 2 });

            medicineAssistances.push(assistance);
        }
    }

	await MedicineAssistance.save(medicineAssistances);
	console.log(`✅ Created ${medicineAssistances.length} medicine assistance records`);
}

async function getBarangayIds(): Promise<number[]> {
	// Get all barangays from all municipalities
	const barangays = await Locality.find({
		where: { type: 'barangay' }
	});

	return barangays.map(b => b.id);
}

export async function seedAssistanceData() {
	try {
		// Initialize database connection
		if (!AppDataSource.isInitialized) {
			await AppDataSource.initialize();
		}

		// Get barangay IDs
		const barangayIds = await getBarangayIds();

		if (barangayIds.length === 0) {
			console.log('⚠️ No barangays found. Please seed localities first.');
			return;
		}

		console.log(`\n🌱 Starting seeder for assistance data...`);
		console.log(`📍 Found ${barangayIds.length} barangays\n`);

		// Seed people
		await seedPeople(barangayIds);

		console.log('\n✅ Seeding complete!\n');
		process.exit(0);
	} catch (error) {
		console.error('❌ Error seeding assistance data:', error);
		process.exit(1);
	}
}

// Run seeder if called directly
seedAssistanceData();
