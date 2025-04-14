import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('#webgl');
  if (!canvas) {
    console.error('Canvas element with ID "webgl" not found.');
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 5, 10);

  const renderer = new THREE.WebGLRenderer({ canvas });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Add OrbitControls
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;

  // Add lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  // Pool dimensions
  const poolSize = 5;

  // Create a heightmap render target
  const heightmap = new THREE.WebGLRenderTarget(512, 512, {
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
  });

  // Shader for updating the heightmap
  const heightmapShader = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D heightmap;
      uniform vec2 mousePosition;
      uniform float time;

      void main() {
        vec2 uv = vUv;
        vec4 heightData = texture2D(heightmap, uv);

        // Add ripple effect at mouse position
        float distance = length(uv - mousePosition);
        float ripple = sin(distance * 40.0 - time * 5.0) * 0.1 / (distance * 40.0 + 1.0);

        gl_FragColor = heightData + vec4(ripple, ripple, ripple, 1.0);
      }
    `,
    uniforms: {
      heightmap: { value: heightmap.texture },
      mousePosition: { value: new THREE.Vector2(-1, -1) },
      time: { value: 0 },
    },
  });

  // Plane for the water
  const waterGeometry = new THREE.PlaneGeometry(poolSize, poolSize, 256, 256);
  const waterMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      uniform sampler2D heightmap;

      void main() {
        vUv = uv;
        vec3 newPosition = position;
        vec4 heightData = texture2D(heightmap, uv);
        newPosition.z += heightData.r * 0.5; // Use red channel for height
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 waterColor;

      void main() {
        gl_FragColor = vec4(waterColor, 0.8); // Semi-transparent water
      }
    `,
    uniforms: {
      heightmap: { value: heightmap.texture },
      waterColor: { value: new THREE.Color(0x87ceeb) },
    },
    transparent: true,
  });

  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // Track mouse position
  const mouse = new THREE.Vector2(-1, -1);
  canvas.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  });

  // Animate the scene
  const clock = new THREE.Clock();
  function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Update heightmap
    heightmapShader.uniforms.time.value = elapsedTime;
    heightmapShader.uniforms.mousePosition.value = mouse;

    renderer.setRenderTarget(heightmap);
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);

    orbitControls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
});
