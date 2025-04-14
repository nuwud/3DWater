// Vertex Shader
#version 300 es
precision highp float;

in vec3 position;
in vec2 uv;

out vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}

// Fragment Shader
#version 300 es
precision highp float;

uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uResolution;
uniform sampler2D uTexture;

in vec2 vUv;
out vec4 fragColor;

void main() {
  vec2 st = vUv;
  vec2 ripple = sin((st - uMouse) * 50.0 - uTime * 5.0) * 0.01;
  vec3 color = texture(uTexture, st + ripple).rgb;

  fragColor = vec4(color, 0.8);
}
