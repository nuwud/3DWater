// Receive UV coordinates from the vertex shader
varying vec2 vUv;

uniform sampler2D uTexture1;
uniform sampler2D uTexture2;
uniform float uProgress;
uniform vec2 uMouse;
uniform float uTime;

void main() {
  vec2 st = vUv;

  // Increase ripple frequency and reduce amplitude further
  vec2 ripple = sin((st - uMouse) * 200.0 - uTime * 15.0) * 0.0025;

  vec3 color = texture2D(uTexture1, st + ripple).rgb;

  gl_FragColor = vec4(color, 0.8);
}
