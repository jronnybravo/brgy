<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import JurisdictionTreeSelector from '$lib/components/JurisdictionTreeSelector.svelte';

	interface LocalityNode {
		id: number;
		name: string;
		children: LocalityNode[];
	}

	export let user: {
		id: number;
		username: string;
		email: string;
		roleId: number | null;
		jurisdictionIds?: number[];
	} | null = null;
	export let form: any = null;
	export let isNew = false;
	export let localities: LocalityNode[] = [];

	let profileSubmitting = false;
	let passwordSubmitting = false;
	let showPasswordForm = false;

	// Form state for new user creation
	let formUsername = '';
	let formEmail = '';
	let formRoleId: number | null = null;
	let selectedJurisdictions: number[] = [];

	// Roles state
	let roles: Array<{ id: number; name: string; description: string | null }> = [];
	let loadingRoles = true;
	let rolesError = '';

	onMount(async () => {
		try {
			const response = await fetch('/api/roles');
			if (response.ok) {
				const data = await response.json();
				roles = data.roles;
			} else {
				rolesError = 'Failed to load roles';
			}
		} catch (error) {
			console.error('Error loading roles:', error);
			rolesError = 'Error loading roles';
		} finally {
			loadingRoles = false;
		}

		// Initialize jurisdictions from user if editing
		if (user?.jurisdictionIds) {
			selectedJurisdictions = [...user.jurisdictionIds];
		}
	});

	$: if (user && !isNew) {
		formUsername = user.username;
		formEmail = user.email;
		formRoleId = user.roleId;
	}

	function handleProfileSubmit() {
		profileSubmitting = true;
	}

	function handlePasswordSubmit() {
		passwordSubmitting = true;
	}

	$: if (form?.success) {
		profileSubmitting = false;
	}

	$: if (form?.passwordSuccess) {
		passwordSubmitting = false;
		showPasswordForm = false;
	}

	$: if (form?.error || form?.passwordError) {
		profileSubmitting = false;
		passwordSubmitting = false;
	}
</script>

