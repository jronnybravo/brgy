<script lang="ts">
	interface Props {
		selectedJurisdictions?: number[] | null;
		disabled?: boolean;
		id?: string;
		label?: string;
		helpText?: string;
		localities?: LocalityNode[];
	}

	interface LocalityNode {
		id: number;
		name: string;
		children?: LocalityNode[];
		parent?: LocalityNode;
	}

	let {
		selectedJurisdictions = $bindable([]),
		disabled = false,
		id = `jurisdiction-tree-${Math.random().toString(36).substring(2, 9)}`,
		label = '',
		helpText = '',
		localities = []
	}: Props = $props();

	let expanded = $state<Record<number, boolean>>({});
	let checkedJurisdictions = $state<number[]>([]);

	// Checkbox refs for managing indeterminate state
	let checkboxRefs = $state<Record<number, HTMLInputElement | null>>({});

	// Scroll indicator
	let showScrollIndicator = $state(false);
	let scrollContainer = $state<HTMLDivElement | undefined>(undefined);

	function checkScroll() {
		if (!scrollContainer) return;
		const hasScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;
		const isAtBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop <= scrollContainer.clientHeight + 5;
		showScrollIndicator = hasScroll && !isAtBottom;
	}

	// Use Set for O(1) lookups
	const checkedSet = $derived(new Set(checkedJurisdictions));

	// Build node map for quick lookups
	const nodeMap = $derived.by(() => {
		const map = new Map<number, LocalityNode>();
		const traverse = (node: LocalityNode, parent?: LocalityNode) => {
			node.parent = parent;
			map.set(node.id, node);
			node.children?.forEach(child => traverse(child, node));
		};
		localities.forEach(locality => traverse(locality));
		return map;
	});

	// Cache descendants for each node to avoid recomputation
	const descendantsCache = new Map<number, number[]>();

	function getDescendants(node: LocalityNode): number[] {
		if (descendantsCache.has(node.id)) {
			return descendantsCache.get(node.id)!;
		}

		const descendants: number[] = [];
		const traverse = (n: LocalityNode) => {
			n.children?.forEach(child => {
				descendants.push(child.id);
				traverse(child);
			});
		};
		traverse(node);

		descendantsCache.set(node.id, descendants);
		return descendants;
	}

	// Get all siblings of a node
	function getSiblings(nodeId: number): number[] {
		const node = nodeMap.get(nodeId);
		if (!node?.parent) return [];

		return node.parent.children?.map(c => c.id).filter(id => id !== nodeId) || [];
	}

	/**
	 * Recursively check if all siblings are checked and propagate parent selection upward
	 */
	const checkAndPropagateParent = (nodeId: number, selectedSet: Set<number>): void => {
		const node = nodeMap.get(nodeId);
		if (!node?.parent) return;

		const siblings = getSiblings(nodeId);
		if (siblings.length > 0 && siblings.every(s => selectedSet.has(s))) {
			selectedSet.add(node.parent.id);
			checkAndPropagateParent(node.parent.id, selectedSet);
		}
	};

	/**
	 * Expand jurisdictions to get all checked items for visual display
	 */
	const expandJurisdictions = (jurisdictions: number[]): number[] => {
		const expanded = new Set<number>();

		for (const jurisdiction of jurisdictions) {
			const node = nodeMap.get(jurisdiction);
			if (node) {
				expanded.add(jurisdiction);
				getDescendants(node).forEach(d => expanded.add(d));
			}
		}

		return Array.from(expanded);
	};

	// Update checkedJurisdictions whenever selectedJurisdictions changes
	$effect(() => {
		checkedJurisdictions = expandJurisdictions(selectedJurisdictions || []);
		
		// Auto-expand all parent nodes so we can see the selected items
		for (const jurisdiction of (selectedJurisdictions || [])) {
			let current = nodeMap.get(jurisdiction);
			while (current?.parent) {
				expanded[current.parent.id] = true;
				current = nodeMap.get(current.parent.id);
			}
		}
	});

	// Get all ancestors (parents, grandparents, etc.)
	function getAncestors(nodeId: number): number[] {
		const ancestors: number[] = [];
		let current = nodeMap.get(nodeId);

		while (current?.parent) {
			ancestors.push(current.parent.id);
			current = nodeMap.get(current.parent.id);
		}

		return ancestors;
	}

	/**
	 * Check if a parent node has partial selection (some but not all children selected)
	 */
	const isPartiallySelected = (nodeId: number): boolean => {
		const node = nodeMap.get(nodeId);
		if (!node?.children?.length || checkedSet.has(nodeId)) return false;

		return getDescendants(node).some(d => checkedSet.has(d));
	};

	// Update indeterminate state of checkboxes
	$effect(() => {
		for (const [nodeId, checkbox] of Object.entries(checkboxRefs)) {
			if (checkbox) {
				checkbox.indeterminate = isPartiallySelected(Number(nodeId));
			}
		}
	});

	// Check scroll state when tree changes
	$effect(() => {
		Object.keys(expanded);
		checkedJurisdictions.length;
		setTimeout(checkScroll, 0);
	});

	/**
	 * Optimize jurisdiction assignments by removing redundant hierarchical relationships
	 */
	function optimizeJurisdictions(jurisdictions: number[]): number[] {
		if (jurisdictions.length <= 1) {
			return jurisdictions;
		}

		let currentJurisdictions = [...jurisdictions];
		let hasChanges = true;

		while (hasChanges) {
			hasChanges = false;
			const currentIds = new Set(currentJurisdictions);
			const toRemove = new Set<number>();
			const toAdd = new Set<number>();

			// Replace complete sibling sets with their parent
			const processedParents = new Set<number>();
			currentJurisdictions.forEach(jurisdiction => {
				if (toRemove.has(jurisdiction)) return;
				
				const node = nodeMap.get(jurisdiction);
				if (!node?.parent || processedParents.has(node.parent.id)) return;
				
				const parentNode = nodeMap.get(node.parent.id);
				if (!parentNode || !parentNode.children || parentNode.children.length <= 1) return;
				
				const siblings = parentNode.children.map(c => c.id);
				const activeSiblings = siblings.filter(s => 
					currentIds.has(s) && !toRemove.has(s)
				);
				
				// If all siblings are active, replace them with parent
				if (activeSiblings.length === siblings.length) {
					siblings.forEach(sibling => toRemove.add(sibling));
					toAdd.add(node.parent.id);
					processedParents.add(node.parent.id);
					hasChanges = true;
				}
			});

			// Remove parents when more specific children exist (only if NOT all children)
			currentJurisdictions.forEach(jurisdiction => {
				if (toRemove.has(jurisdiction)) return;
				
				const node = nodeMap.get(jurisdiction);
				if (!node) return;
				
				// Check if any descendant exists in current jurisdictions
				const descendants = getDescendants(node);
				const descendantsInList = descendants.filter(d => currentIds.has(d) && !toRemove.has(d));
				
				// Only remove parent if SOME (not all) descendants exist
				if (descendantsInList.length > 0 && descendantsInList.length < descendants.length) {
					toRemove.add(jurisdiction);
				}
			});

			// Apply optimizations
			if (toRemove.size > 0 || toAdd.size > 0) {
				currentJurisdictions = currentJurisdictions.filter(j => !toRemove.has(j));
				toAdd.forEach(j => currentJurisdictions.push(j));
			}
		}

		// Deduplicate to handle any accidental duplicates from multiple optimization iterations
		return [...new Set(currentJurisdictions)];
	}

	function handleCheck(nodeId: number, isChecked: boolean) {
		if (disabled) return;

		const node = nodeMap.get(nodeId);
		if (!node) return;

		const newSelected = new Set(checkedJurisdictions);

		if (isChecked) {
			// Add the node itself
			newSelected.add(nodeId);

			// Add all descendants
			getDescendants(node).forEach(d => newSelected.add(d));

			// Delete parent (more specific selection takes precedence)
			if (node.parent) newSelected.delete(node.parent.id);

			// Check and propagate parent selection upward
			checkAndPropagateParent(nodeId, newSelected);
		} else {
			// Remove the node itself
			newSelected.delete(nodeId);

			// Remove all descendants
			getDescendants(node).forEach(d => newSelected.delete(d));

			// Remove ancestors
			getAncestors(nodeId).forEach(a => newSelected.delete(a));
		}

		selectedJurisdictions = optimizeJurisdictions(Array.from(newSelected));
	}

	// Flatten the tree for rendering
	const flatJurisdictions = $derived.by(() => {
		const result: Array<{ node: LocalityNode; level: number }> = [];
		
		const flatten = (nodes: LocalityNode[], level: number): void => {
			for (const node of nodes) {
				result.push({ node, level });
				if (expanded[node.id] && node.children && node.children.length > 0) {
					flatten(node.children, level + 1);
				}
			}
		};
		
		flatten(localities, 0);
		return result;
	});

	const toggleExpanded = (jurisdictionId: number): void => {
		expanded[jurisdictionId] = !expanded[jurisdictionId];
	};
