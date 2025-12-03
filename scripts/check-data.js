/**
 * Quick script to check what data is in the database
 */

const API_URL = 'http://localhost:5173/api/localities';

async function checkData() {
	console.log('Fetching all localities...\n');
	
	const response = await fetch(API_URL);
	
	if (!response.ok) {
		console.error(`API Error: ${response.status} ${response.statusText}`);
		const error = await response.text();
		console.error('Error details:', error);
		return;
	}
	
	const data = await response.json();
	
	if (!Array.isArray(data)) {
		console.error('API returned:', data);
		return;
	}
	
	console.log(`Total localities: ${data.length}`);
	
	// Count by type
	const byType = {};
	data.forEach(loc => {
		byType[loc.type] = (byType[loc.type] || 0) + 1;
	});
	
	console.log('\nBy type:');
	Object.entries(byType).forEach(([type, count]) => {
		console.log(`  ${type}: ${count}`);
	});
	
	// Show sample
	if (data.length > 0) {
		console.log('\nSample locality:');
		console.log(JSON.stringify(data[0], null, 2));
		
		// Check if provinceName exists
		const hasProvince = data.some(l => l.provinceName);
		console.log(`\nHas provinceName field populated: ${hasProvince}`);
		
		if (!hasProvince) {
			console.log('\n⚠️  Data does not have provinceName populated.');
			console.log('To enable province filtering, you need to re-seed:');
			console.log('  node scripts/seed-philippines-chunked.js');
		}
	}
}

checkData().catch(console.error);

