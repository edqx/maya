/// <reference types="@sveltejs/kit" />

interface ImportMetaEnv {
    VITE_API_BASE_URL: string;
}

interface ImportMeta {
    env: ImportMetaEnv;
}

declare module "*.svg" {
    import { SvelteComponent } from "svelte";
    const content: SvelteComponent;
    export default content;
}
  
declare module "*.svg?component" {
    import { SvelteComponent } from "svelte";
    const content: SvelteComponent;
    export default content;
}

declare module "*.svg?src" {
    const content: string;
    export default content;
}

declare module "*.svg?url" {
    const content: string;
    export default content;
}