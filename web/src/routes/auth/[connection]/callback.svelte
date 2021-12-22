<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    onMount(async () => {
        const exchangeCode = $page.query.get("code");

        if (!exchangeCode)
            return goto("/fail");

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/${$page.params.connection}/authorize?state=${$page.query.get("state")}`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                code: $page.query.get("code")
            })
        });

        if (res.ok) {
            goto("/account/connections");
        } else {
            goto("/fail");
        }
    });
</script>