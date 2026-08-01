precision highp float;

varying vec2 vUv;

uniform sampler2D target;
uniform sampler2D gradient;

float luminance(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

void main() {
    if(vUv.x > 1.0 || vUv.x < 0.0 || vUv.y > 1.0 || vUv.y < 0.0 )
        discard;

    vec4 original = texture2D(target, vUv);
    vec4 transformed = texture2D(gradient, vec2(luminance(original.rgb), 0.5));

    gl_FragColor = transformed;
}