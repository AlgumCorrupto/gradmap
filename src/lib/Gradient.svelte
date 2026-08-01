<script lang="ts">
    import type { Stop } from "./types";

    type Color = [number, number, number, number];
    type Props = {
        stops?: Map<number, Stop>;
        onGradientChange: (image: ImageData) => void;
    };

    const defaultStops = new Map<number, Stop>([
        [
            0,
            {
                at: 0,
                color: [0, 0, 0, 255],
            },
        ],
        [
            1,
            {
                at: 1,
                color: [255, 255, 255, 255],
            },
        ],
    ]);

    let { stops, onGradientChange }: Props = $props();
    stops ??= defaultStops;

    let interaction_stack: number[] = $state([]);
    let is_dragging_handle: boolean = $state(false);

    let gradient_image: ImageData | undefined = undefined;
    function lerp(a: number, b: number, x:number): number {
        return (1 - x) * a + x * b;
    }

    function invLerp(a: number, b: number, x: number) {
        return (x - a) / (b - a);
    }

    function clamp01(x: number): number {
        return Math.max(0, Math.min(1, x));
    }

    let intp: (start: number, end: number, emt: number) => number = invLerp;

    function left_shoulder(x: number, center: number, right: number): number {
        return clamp01(intp(right, center, x));
    }

    function right_shoulder(x: number, left: number, center: number): number {
        return clamp01(intp(left, center, x));
    }

    function triangle(x: number, left: number, center: number, right: number): number {
        if (x < center)
            return clamp01(intp(left, center, x));

        return clamp01(intp(right, center, x));
    }

    function left_shoulder_c(
        accumulator: Color,
        pixel: number,
        stop: Stop,
        next: Stop
    ): Color {
        const w = left_shoulder(pixel / 255, stop.at, next.at);

        return [
            accumulator[0] + stop.color[0] * w,
            accumulator[1] + stop.color[1] * w,
            accumulator[2] + stop.color[2] * w,
            accumulator[3] + stop.color[3] * w,
        ];
    }

    function triangle_c(
        accumulator: Color,
        pixel: number,
        prev: Stop,
        stop: Stop,
        next: Stop
    ): Color {
        const w = triangle(pixel / 255, prev.at, stop.at, next.at);

        return [
            accumulator[0] + stop.color[0] * w,
            accumulator[1] + stop.color[1] * w,
            accumulator[2] + stop.color[2] * w,
            accumulator[3] + stop.color[3] * w,
        ];
    }

    function right_shoulder_c(
        accumulator: Color,
        pixel: number,
        prev: Stop,
        stop: Stop
    ): Color {
        const w = right_shoulder(pixel / 255, prev.at, stop.at);

        return [
            accumulator[0] + stop.color[0] * w,
            accumulator[1] + stop.color[1] * w,
            accumulator[2] + stop.color[2] * w,
            accumulator[3] + stop.color[3] * w,
        ];
    }

    let gradient_repr: HTMLDivElement;

    $effect(() => {
        gradient_image = render_gradient(
            Array.from(stops!.values()).sort((a, b) => a.at - b.at)
        );

        const canvas = document.createElement("canvas");
        canvas.width = gradient_image.width;
        canvas.height = gradient_image.height;

        const ctx = canvas.getContext("2d")!;
        ctx.putImageData(gradient_image, 0, 0);

        gradient_repr.style.backgroundImage = `url(${canvas.toDataURL()})`;
        onGradientChange(gradient_image);
    });

    function render_gradient(stps: Stop[]): ImageData {
        const data = new Uint8ClampedArray(256 * 4);
    
        const last = stps.length - 1;
    
        for (let x = 0; x < 256; x++) {
            let accumulator: Color = [0, 0, 0, 0];
        
            accumulator = left_shoulder_c(
                accumulator,
                x,
                stps[0],
                stps[1]
            );
        
            for (let i = 1; i < last; i++) {
                accumulator = triangle_c(
                    accumulator,
                    x,
                    stps[i - 1],
                    stps[i],
                    stps[i + 1]
                );
            }
        
            accumulator = right_shoulder_c(
                accumulator,
                x,
                stps[last - 1],
                stps[last]
            );
        
            const o = x * 4;
            data[o + 0] = accumulator[0];
            data[o + 1] = accumulator[1];
            data[o + 2] = accumulator[2];
            data[o + 3] = accumulator[3];
        }
    
        return new ImageData(data, 256, 1);
    }

    // svelte-ignore state_referenced_locally
    let stop_counter = $state(stops!.size)
    
    function at_to_percentage(at: number): number {
        return at * 100;
    }

    function rgba_to_css(color: Color): string {
        return `rgba(${color[0]},${color[1]},${color[2]},${color[3]/255})`
    }

    function select_curret_handle(id: number) {
        let len: number = interaction_stack.length;
        if(len == 0)
            interaction_stack.push(id);
        else if(interaction_stack[len-1] == id)
            "do nothing";
        else
            interaction_stack.push(id);

        is_dragging_handle = true;
    }

    function handle_ptup() {
        is_dragging_handle = false;
    }

    function btn_delete() {
        let ilen: number = interaction_stack.length;
        let slen: number = stops!.size;
        if(slen <= 2) return;
        let id = 0;
        if(ilen > 0) {
            id = interaction_stack[ilen-1];
        } else {
            id = stops!.keys().next().value!;
        }
        stops!.delete(id);
        stops = new Map(stops);
        interaction_stack = interaction_stack.filter((value: number) => value != id);
    }

    function btn_add() {
        let ilen: number = interaction_stack.length;
        let slen: number = stops!.size;
        
        stop_counter++;
        if(ilen >= 1) {
            const old: Stop = stops!.get(interaction_stack[ilen - 1])!;
            let new_stop: Stop = {at: 0.5, color: old.color}
            stops?.set(stop_counter, new_stop);
        } else {
            const first: Stop = stops!.values().next().value!;
            let new_stop: Stop = {at: 0.5, color: first.color}
            stops?.set(stop_counter, new_stop);
        }
        stops = new Map(stops)
    }

    let setting_color: boolean = $state(false);

    let color_dialog: HTMLDialogElement;
    let color_input: HTMLInputElement;

    function open_color_dialog(id: number) {
        select_curret_handle(id);
        is_dragging_handle = false;
        color_input.value = rgba_to_css(stops!.get(id)!.color);
        color_input.click();
    }

    function css_to_rgba(hex: string): Color {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);

        return [r, g, b, 255];
    }

    function color_change() {
        let curr_id: number = interaction_stack[interaction_stack.length-1];
        let color = css_to_rgba(color_input.value);
        let old_stop: Stop = stops!.get(curr_id)!
        old_stop.color = color;
        stops!.set(curr_id, old_stop)
        stops = new Map(stops)
    }

    function invert_color(c: Color): Color {
        return [255 - c[0], 255 - c[1], 255 - c[2], c[3]]
    }

    function handle_ptmove(ev: PointerEvent) {
        if (!is_dragging_handle)
            return;

        const id = interaction_stack[interaction_stack.length - 1];

        const rect = gradient_repr.getBoundingClientRect();

        let at = (ev.clientX - rect.left) / rect.width;

        at = Math.max(0, Math.min(1, at));

        stops!.get(id)!.at = at;
        stops = new Map(stops);
    }
