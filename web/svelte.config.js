import adapter from "@sveltejs/adapter-node";
import preprocess from "svelte-preprocess";

const config = {
	preprocess: preprocess(),
	kit: {
		adapter: adapter(),
		target: "#svelte",
		env: {
			PORT: "8001"
		}
	}
};

export default config;
