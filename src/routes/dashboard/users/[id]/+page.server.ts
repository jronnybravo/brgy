import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { getDataSource } from '$lib/database/data-source';
import { User } from '$lib/database/entities/User';
import { Locality } from '$lib/database/entities/Locality';
import { IsNull } from 'typeorm';
import bcrypt from 'bcryptjs';

interface LocalityDTO {
	id: number;
	name: string;
	children?: LocalityDTO[];
}

/**
 * Recursively serialize Locality entities to plain objects
 */
function serializeLocality(locality: Locality): LocalityDTO {
	return {
		id: locality.id,
		name: locality.name,
		children: locality.children?.map(child => serializeLocality(child))
	};
}

/**
 * Count the maximum depth of a tree for debugging
 */
function getMaxTreeDepth(node: Locality, depth = 0): number {
	if (!node.children || node.children.length === 0) {
		return depth;
	}
	return Math.max(...node.children.map(child => getMaxTreeDepth(child, depth + 1)));
}

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const userId = params.id;
	const dataSource = await getDataSource();
	const localityRepository = dataSource.getRepository(Locality);

	// Load ALL localities - parentId column should have all the hierarchy info we need
	const allLocalities = await localityRepository.find({
		order: { name: 'ASC' }
	});

	// Find SIQUIJOR province and get all its descendants
	const siquijorProvince = allLocalities.find(loc => loc.name === 'SIQUIJOR' && loc.type === 'province');
	
	if (!siquijorProvince) {
		throw new Error('SIQUIJOR province not found in database');
	}

	// Filter to only include SIQUIJOR and its descendants
	const siquijorAndDescendants = new Set<number>();
	const collectDescendants = (localityId: number) => {
		siquijorAndDescendants.add(localityId);
		const children = allLocalities.filter(loc => loc.parentId === localityId);
		children.forEach(child => collectDescendants(child.id));
	};
	collectDescendants(siquijorProvince.id);

	const filteredLocalities = allLocalities.filter(loc => siquijorAndDescendants.has(loc.id));

	// Build tree structure using parentId column, starting from SIQUIJOR province
	const nodeMap = new Map<number, Locality>();
	const roots: Locality[] = [];

	// Initialize all nodes with empty children arrays and build map
	filteredLocalities.forEach(locality => {
		locality.children = [];
		nodeMap.set(locality.id, locality);
	});

	// Link children to parents using parentId
	filteredLocalities.forEach(locality => {
		if (locality.id === siquijorProvince.id) {
			// SIQUIJOR is our root
			roots.push(locality);
		} else {
			// This is a child - find its parent by parentId and add to its children
			const parent = nodeMap.get(locality.parentId!);
			if (parent && parent.children) {
				parent.children.push(locality);
			}
		}
	});

	// Sort children by name for consistency
	const sortChildren = (node: Locality) => {
		if (node.children && node.children.length > 0) {
			node.children.sort((a, b) => a.name.localeCompare(b.name));
			node.children.forEach(child => sortChildren(child));
		}
	};
	roots.forEach(root => sortChildren(root));

	// Debug: detailed logging
	console.log(`\n=== SIQUIJOR TREE DEBUG ===`);
	console.log(`Total localities in Siquijor: ${filteredLocalities.length}`);
	console.log(`Root: ${roots[0]?.name}`);
	
	roots.forEach(root => {
		const depth = getMaxTreeDepth(root);
		const countNodes = (node: Locality): number => {
			let count = 1;
			if (node.children) {
				count += node.children.reduce((sum, child) => sum + countNodes(child), 0);
			}
			return count;
		};
		const nodeCount = countNodes(root);
		console.log(`Root "${root.name}": depth=${depth}, total_nodes=${nodeCount}, direct_children=${root.children?.length || 0}`);
	});
	console.log(`=== END DEBUG ===\n`);

	// Serialize localities to plain objects for SvelteKit
	const serializedLocalities = roots.map(locality => serializeLocality(locality));

	// If id is 'new', return empty user data for creation
	if (userId === 'new') {
		return {
			user: null,
			isNew: true,
			currentUser: {
				id: locals.user.id,
				username: locals.user.username
			},
			localities: serializedLocalities
		};
	}

	// Otherwise, fetch the user for editing
	const numUserId = parseInt(userId || '0');
	if (isNaN(numUserId)) {
		throw redirect(302, '/dashboard/users');
	}

	const userRepository = dataSource.getRepository(User);

	const user = await userRepository.findOne({
		where: { id: numUserId },
		relations: ['jurisdictions']
	});

	if (!user) {
		throw redirect(302, '/dashboard/users');
	}

	return {
		user: {
			id: user.id,
			username: user.username,
			email: user.email,
			role: user.role,
			jurisdictionIds: user.jurisdictions?.map(j => j.id) || []
		},
		isNew: false,
		currentUser: {
			id: locals.user.id,
			username: locals.user.username
		},
		localities: serializedLocalities
	};
};

