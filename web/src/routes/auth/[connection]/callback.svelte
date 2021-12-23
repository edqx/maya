<script>
    import { onMount } from "svelte";
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";

    onMount(async () => {
        const exchangeCode = $page.query.get("code");
        const connection = $page.params.connection;
        const state = $page.query.get("state")

        if (!exchangeCode) {
            localStorage.setItem("fail", JSON.stringify({
                connectionId: connection,
                status: undefined,
                message: undefined
            }));
            return goto("/");
        }

        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/auth/${connection}/authorize?state=${state}`, {
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
            goto("/");
        } else {
            try {
                const json = await res.json();

                localStorage.setItem("fail", JSON.stringify({
                    connectionId: connection,
                    status: res.status,
                    message: json.message
                }));
                goto("/");
            } catch (e) {
                localStorage.setItem("fail", JSON.stringify({
                    connectionId: connection,
                    status: res.status,
                    message: undefined
                }));
                goto("/");
            }
        }
    });
</script>