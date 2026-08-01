/** @type {import("@sveltejs/vite-plugin-svelte").SvelteConfig} */
export default {
    compilerOptions: {
        warningFilter: (warning) => {
            if (warning.code.startsWith('a11y_')) {
                return false; // suppress all a11y warnings
            }
            return true;
        }
    }
}
