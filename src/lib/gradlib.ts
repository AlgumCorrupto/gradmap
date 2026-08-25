function invLerp(a: number, b: number, x: number) {
    return (x - a) / (b - a);
}

// se um número é menor que 0, retornar 0
// se um número é maior que 1, retornar 1
// essa função é útil pq os interpoladores apenas trabalham
// com valores normalizados.
function clamp01(x: number): number {
    return Math.max(0, Math.min(1, x));
}

// fiz isso pq eu provavelmente poderia mudar a interpolação linear por um outro tipo de interpolação
// como interpolação quadrática ou cúbica para melhores resultados
let intp: (start: number, end: number, emt: number) => number = invLerp;

// curvas fuzzy primitivas
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

// um ponto de controle
export interface Stop {
    at: number,                             //       0.0 ~ 1.0
    color: Color                            // rgba  0 ~ 255
}
// uma alias de uma tupla de 4 valores para o tipo cor
export type Color = [number, number, number, number];

// função que recebe uma lista ordenada de pontos de controle e rasteriza uma imagem de 256 pixels de largura
// e 1 pixel de altura
export function render_gradient(stps: Stop[]): ImageData {
    const data = new Uint8ClampedArray(256 * 4);

    const last = stps.length - 1;

    // para cada pixel
    for (let x = 0; x < 256; x++) {
        let accumulator: Color = [0, 0, 0, 0];
        
        // primeiro ponto de controle recebe a função left shoulder
        accumulator = left_shoulder_c(
            accumulator,
            x,
            stps[0],
            stps[1]
        );
    
        // os pontos do meio recebem a função triangular
        for (let i = 1; i < last; i++) {
            accumulator = triangle_c(
                accumulator,
                x,
                stps[i - 1],
                stps[i],
                stps[i + 1]
            );
        }
        
        // o último ponto de controle recebe a função right shoulder
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