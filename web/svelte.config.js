import adapter from "@sveltejs/adapter-node";
import rollupPluginSvg from "@netulip/rollup-plugin-svg";
import preprocess from "svelte-preprocess";

const config = {
	preprocess: preprocess(),
	extensions: [".svelte", ".svg"],
	kit: {
		adapter: adapter({
			env: {
				PORT: "8001"
			}
		}),
		target: "#svelte",
		vite: {
			plugins: [
				rollupPluginSvg.default({
					enforce: "pre"
				})
			]
		}
	}
};

export default config;
