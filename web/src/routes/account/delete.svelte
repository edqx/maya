<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import Loader from "../../components/Loader.svg";

    let loading = true;
    let user: any = undefined;

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
            }
        } else {
            goto("/", { replaceState: true });
        }

        loading = false;
    });

    let failedToDeleteInfo = undefined;
    async function deleteInfo() {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/account`, {
            method: "DELETE",
            credentials: "include"
        });

        if (res.ok) {
            location.href = "/";
        } else {
            try {
                const json = await res.json();
                failedToDeleteInfo = res.status + " " + json.message;
            } catch (e) {
                failedToDeleteInfo = "" + res.status;
            }
        }
    }
</script>

<svelte:head>
    <title>Delete Account | Maya</title>
</svelte:head>

<div class="centre-wrapper">
    {#if loading}
        <Loader></Loader>
    {:else}
        <div class="centre">
            <span class="title">Are you sure you wish to delete all of your information?</span><br><br>
            {#if user}
                <div class="user-info">
                    <img class="user-pfp" src={profilePictureHref} width=26 alt="avatar"/>
                    <span class="user-tag">{user.username}<span class="user-discriminator">#{user.discriminator}</span></span>
                </div>
            {/if}
            <br>
            <span class="header">This includes:</span>
            <ul>
                <li>Your account</li>
                <li>Your settings</li>
                <li>Your account connections</li>
                <li>All sessions logged into this account</li>
                <li>Any server-side logs associated with this account</li>
            </ul>
            <span class="header">This could have undesired consequences. For example:</span>
            <ul>
                <li>Any slash commands you used previously will no longer respond to any more inputs</li>
                <li>You will have to re-connect all services if you decide to re-create your account</li>
            </ul>
            <span class="header">Keep in mind:</span>
            <ul>
                <li>Any server logs related to your account will not be deleted immediately, but will expire within <b>7</b> days, <b>unless you re-create your account</b></li>
            </ul>
            <b>This cannot be undone</b><br><br>
            <button on:click={() => goto("/", { replaceState: true })}>No, go back - save me from despair</button><br>
            <button on:click={() => deleteInfo()}>Yes, delete my account and all of my information</button>
            {#if failedToDeleteInfo}
                <span class="error">({failedToDeleteInfo})</span>
            {/if}
        </div>
    {/if}
</div>

<style>
    .centre-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .centre {
        width: 500px;
    }

    ul {
        text-align: left;
    }

    .title {
        font-size: 16pt;
    }
    
    .header {
        font-size: 13pt;
    }

    .user-info {
        display: flex;
        align-items: center;
        padding-left: 8px;
        margin-top: -8px;
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
    
    @media screen and (max-width: 600px) {
        .centre {
            width: 350px;
        }
    }
    
    @media screen and (max-width: 375px) {
        .centre {
            width: 300px;
        }
    }
</style>