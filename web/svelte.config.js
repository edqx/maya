import adapter from "@sveltejs/adapter-node";
import preprocess from "svelte-preprocess";

const config = {
	preprocess: preprocess(),
	kit: {
		adapter: adapter({
			env: {
				PORT: "8001"
			}
		}),
		target: "#svelte"
	}
};

export default config;
