uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform float uProgress;

varying vec2 vUv;

void main() {
  vec4 tex1 = texture2D(uTexture1, vUv);
  vec4 tex2 = texture2D(uTexture2, vUv);
  gl_FragColor = mix(tex1, tex2, uProgress);
}
