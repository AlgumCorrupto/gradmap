import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import glsl from 'vite-plugin-glsl'

/** @type {import('vite').UserConfig} */
export default defineConfig({
  plugins: [svelte(), glsl({minify: true})],
  build: {
    outDir: "docs"
  }
  
})
