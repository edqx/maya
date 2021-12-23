<script lang="ts">
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import TailSpinLoader from "../components/tail-spin.svg"
import Fail from "./fail.svelte";

    let user: any = undefined;
    let allConnections: Record<string, string> = [];

    $: profilePictureHref = user
        ? user.avatar.startsWith("a_")
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.gif`
            : `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : undefined;

    onMount(async () => {
        const userRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/account/me`, {
            credentials: "include"
        });

        if (userRes.ok) {
            const json = await userRes.json();
            if (json.success) {
                user = json.data;
                
                const connectionsRes = await fetch(`${import.meta.env.VITE_API_BASE_URL}/account/connections`, {
                    credentials: "include"
                });

                if (connectionsRes.ok) {
                    const json = await connectionsRes.json();
                    if (json.success) {
                        allConnections = json.data.connections;
                    }
                }
            }
        }
    });

    let logoutLoading = false;
    async function logout() {
        logoutLoading = true;
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/discord`, {
            method: "DELETE",
            credentials: "include"
        });

        if (res.ok) {
            user = undefined;
        }

        logoutLoading = false;
    }

    let connectionLoading = new Set;
    async function unlinkConnection(unlinkedConnectionName: string) {
        connectionLoading.add(unlinkedConnectionName);
        connectionLoading = connectionLoading;
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/${unlinkedConnectionName}`, {
            method: "DELETE",
            credentials: "include"
        });

        if (res.ok) {
            allConnections[unlinkedConnectionName] = null;
            allConnections = allConnections;
        }
        
        connectionLoading.delete(unlinkedConnectionName);
        connectionLoading = connectionLoading;
    }

    const connections = [
        {
            id: "lichess",
            fancy: "Lichess",
            url: () => `https://lichess.org/@/${allConnections.lichess}`,
            icon: "/lichess.png"
        }
    ];

    let failInformation = undefined;
    if (typeof localStorage !== "undefined") {
        try {
            failInformation = JSON.parse(localStorage.getItem("fail"));
        } catch (e) {
            console.log(e, localStorage);
        }
        if (failInformation) {
            localStorage.removeItem("fail");
        }
    }

    const failedConnection = failInformation
        ? connections.find(connection => connection.id === failInformation.connectionId)
        : undefined;
</script>

<div class="centre-wrapper">
    <div class="centre">
        <span class="splash-title">Maya</span>
        {#if user}
            <span class="header">Logged in as</span>
            <div class="user-details">
                <div class="user-info">
                    <img class="user-pfp" src={profilePictureHref} width=26 alt="avatar"/>
                    <span class="user-tag">{user.username}<span class="user-discriminator">#{user.discriminator}</span></span>
                </div>
                <div class="user-actions">
                    <button style="width: 60px;" on:click={() => logout()}>
                        {#if logoutLoading}
                            <TailSpinLoader width={16}></TailSpinLoader>
                        {:else}
                            Logout
                        {/if}
                    </button>
                </div>
            </div>
            <div class="connections-list">
                <span class="header">Manage connections</span>
                {#if failedConnection}
                    <span class="error">
                        Failed to connect your account with {failedConnection.fancy}
                        {#if failInformation.status}
                            ({failInformation.status}, {failInformation.message})
                        {/if}
                    </span>
                {/if}
                {#each connections as connection}
                    <div class="connection">
                        <a class="connection-info" href="{allConnections[connection.id] ? connection.url() : ""}">
                            <img class="connection-image" src="{connection.icon}" width=26 alt="{connection.fancy} icon">
                            <span class="connection-name">{connection.fancy}</span>
                        </a>
                        <div class="connection-actions">
                            {#if allConnections[connection.id]}
                                <button style="width: 84px;" on:click={() => unlinkConnection(connection.id)}>
                                    {#if connectionLoading.has(connection.id)}
                                        <TailSpinLoader width={16}></TailSpinLoader>
                                    {:else}
                                        Disconnect
                                    {/if}
                                </button>
                            {:else}
                                <a rel="external" href="{import.meta.env.VITE_API_BASE_URL}/auth/{connection.id}">
                                    <button style="width: 65px;" on:click={() => unlinkConnection(connection.id)}>
                                        {#if connectionLoading.has(connection.id)}
                                            <TailSpinLoader width={16}></TailSpinLoader>
                                        {:else}
                                            Connect
                                        {/if}
                                    </button>
                                </a>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
            <a class="delete-info" href="/account/delete">Delete my Information</a>
        {:else}
            <div class="login">
                {#if failInformation && failInformation.connectionId === "discord"}
                    <span style="margin-bottom: 8px;" class="error">
                        Failed to connect your account with Discord
                        {#if failInformation.status}
                            ({failInformation.status}, {failInformation.message})
                        {/if}
                    </span>
                {/if}
                <a rel="external" href="{import.meta.env.VITE_API_BASE_URL}/auth/discord">
                    <button>Login with <img class="discord" src="/discord.svg" alt="discord" height=32></button>
                </a>
            </div>
        {/if}
    </div>
</div>

<style>
    .centre-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .centre {
        display: flex;
        flex-direction: column;
        width: 300px;
    }

    .splash-title {
        text-align: center;
        font-size: 34pt;
        padding: 16px;
        padding-bottom: 34px;
    }

    .header {
        font-size: 14pt;
        padding-top: 8px;
        padding-bottom: 8px;
    }

    .user-details {
        display: flex;
        align-items: center;
        padding: 8px;
    }

    .login {
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .user-info {
        display: flex;
        align-items: center;
        padding-left: 8px;
    }

    .user-pfp {
        border-radius: 50%;
    }

    .user-tag {
        padding-left: 6px;
    }

    .user-discriminator {
        font-size: 9pt;
        color: #aaaaaa;
    }

    .user-actions {
        order: 2;
        margin-left: auto;
    }

    .connections-list {
        display: flex;
        flex-direction: column;
    }

    .connection {
        display: flex;
        align-items: center;
        padding: 8px;
        padding-left: 16px;
    }

    .connection-info {
        color: #eeeeee;
        display: flex;
        align-items: center;
    }

    .connection-name {
        padding-left: 6px;
    }
    
    .connection-actions {
        order: 2;
        margin-left: auto;
    }

    .discord {
        padding-left: 8px;
    }

    .delete-info {
        margin-top: 8px;
    }
</style>