</script>

{#if label}
	<label for={id} class="form-label fw-medium mb-2">
		{label}
	</label>
{/if}

<div class="position-relative w-100">
	{#if helpText}
		<p class="small text-muted mb-3">{helpText}</p>
	{/if}
	
	<div 
		bind:this={scrollContainer}
		onscroll={checkScroll}
		class="border border-secondary rounded p-2 w-100"
		style="background-color: #f8f9fa; max-height: 24rem; overflow-y: auto; scrollbar-width: thin;"
	>
		<div>
		{#each flatJurisdictions as { node, level } (node.id)}
			{@const hasChildren = node.children && node.children.length > 0}
			{@const isExpanded = expanded[node.id]}
			{@const checkboxId = `${id}-${node.id}`}
			
			<div class="d-flex align-items-center py-2 rounded transition-colors" 
				style="margin-left: {level * 1.5}rem; cursor: pointer;" 
				role="button"
				tabindex="0"
				onmouseenter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
				onmouseleave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
				<!-- Expand/Collapse Icon -->
				{#if hasChildren}
					<button type="button"
						onclick={() => toggleExpanded(node.id)}
						class="btn btn-sm btn-link ps-0 pe-2 text-secondary"
						aria-label={isExpanded ? 'Collapse' : 'Expand'}
						style="text-decoration: none; font-size: 0.875rem;">
						<svg class="transition-transform" style="width: 1rem; height: 1rem; transform: rotate({isExpanded ? '90' : '0'}deg);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
						</svg>
					</button>
				{:else}
					<span style="width: 1.5rem; flex-shrink: 0;"></span>
				{/if}

				<!-- Checkbox -->
				<input
					type="checkbox"
					id={checkboxId}
					class="form-check-input me-2"
					checked={checkedSet.has(node.id)}
					bind:this={checkboxRefs[node.id]}
					onchange={(e) => handleCheck(node.id, e.currentTarget.checked)}
					value={node.id}
					{disabled} />

				<!-- Label -->
				<label for={checkboxId}
					class="form-label mb-0 cursor-pointer user-select-none"
					style="font-weight: 500; font-size: 0.875rem;">
					{node.name}
				</label>
			</div>
		{/each}
		</div>
	</div>

	{#if showScrollIndicator}
		<div class="position-absolute bottom-0 start-0 end-0 d-flex align-items-end justify-content-center pb-2 pointer-events-none" 
			style="height: 4rem; background: linear-gradient(to top, rgba(248, 249, 250, 1), transparent);">
			<svg class="text-secondary" style="width: 1.25rem; height: 1.25rem; animation: bounce 1s infinite;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</div>
	{/if}
</div>

{#if selectedJurisdictions?.length}
	<div class="mt-3 d-flex flex-wrap gap-2 p-3">
		{#each selectedJurisdictions as jurisdictionId}
			{@const node = nodeMap.get(jurisdictionId)}
			<span class="badge bg-primary" style="font-size: 0.75rem;">
				{node?.name || jurisdictionId}
			</span>
		{/each}
	</div>
{/if}

<style>
	:global(.cursor-help) {
		cursor: help;
	}
	
	:global(.user-select-none) {
		user-select: none;
	}
	
	:global(.gap-2) {
		gap: 0.5rem;
	}
	
	@keyframes bounce {
		0%, 100% {
			opacity: 1;
			transform: translateY(0);
		}
		50% {
			opacity: 0.5;
			transform: translateY(0.25rem);
		}
	}
</style>