export const actions = {
	createUser: async ({ request, params }) => {
		const formData = await request.formData();
		const username = formData.get('username')?.toString();
		const email = formData.get('email')?.toString();
		const password = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();
		const role = formData.get('role')?.toString() || 'user';
		const jurisdictionIds = formData.getAll('jurisdictions').map(id => parseInt(id.toString()));

		// Validation
		if (!username || !email) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Username and email are required'
			});
		}

		if (email && !email.includes('@')) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Invalid email format'
			});
		}

		if (!password) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Password is required for new users'
			});
		}

		if (password.length < 6) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Password must be at least 6 characters long'
			});
		}

		if (password !== confirmPassword) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Passwords do not match'
			});
		}

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);
			const localityRepository = dataSource.getRepository(Locality);

			// Check if user already exists
			const existingUser = await userRepository.findOne({
				where: [{ username }, { email }]
			});

			if (existingUser) {
				return fail(400, {
					username,
					email,
					role,
					error: 'Username or email already exists'
				});
			}

			// Hash password
			const hashedPassword = await bcrypt.hash(password, 10);

			// Fetch jurisdictions if any were selected
			let jurisdictions: Locality[] = [];
			if (jurisdictionIds.length > 0) {
				jurisdictions = await localityRepository.findByIds(jurisdictionIds);
			}

			// Create new user
			const user = userRepository.create({
				username,
				email,
				password: hashedPassword,
				role,
				jurisdictions
			});

			await userRepository.save(user);

			return {
				success: true,
				message: 'User created successfully',
				userId: user.id
			};
		} catch (error) {
			console.error('Error creating user:', error);
			return fail(500, {
				username,
				email,
				role,
				error: 'Failed to create user'
			});
		}
	},

	updateProfile: async ({ request, params }) => {
		const userId = params.id;
		const formData = await request.formData();
		const username = formData.get('username')?.toString();
		const email = formData.get('email')?.toString();
		const role = formData.get('role')?.toString() || 'user';
		const jurisdictionIds = formData.getAll('jurisdictions').map(id => parseInt(id.toString()));

		if (!username || !email) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Username and email are required'
			});
		}

		if (email && !email.includes('@')) {
			return fail(400, {
				username,
				email,
				role,
				error: 'Invalid email format'
			});
		}

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);
			const localityRepository = dataSource.getRepository(Locality);

			const numUserId = parseInt(userId || '0');
			if (isNaN(numUserId)) {
				return fail(400, { error: 'Invalid user ID' });
			}

			const user = await userRepository.findOne({
				where: { id: numUserId },
				relations: ['jurisdictions']
			});

			if (!user) {
				return fail(404, {
					username,
					email,
					role,
					error: 'User not found'
				});
			}

			// Check if email is already taken by another user
			if (email !== user.email) {
				const existingEmail = await userRepository.findOne({
					where: { email }
				});

				if (existingEmail) {
					return fail(400, {
						username,
						email,
						role,
						error: 'Email already in use'
					});
				}
			}

			// Check if username is already taken by another user
			if (username !== user.username) {
				const existingUsername = await userRepository.findOne({
					where: { username }
				});

				if (existingUsername) {
					return fail(400, {
						username,
						email,
						role,
						error: 'Username already in use'
					});
				}
			}

			user.username = username;
			user.email = email;
			user.role = role || 'user';

			// Update jurisdictions
			if (jurisdictionIds.length > 0) {
				const jurisdictions = await localityRepository.findByIds(jurisdictionIds);
				user.jurisdictions = jurisdictions;
			} else {
				user.jurisdictions = [];
			}

			await userRepository.save(user);

			return {
				success: true,
				message: 'Profile updated successfully'
			};
		} catch (error) {
			console.error('Error updating profile:', error);
			return fail(500, {
				username,
				email,
				role,
				error: 'Failed to update profile'
			});
		}
	},

	updatePassword: async ({ request, params, locals }) => {
		const userId = params.id;
		const formData = await request.formData();
		const currentPassword = formData.get('currentPassword')?.toString();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!newPassword || !confirmPassword) {
			return fail(400, {
				passwordError: 'New password and confirmation are required'
			});
		}

		if (newPassword.length < 6) {
			return fail(400, {
				passwordError: 'Password must be at least 6 characters long'
			});
		}

		if (newPassword !== confirmPassword) {
			return fail(400, {
				passwordError: 'Passwords do not match'
			});
		}

		try {
			const dataSource = await getDataSource();
			const userRepository = dataSource.getRepository(User);

			const numUserId = parseInt(userId || '0');
			if (isNaN(numUserId)) {
				return fail(400, { passwordError: 'Invalid user ID' });
			}

			const user = await userRepository.findOne({
				where: { id: numUserId }
			});

			if (!user) {
				return fail(404, {
					passwordError: 'User not found'
				});
			}

			// If editing own password, verify current password
			if (locals.user && locals.user.id === numUserId) {
				const passwordMatch = await bcrypt.compare(currentPassword || '', user.password);
				if (!passwordMatch) {
					return fail(400, {
						passwordError: 'Current password is incorrect'
					});
				}
			}
			// If editing another user's password (admin), no verification needed

			// Hash new password
			const hashedPassword = await bcrypt.hash(newPassword, 10);
			user.password = hashedPassword;

			await userRepository.save(user);

			return {
				passwordSuccess: true,
				passwordMessage: 'Password updated successfully'
			};
		} catch (error) {
			console.error('Password update error:', error);
			return fail(500, {
				passwordError: 'Failed to update password'
			});
		}
	}
} satisfies Actions;