</script>
    <input hidden onchange={() => color_change()} bind:this={color_input} type="color">


<svelte:window onpointerup={handle_ptup} onpointermove={handle_ptmove}/>

<div id="gradient_container">
    <div id="gradient_repr" bind:this={gradient_repr}>
    {#each [...stops] as [id, stop] (id)}
    <div class="stop" style:left="{at_to_percentage(stop.at)}%">
        <div class="stop_needle" 
             style:background-color="{rgba_to_css(invert_color(stop.color))}"
             
            ></div>
        <div ondblclick={() => open_color_dialog(id)} onpointerdown={() => select_curret_handle(id)} 
        class="stop_handle" style:background-color={rgba_to_css(stop.color)}
        style:border-color="{rgba_to_css(invert_color(stop.color))}"
        ></div>
    </div>
    {/each}
    </div>
    <div id="gradient_options">
        <button onclick={() => btn_add()}>+</button>
        <button onclick={() => btn_delete()}>-</button>
    </div>
</div>


<style>
    .stop_handle {
        position: absolute;
        left: 50%;
        bottom: 100%;
        width:  1em;
        height: 1.5em;
        transform: translate(-50%, 0.5em);
        border: 0.1em solid;
    }
    .stop_needle {
        isolation: isolate;
        height: 100%;
        width: 0.1em;
    }

    .stop {
        isolation: isolate;
        height: 100%;
        width: 0.25em;
        position: absolute;
        transform: translateX(-50%);
    }
    #gradient_container {
        height: 100%;
        display: flex;
    }
    #gradient_repr {
        flex-grow: 8;
        position: relative;
    }
    #gradient_repr {
        background-position: left center;
        background-repeat: no-repeat;
        background-size: 100% 100%;
    }

    #gradient_options {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }
    #gradient_options > button {
        flex-grow: 1;
    }
</style>

