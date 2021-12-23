<script>
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

<div class="centre-wrapper">
    <div class="centre">
        Are you sure you wish to delete all of your information? This includes:
        <ul>
            <li>Your account</li>
            <li>Your settings</li>
            <li>Your account connections</li>
            <li>All sessions logged into this account</li>
            <li>Any server-side logs associated with this account</li>
        </ul>
        <button on:click={() => deleteInfo()}>Yes, delete my account and all of my information</button>
        {#if failedToDeleteInfo}
            <span class="error">({failedToDeleteInfo})</span>
        {/if}
    </div>
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
        width: 300px;
    }

    ul {
        text-align: left;
    }
</style>