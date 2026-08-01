attribute vec2 uv;
attribute vec2 position;

uniform vec2 uScale;

varying vec2 vUv;

void main() {
    vUv = uv - 0.5;
    vUv /= uScale;
    vUv += 0.5;
    gl_Position = vec4(position, 0, 1);
}