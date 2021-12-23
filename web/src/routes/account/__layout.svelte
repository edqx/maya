<script lang="ts">
    import { onMount } from "svelte";

    let user = "";

    onMount(async () => {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/account/me`, {
            credentials: "include"
        });

        if (res.ok) {
            const json = await res.json();
            if (json.success) {
                user = json.data.username + "#" + json.data.discriminator;
            }
        }
    });

    async function logout() {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/discord`, {
            method: "DELETE",
            credentials: "include"
        });

        if (res.ok) {
            user = "";
        }
    }
</script>

{#if user}
    <span>Logged in as: {user} (<span class="fake-link" on:click={() => logout()}>logout</span>)</span><br>
    <slot></slot>
{:else}
    Not logged in, <a rel="external" href="{import.meta.env.VITE_API_BASE_URL}/auth/discord">login with discord</a>
{/if}