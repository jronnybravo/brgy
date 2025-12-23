<script lang="ts">
    import { Permission } from '$lib/utils/Permission';

    interface Props {
        selectedPermissions?: string[] | null;
        disabled?: boolean;
        id?: string;
        label?: string;
        helpText?: string;
    }

    let {
        selectedPermissions = $bindable([]),
        disabled = false,
        id = `permission-tree-${Math.random().toString(36).substring(2, 9)}`,
        label = '',
        helpText = ''
    }: Props = $props();

    interface PermissionNode {
        name: string;
        children: PermissionNode[];
        parent?: string;
        requires?: string[];
    }

    // Build tree and initialize expanded state in one pass
    const { tree: permissionTree, expanded: initialExpanded, nodeMap } = (() => {
        const hierarchy = Permission.getHierarchy();
        const expandedState: Record<string, boolean> = {};
        const map = new Map<string, PermissionNode>();
        
        function buildNode(key: string, value: any, parentName?: string): PermissionNode {
            const hasChildren = typeof value === 'object' && value !== true;
            
            // Extract requires property if it exists
            let requires: string[] | undefined;
            if (hasChildren && value.requires) {
                requires = Array.isArray(value.requires) ? value.requires : [value.requires];
            }
            
            // Build children, filtering out 'requires' property
            const children = hasChildren 
                ? Object.keys(value)
                    .filter(childKey => childKey !== 'requires')
                    .map(childKey => buildNode(childKey, value[childKey], key))
                : [];
            
            // Expand all parent nodes by default
            if (children.length > 0) {
                expandedState[key] = true;
            }
            
            const node: PermissionNode = { name: key, children, parent: parentName };
            if (requires) {
                node.requires = requires;
            }
            map.set(key, node);
            return node;
        }

        const tree = Object.keys(hierarchy).map(key => buildNode(key, hierarchy[key]));
        return { tree, expanded: expandedState, nodeMap: map };
    })();

    let expanded = $state<Record<string, boolean>>(initialExpanded);

    // Separate arrays: selectedPermissions (optimized) and checkedPermissions (for visual display)
    let checkedPermissions = $state<string[]>([]);

    // Checkbox refs for managing indeterminate state
    let checkboxRefs = $state<Record<string, HTMLInputElement | null>>({});

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
    const checkedSet = $derived(new Set(checkedPermissions));

    // Cache descendants for each node to avoid recomputation
    const descendantsCache = new Map<string, string[]>();
    
    function getDescendants(node: PermissionNode): string[] {
        if (descendantsCache.has(node.name)) {
            return descendantsCache.get(node.name)!;
        }
        
        const descendants: string[] = [];
        const traverse = (n: PermissionNode) => {
            n.children.forEach(child => {
                descendants.push(child.name);
                traverse(child);
            });
        };
        traverse(node);
        
        descendantsCache.set(node.name, descendants);
        return descendants;
    }

    // Get all siblings of a node
    function getSiblings(nodeName: string): string[] {
        const node = nodeMap.get(nodeName);
        if (!node?.parent) return [];
        
        const parent = nodeMap.get(node.parent);
        return parent ? parent.children.map(c => c.name).filter(n => n !== nodeName) : [];
    }

    // Get all ancestors (parents, grandparents, etc.)
    function getAncestors(nodeName: string): string[] {
        const ancestors: string[] = [];
        let current = nodeMap.get(nodeName);
        
        while (current?.parent) {
            ancestors.push(current.parent);
            current = nodeMap.get(current.parent);
        }
        
        return ancestors;
    }

    /**
     * Check if a parent node has partial selection (some but not all children selected)
     */
    const isPartiallySelected = (nodeName: string): boolean => {
        const node = nodeMap.get(nodeName);
        if (!node?.children.length || checkedSet.has(nodeName)) return false;
        
        return getDescendants(node).some(d => checkedSet.has(d));
    };

    // Update indeterminate state of checkboxes
    $effect(() => {
        for (const [nodeName, checkbox] of Object.entries(checkboxRefs)) {
            if (checkbox) {
                checkbox.indeterminate = isPartiallySelected(nodeName);
            }
        }
    });

    // Check scroll state when tree changes
    $effect(() => {
        // Trigger on tree expansion changes or permissions changes
        Object.keys(expanded);
        checkedPermissions.length;
        // Use setTimeout to ensure DOM has updated
        setTimeout(checkScroll, 0);
    });

    /**
     * Optimize permission assignments by removing redundant hierarchical relationships
     * Similar to Event.optimizeCategories()
     */
    function optimizePermissions(permissions: string[]): string[] {
        if (permissions.length <= 1) {
            return permissions;
        }

        let currentPermissions = [...permissions];
        let hasChanges = true;
        
        // Keep optimizing until no more changes occur
        while (hasChanges) {
            hasChanges = false;
            const currentIds = new Set(currentPermissions);
            const toRemove = new Set<string>();
            const toAdd = new Set<string>();

            // Remove parents when more specific children exist
            currentPermissions.forEach(permission => {
                if (toRemove.has(permission)) return;
                
                const node = nodeMap.get(permission);
                if (!node) return;
                
                // Check if any descendant exists in current permissions
                const descendants = getDescendants(node);
                for (const descendant of descendants) {
                    if (currentIds.has(descendant)) {
                        toRemove.add(permission);
                        break;
                    }
                }
            });

            // Replace complete sibling sets with their parent
            const processedParents = new Set<string>();
            currentPermissions.forEach(permission => {
                if (toRemove.has(permission)) return;
                
                const node = nodeMap.get(permission);
                if (!node || !node.parent || processedParents.has(node.parent)) return;
                
                const parentNode = nodeMap.get(node.parent);
                if (!parentNode || parentNode.children.length <= 1) return;
                
                const siblings = parentNode.children.map(c => c.name);
                const activeSiblings = siblings.filter(s => 
                    currentIds.has(s) && !toRemove.has(s)
                );
                
                // If all siblings are active, replace them with parent
                if (activeSiblings.length === siblings.length) {
                    siblings.forEach(sibling => toRemove.add(sibling));
                    toAdd.add(node.parent!);
                    processedParents.add(node.parent!);
                    hasChanges = true;
                }
            });

            // Apply optimizations
            if (toRemove.size > 0 || toAdd.size > 0) {
                currentPermissions = currentPermissions.filter(p => !toRemove.has(p));
                toAdd.forEach(p => currentPermissions.push(p));
            }
        }

        return currentPermissions;
    }

    /**
     * Expand permissions to get all checked items for visual display
     */
    const expandPermissions = (permissions: string[]): string[] => {
        const expanded = new Set<string>();
        
        for (const permission of permissions) {
            const node = nodeMap.get(permission);
            if (node) {
                expanded.add(permission);
                getDescendants(node).forEach(d => expanded.add(d));
            }
        }
        
        return Array.from(expanded);
    };

    // Update checkedPermissions whenever selectedPermissions changes
    $effect(() => {
        checkedPermissions = expandPermissions(selectedPermissions || []);
    });

    // Get all nodes that require a specific permission
    function getNodesThatRequire(nodeName: string): string[] {
        const dependents: string[] = [];
        for (const [name, node] of nodeMap.entries()) {
            if (node.requires && node.requires.includes(nodeName)) {
                dependents.push(name);
            }
        }
        return dependents;
    }

    // Recursively check if all siblings are checked and propagate parent selection upward
    const checkAndPropagateParent = (nodeName: string, selectedSet: Set<string>): void => {
        const node = nodeMap.get(nodeName);
        if (!node?.parent) return;
        
        const siblings = getSiblings(nodeName);
        if (siblings.length > 0 && siblings.every(s => selectedSet.has(s))) {
            selectedSet.add(node.parent);
            checkAndPropagateParent(node.parent, selectedSet);
        }
    };

    // Handle checkbox change
    const handleCheckboxChange = (nodeName: string, isChecked: boolean): void => {
        const node = nodeMap.get(nodeName);
        if (!node) return;

        const newSelected = new Set(checkedPermissions);

        if (isChecked) {
            // Add the node itself
            newSelected.add(nodeName);
            
            // Add all descendants
            getDescendants(node).forEach(d => newSelected.add(d));
            
            // Add all required permissions
            if (node.requires) {
                node.requires.forEach(required => {
                    newSelected.add(required);
                    const requiredNode = nodeMap.get(required);
                    if (requiredNode) {
                        getDescendants(requiredNode).forEach(d => newSelected.add(d));
                    }
                });
            }
            
            if (node.parent) newSelected.delete(node.parent);
            
            checkAndPropagateParent(nodeName, newSelected);
        } else {
            // Remove the node itself
            newSelected.delete(nodeName);
            
            // Remove all descendants
            getDescendants(node).forEach(d => newSelected.delete(d));
            
            // Remove all nodes that require this permission
            const dependents = getNodesThatRequire(nodeName);
            dependents.forEach(dependent => {
                newSelected.delete(dependent);
                const dependentNode = nodeMap.get(dependent);
                if (dependentNode) {
                    getDescendants(dependentNode).forEach(d => newSelected.delete(d));
                }
            });
            
            // Remove ancestors
            getAncestors(nodeName).forEach(a => newSelected.delete(a));
        }

        selectedPermissions = optimizePermissions(Array.from(newSelected));
    };

    // Flatten the tree for rendering
    const flatPermissions = $derived.by(() => {
        const result: Array<{ node: PermissionNode; level: number }> = [];
        
        const flatten = (nodes: PermissionNode[], level: number): void => {
            for (const node of nodes) {
                result.push({ node, level });
                if (expanded[node.name] && node.children.length > 0) {
                    flatten(node.children, level + 1);
                }
            }
        };
        
        flatten(permissionTree, 0);
        return result;
    });

    const toggleExpanded = (permission: string): void => {
        expanded[permission] = !expanded[permission];
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
        {#each flatPermissions as { node, level } (node.name)}
            {@const hasChildren = node.children.length > 0}
            {@const isExpanded = expanded[node.name]}
            {@const checkboxId = `${id}-${node.name}`}
            {@const hasRequires = node.requires && node.requires.length > 0}
            
            <div class="d-flex align-items-center py-2 rounded transition-colors" 
                style="margin-left: {level * 1.5}rem; cursor: pointer;" 
                role="button"
                tabindex="0"
                onmouseenter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                onmouseleave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <!-- Expand/Collapse Icon -->
                {#if hasChildren}
                    <button type="button"
                        onclick={() => toggleExpanded(node.name)}
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
                    checked={checkedSet.has(node.name)}
                    bind:this={checkboxRefs[node.name]}
                    onchange={(e) => handleCheckboxChange(node.name, e.currentTarget.checked)}
                    value={node.name}
                    {disabled} />

                <!-- Permission Label with Requires Icon -->
                <div class="d-flex align-items-center gap-2 flex-grow-1">
                    <label for={checkboxId}
                        class="form-label mb-0 cursor-pointer user-select-none"
                        style="font-weight: 500; font-size: 0.875rem;">
                        {node.name}
                    </label>

                    <!-- Requires Info Icon -->
                    {#if hasRequires}
                        <span class="cursor-help position-relative" 
                            style="display: inline-block;"
                            title="Requires: {node.requires?.join(', ')}">
                            <svg style="width: 1rem; height: 1rem; color: #999; flex-shrink: 0;" 
                                fill="currentColor" 
                                viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
                            </svg>
                        </span>
                    {/if}
                </div>
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

{#if selectedPermissions?.length}
    <div class="mt-3 d-flex flex-wrap gap-2 p-3">
        {#each selectedPermissions as permission}
            <span class="badge bg-primary" style="font-size: 0.75rem;">
                {permission}
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