<div class="row g-4">
	<!-- Profile Information Card -->
	<div class="col-12 col-lg-6">
		<div class="card shadow-sm border-0 rounded-3">
			<div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
				<h5 class="card-title mb-0 fw-bold" style="color: #2c3e50;">
					👤 Profile Information
				</h5>
			</div>
			<div class="card-body p-4">
				{#if form?.success}
					<div class="alert alert-success alert-dismissible fade show" role="alert">
						{form.message || 'Profile updated successfully!'}
						<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
					</div>
				{/if}

				{#if form?.error}
					<div class="alert alert-danger alert-dismissible fade show" role="alert">
						{form.error}
						<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
					</div>
				{/if}

				{#if !isNew}
					<form method="POST" action="?/updateProfile" use:enhance={handleProfileSubmit}>
						<div class="mb-3">
							<label for="username" class="form-label fw-medium" style="color: #2c3e50;">Username *</label>
							<input
								type="text"
								class="form-control"
								id="username"
								name="username"
								bind:value={formUsername}
								required
								style="border-color: #dee2e6;"
							/>
							<small class="text-muted">Your unique username for login</small>
						</div>

						<div class="mb-3">
							<label for="email" class="form-label fw-medium" style="color: #2c3e50;">Email Address *</label>
							<input
								type="email"
								class="form-control"
								id="email"
								name="email"
								bind:value={formEmail}
								required
								style="border-color: #dee2e6;"
							/>
							<small class="text-muted">We'll use this email for account notifications</small>
						</div>

						<div class="mb-3">
						<label for="role" class="form-label fw-medium" style="color: #2c3e50;">Role *</label>
						{#if loadingRoles}
							<div class="form-control" style="background-color: #f8f9fa;">
								<small class="text-muted">Loading roles...</small>
							</div>
						{:else if rolesError}
							<div class="form-control" style="background-color: #f8f9fa; border-color: #dc3545;">
								<small class="text-danger">{rolesError}</small>
							</div>
						{:else}
							<select id="role" class="form-select" name="roleId" bind:value={formRoleId} style="border-color: #dee2e6;">
								<option value={null}>-- Select a role --</option>
								{#each roles as role}
									<option value={role.id}>{role.name}</option>
								{/each}
							</select>
							{#if roles.length > 0 && roles.find(r => r.id === formRoleId)?.description}
								<small class="text-muted d-block mt-1">
									{roles.find(r => r.id === formRoleId)?.description}
								</small>
							{/if}
						{/if}

						<!-- Hidden jurisdictions input -->
						{#each selectedJurisdictions as jurisdictionId (jurisdictionId)}
							<input type="hidden" name="jurisdictions" value={jurisdictionId} />
						{/each}

						<button
							type="submit"
							class="btn w-100"
							style="background-color: #3498db; color: white; border: none; font-weight: 500; transition: all 0.3s;"
							disabled={profileSubmitting}
						>
							{#if profileSubmitting}
								<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
								Updating...
							{:else}
								💾 Save Changes
							{/if}
						</button>
					</form>
				{:else}
					<!-- For new users: show profile fields but no separate form, they'll be in the password form below -->
					<div class="mb-3">
						<label for="username" class="form-label fw-medium" style="color: #2c3e50;">Username *</label>
						<input
							type="text"
							class="form-control"
							id="username"
							name="username"
							bind:value={formUsername}
							required
							style="border-color: #dee2e6;"
						/>
						<small class="text-muted">Your unique username for login</small>
					</div>

					<div class="mb-3">
						<label for="email" class="form-label fw-medium" style="color: #2c3e50;">Email Address *</label>
						<input
							type="email"
							class="form-control"
							id="email"
							name="email"
							bind:value={formEmail}
							required
							style="border-color: #dee2e6;"
						/>
						<small class="text-muted">We'll use this email for account notifications</small>
					</div>

					<div class="mb-3">
						<label for="role" class="form-label fw-medium" style="color: #2c3e50;">Role *</label>
						{#if loadingRoles}
							<div class="form-control" style="background-color: #f8f9fa;">
								<small class="text-muted">Loading roles...</small>
							</div>
						{:else if rolesError}
							<div class="form-control" style="background-color: #f8f9fa; border-color: #dc3545;">
								<small class="text-danger">{rolesError}</small>
							</div>
						{:else}
							<select id="role" class="form-select" name="role" bind:value={formRoleId} style="border-color: #dee2e6;">
								{#each roles as role}
									<option value={role.id}>{role.name}</option>
								{/each}
							</select>
							{#if roles.length > 0 && roles.find(r => r.id === formRoleId)?.description}
								<small class="text-muted d-block mt-1">
									{roles.find(r => r.id === formRoleId)?.description}
								</small>
							{/if}
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

    <div class="col-12 col-lg-6">
        <div class="card shadow-sm border-0 rounded-3">
            <div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
                <h5 class="card-title mb-0 fw-bold" style="color: #2c3e50;">
                    🔒 Security
                </h5>
            </div>
            <div class="card-body p-4">
                {#if form?.passwordSuccess}
                    <div class="alert alert-success alert-dismissible fade show" role="alert">
                        {form.passwordMessage || 'Password updated successfully!'}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                {/if}

                {#if form?.passwordError}
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        {form.passwordError}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                {/if}

                {#if form?.error && isNew}
                    <div class="alert alert-danger alert-dismissible fade show" role="alert">
                        {form.error}
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                    </div>
                {/if}

                {#if isNew || showPasswordForm}
                    <form method="POST" action={isNew ? '?/createUser' : '?/updatePassword'} use:enhance={handlePasswordSubmit}>
                        {#if isNew}
                            <!-- Hidden fields from profile for new user creation -->
                            <input type="hidden" name="username" value={formUsername} />
                            <input type="hidden" name="email" value={formEmail} />
                            <input type="hidden" name="roleId" value={formRoleId} />
                            
                            <!-- Hidden jurisdictions input -->
                            {#each selectedJurisdictions as jurisdictionId (jurisdictionId)}
                                <input type="hidden" name="jurisdictions" value={jurisdictionId} />
                            {/each}
                        {/if}
                        
                        {#if !isNew}
                            <div class="mb-3">
                                <label for="currentPassword" class="form-label fw-medium" style="color: #2c3e50;">Current Password <span class="text-muted">(required to change your own password)</span></label>
                                <input
                                    type="password"
                                    class="form-control"
                                    id="currentPassword"
                                    name="currentPassword"
                                    style="border-color: #dee2e6;"
                                />
                                <small class="text-muted">Only required if you're changing your own password</small>
                            </div>
                        {/if}

                        <div class="mb-3">
                            <label for="newPassword" class="form-label fw-medium" style="color: #2c3e50;">
                                {#if isNew}
                                    Password
                                {:else}
                                    New Password
                                {/if}
                            </label>
                            <input
                                type="password"
                                class="form-control"
                                id="newPassword"
                                name="newPassword"
                                required
                                style="border-color: #dee2e6;"
                            />
                            <small class="text-muted">Minimum 6 characters</small>
                        </div>

                        <div class="mb-3">
                            <label for="confirmPassword" class="form-label fw-medium" style="color: #2c3e50;">Confirm Password</label>
                            <input
                                type="password"
                                class="form-control"
                                id="confirmPassword"
                                name="confirmPassword"
                                required
                                style="border-color: #dee2e6;"
                            />
                        </div>

                        <div class="d-grid gap-2">
                            <button
                                type="submit"
                                class="btn"
                                style="background-color: {isNew ? '#27ae60' : '#27ae60'}; color: white; border: none; font-weight: 500; transition: all 0.3s;"
                                disabled={passwordSubmitting}
                            >
                                {#if passwordSubmitting}
                                    <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                    {#if isNew}
                                        Creating...
                                    {:else}
                                        Updating...
                                    {/if}
                                {:else}
                                    {#if isNew}
                                        ✓ Create User
                                    {:else}
                                        ✓ Update Password
                                    {/if}
                                {/if}
                            </button>
                            {#if !isNew}
                                <button
                                    type="button"
                                    class="btn btn-outline-secondary"
                                    on:click={() => (showPasswordForm = false)}
                                    disabled={passwordSubmitting}
                                >
                                    Cancel
                                </button>
                            {/if}
                        </div>
                    </form>
                {:else}
                    <p class="text-muted mb-3">
                        Keep your account secure by using a strong password.
                    </p>
                    <button
                        type="button"
                        class="btn w-100"
                        style="background-color: #e74c3c; color: white; border: none; font-weight: 500; transition: all 0.3s;"
                        on:click={() => (showPasswordForm = true)}
                    >
                        🔑 Change Password
                    </button>
                {/if}
            </div>
        </div>
    </div>

	<!-- Jurisdictions Section -->
	<div class="col-12">
		<div class="card shadow-sm border-0 rounded-3">
			<div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
				<h5 class="card-title mb-0 fw-bold" style="color: #2c3e50;">
					🗺️ Jurisdictions
				</h5>
			</div>
			<div class="card-body p-4">
				<JurisdictionTreeSelector
					bind:selectedJurisdictions
					localities={localities}
					label="Assign Localities"
					helpText="Select the localities this user has jurisdiction over. This determines which areas the user can access and manage."
				/>
			</div>
		</div>
	</div>

	<!-- Account Info Section -->
	{#if !isNew}
		<div class="col-12">
			<div class="card shadow-sm border-0 rounded-3">
				<div class="card-header bg-white border-bottom" style="border-color: #e9ecef !important;">
					<h5 class="card-title mb-0 fw-bold" style="color: #2c3e50;">
						ℹ️ Account Information
					</h5>
				</div>
				<div class="card-body p-4">
					<div class="row">
						<div class="col-12 col-sm-6 mb-3">
							<p class="text-muted small mb-1">User ID</p>
							<p class="fw-medium" style="color: #2c3e50;">{user?.id}</p>
						</div>
						<div class="col-12 col-sm-6 mb-3">
							<p class="text-muted small mb-1">Account Role</p>
							<p class="fw-medium" style="color: #2c3e50;">
								<span class="badge bg-info text-dark text-capitalize">{user?.roleId}</span>
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.card {
		transition: all 0.3s ease;
	}

	.card:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1) !important;
	}
</style>
