<script lang="ts">
  import { onMount } from 'svelte';
  import Sample from './assets/shading_study.png'

  import Gradient from './lib/Gradient.svelte'

  import {Renderer, Program, Mesh, Plane, TextureLoader, Texture} from 'ogl';
  
  import TestFrag from './glsl/test.frag.glsl'
  import TestVert from './glsl/test.vert.glsl'

  let canvas: HTMLCanvasElement;
  let preview_container: HTMLDivElement;
  let renderer: Renderer;
  let shader_program: Program;
  let gradient_texture: Texture;
  let pending_gradient: ImageData;
  let image_texture: Texture;

  onMount(() => {
    renderer = new Renderer({ canvas, width: canvas.width, height: canvas.height });
    const gl = renderer.gl;

    image_texture = TextureLoader.load(gl, { src: Sample });
  
    shader_program = new Program(gl, {
        vertex: TestVert,
        fragment: TestFrag,
        uniforms: {
            target: { value: image_texture },
            gradient: { value: gradient_texture },
            uScale: { value: 1.0 }
        }
    });
    if (pending_gradient)
      updateGradient(pending_gradient);
    
    const geometry = new Plane(gl, {width: 2, height: 2});
    const fs_mesh = new Mesh(gl, { geometry, program: shader_program });

    function resize() {
        const r = preview_container.getBoundingClientRect();
    
        renderer.setSize(r.width, r.height);
    
        const canvasAspect = r.width / r.height;
        const imageAspect = image_texture.width / image_texture.height;
    
        let scaleX = 1;
        let scaleY = 1;
    
        if (imageAspect > canvasAspect) {
            scaleY = canvasAspect / imageAspect;
        } else {
            scaleX = imageAspect / canvasAspect;
        }
      
        shader_program.uniforms.uScale.value = [scaleX, scaleY];
    }

    resize();

    requestAnimationFrame(update);

    function update(t: number) {
      resize();
      renderer.render({ scene: fs_mesh });
      requestAnimationFrame(update);
    }
  })
  
  function updateGradient(gradient: ImageData) {
      if (!renderer || !shader_program) {
          pending_gradient = gradient;
          return;
      }

      gradient_texture = new Texture(renderer.gl, {
          image: gradient.data,
          width: gradient.width,
          height: gradient.height,
          format: renderer.gl.RGBA,
          type: renderer.gl.UNSIGNED_BYTE
      });

      shader_program.uniforms.gradient.value = gradient_texture;
  }

  function image_drop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files[0];
    
    if (file && file.type.startsWith('image/')) {
      const img = new Image();
      image_texture = new Texture(renderer.gl);
      img.onload = () => {
        image_texture.image = img;
        image_texture.width = img.width;
        image_texture.height = img.height;
        shader_program.uniforms.target.value = image_texture;
      }
      let src: string = URL.createObjectURL(file)
      img.src = src
    }
  }

</script>

<div ondrop={image_drop} ondragover={(e: DragEvent) => e.preventDefault()} id="root_container">
  <div bind:this={preview_container} id="preview_container">
    <!-- @ts-expect-error -->
    <canvas bind:this={canvas} style="width: 100%; height: 100%; object-fit:contain;">
    </canvas>
  </div>
  <div id="settings_container">
    <Gradient onGradientChange={updateGradient}/>
  </div>
</div>

<style>
#root_container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}
#settings_container {
  flex: 1;
  position: relative;
}

#preview_container {
  user-select: none;
  position: relative;
  background-color: black;
  flex: 6;

  height: 100%;
}

#root_container {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}

#preview_container,
#settings_container {
    min-height: 0;
}

</style>
