<script lang="ts">
    interface Props {
        currentPage?: number;
        totalPages?: number;
        maxVisiblePages?: number;
        onPageChange?: (page: number) => void;
    }
    
    let { 
        currentPage = 1, 
        totalPages = 1, 
        maxVisiblePages = 5,
        onPageChange 
    }: Props = $props();
    
    function handlePageChange(page: number) {
        if (page >= 1 && page <= totalPages) {
            onPageChange?.(page);
        }
    }

    const visiblePages = $derived.by(() => {
        const pages: number[] = [];
        const half = Math.floor(maxVisiblePages / 2);
        
        let start = Math.max(1, currentPage - half);
        let end = Math.min(totalPages, start + maxVisiblePages - 1);
        
        if (end - start + 1 < maxVisiblePages) {
            start = Math.max(1, end - maxVisiblePages + 1);
        }
        
        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        
        return pages;
    });
</script>

{#if totalPages > 1}
    <nav aria-label="Table pagination">
        <ul class="pagination mb-0">
            {#if !visiblePages.includes(1)}
                <li class="page-item" class:disabled={currentPage === 1}>
                    <button 
                        onclick={() => handlePageChange(1)}
                        class="page-link"
                        disabled={currentPage === 1}
                        title="First page"
                        aria-label="Go to first page">
                        <i class="bi bi-chevron-double-left"></i>
                    </button>
                </li>
            {/if}
            <li class="page-item" class:disabled={currentPage === 1}>
                <button 
                    onclick={() => handlePageChange(currentPage - 1)}
                    class="page-link"
                    disabled={currentPage === 1}
                    title="Previous page"
                    aria-label="Go to previous page">
                    <i class="bi bi-chevron-left"></i>
                </button>
            </li>
            {#each visiblePages as page}
                {@const activeClass = page === currentPage ? 'active' : ''}
                <li class="page-item {activeClass}">
                    <button 
                        onclick={() => handlePageChange(page)}
                        class="page-link"
                        disabled={page === currentPage}
                        aria-label="Go to page {page}">
                        {page}
                    </button>
                </li>
            {/each}
            <li class="page-item" class:disabled={currentPage === totalPages}>
                <button 
                    onclick={() => handlePageChange(currentPage + 1)}
                    class="page-link"
                    disabled={currentPage === totalPages}
                    title="Next page"
                    aria-label="Go to next page">
                    <i class="bi bi-chevron-right"></i>
                </button>
            </li>
            {#if !visiblePages.includes(totalPages)}
                <li class="page-item" class:disabled={currentPage === totalPages}>
                    <button 
                        onclick={() => handlePageChange(totalPages)}
                        class="page-link"
                        disabled={currentPage === totalPages}
                        title="Last page"
                        aria-label="Go to last page">
                        <i class="bi bi-chevron-double-right"></i>
                    </button>
                </li>
            {/if}
        </ul>
    </nav>
{/if}