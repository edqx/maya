<script lang="ts">
    import { onMount } from "svelte";

    let success = false;
    let allConnections: [string, string][] = [];

    onMount(async () => {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/account/connections`, {
            credentials: "include"
        });

        if (res.ok) {
            const json = await res.json();
            if (json.success) {
                allConnections = Object.entries(json.data.connections);
                success = true;
            }
        }
    });

    async function unlinkConnection(unlinkedConnectionName: string) {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/${unlinkedConnectionName}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (res.ok) {
            const idx = allConnections.findIndex(connection => connection[0] === unlinkedConnectionName);
            if (idx > -1) {
                allConnections[idx][1] = null;
                allConnections = allConnections;
            }
        }
    }
</script>

{#if success}
    {#each allConnections as connection}
        {#if connection[0] === "lichess"}
            Lichess -
            {#if connection[1]}
                <a href="https://lichess.com/@/{connection[1]}">{connection[1]}</a> (<span class="fake-link" on:click={() => unlinkConnection(connection[0])}>unlink</span>)
            {:else}
                <a href="{import.meta.env.VITE_API_BASE_URL}/auth/{connection[0]}">connect</a>
            {/if}
        {/if}
    {/each}
{:else}
    failed
{/if}