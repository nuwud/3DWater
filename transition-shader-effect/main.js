import * as THREE from 'three';
import { GUI } from 'dat.gui';
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
  const poolDepth = 2;
  const poolYOffset = 2;

  // Restore the background image with clouds
  const backgroundTexture = new THREE.TextureLoader().load('assets/blue-cloudy-sky-background.jpg');
  scene.background = backgroundTexture;

  // Load the sky reflection texture
  const skyReflectionTexture = new THREE.TextureLoader().load('assets/blue-cloudy-sky-background.jpg');
  skyReflectionTexture.mapping = THREE.EquirectangularReflectionMapping;

  // Lower the water plane slightly below the wall edge
  const waterYOffset = poolYOffset - 0.05;

  // Add water plane for the top face with enhanced ripple effects and reflection
  const waterGeometry = new THREE.PlaneGeometry(poolSize, poolSize, 256, 256);
  const waterMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vReflect;
      uniform float time;
      uniform vec2 mousePosition;

      void main() {
        vUv = uv;

        // Calculate reflection vector
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vec3 cameraToVertex = normalize(worldPosition.xyz - cameraPosition);
        vReflect = reflect(cameraToVertex, vec3(0.0, 1.0, 0.0));

        // Simulate ripples using sine waves
        vec3 newPosition = position;
        float distance = length(uv - mousePosition);
        float ripple = sin(distance * 60.0 - time * 10.0) * 0.3 / (distance * 50.0 + 1.0); // Increased intensity and frequency
        newPosition.z += ripple;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vReflect;
      uniform vec3 waterColor;
      uniform sampler2D skyReflection;
      uniform float reflectionStrength;

      void main() {
        // Blend water color with sky reflection
        vec4 reflection = texture2D(skyReflection, vReflect.xy * 0.5 + 0.5);
        vec4 water = vec4(waterColor, 0.8); // Semi-transparent water
        gl_FragColor = mix(water, reflection, reflectionStrength);
      }
    `,
    uniforms: {
      waterColor: { value: new THREE.Color(0x87ceeb) },
      skyReflection: { value: skyReflectionTexture },
      time: { value: 0 },
      mousePosition: { value: new THREE.Vector2(-1, -1) }, // Default off-screen
      reflectionStrength: { value: 0.2 }, // Low reflection strength
    },
    transparent: true,
  });

  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  water.rotation.x = -Math.PI / 2;
  water.position.y = waterYOffset; // Lowered water plane
  scene.add(water);

  // Load textures for the inward-facing planes
  const wallTexture = new THREE.TextureLoader().load('assets/blue-square-pool-tiles-on-a-wall.jpg');
  wallTexture.wrapS = wallTexture.wrapT = THREE.ClampToEdgeWrapping;
  wallTexture.repeat.set(1, 1);

  // Materials for inward-facing and outward-facing sides
  const inwardWallMaterial = new THREE.MeshStandardMaterial({
    map: wallTexture,
    side: THREE.FrontSide, // Texture visible only from inside
    transparent: false, // Fully opaque inward-facing texture
  });

  const outwardWallMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000, // No color for outward-facing sides
    side: THREE.BackSide, // Transparent outward-facing side
    transparent: true,
    opacity: 0.0, // Fully transparent outward view
  });

  const createWall = (geometry) => {
    const inwardWall = new THREE.Mesh(geometry, inwardWallMaterial);
    const outwardWall = new THREE.Mesh(geometry, outwardWallMaterial);
    const wallGroup = new THREE.Group();
    wallGroup.add(inwardWall);
    wallGroup.add(outwardWall);
    return wallGroup;
  };

  const poolWalls = [
    createWall(new THREE.PlaneGeometry(poolSize, poolDepth)), // Front
    createWall(new THREE.PlaneGeometry(poolSize, poolDepth)), // Back
    createWall(new THREE.PlaneGeometry(poolSize, poolDepth)), // Left
    createWall(new THREE.PlaneGeometry(poolSize, poolDepth)), // Right
  ];

  // Position wall planes
  poolWalls[0].position.set(0, -poolDepth / 2 + poolYOffset, -poolSize / 2); // Front
  poolWalls[1].position.set(0, -poolDepth / 2 + poolYOffset, poolSize / 2); // Back
  poolWalls[1].rotation.y = Math.PI;
  poolWalls[2].position.set(-poolSize / 2, -poolDepth / 2 + poolYOffset, 0); // Left
  poolWalls[2].rotation.y = Math.PI / 2;
  poolWalls[3].position.set(poolSize / 2, -poolDepth / 2 + poolYOffset, 0); // Right
  poolWalls[3].rotation.y = -Math.PI / 2;

  poolWalls.forEach((wall) => scene.add(wall));

  // Add floor plane
  const floorTexture = new THREE.TextureLoader().load('assets/blue-tile-pattern-of-swimming-pool-tiles-pool-til.JPG');
  floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
  floorTexture.repeat.set(2, 2);

  const floorMaterial = new THREE.MeshStandardMaterial({
    map: floorTexture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });

  const poolFloor = new THREE.Mesh(new THREE.PlaneGeometry(poolSize, poolSize), floorMaterial);
  poolFloor.position.set(0, -poolDepth + poolYOffset, 0);
  poolFloor.rotation.x = -Math.PI / 2;
  scene.add(poolFloor);

  // Add refraction effects to walls and floor
  const refractionUniforms = {
    time: { value: 0 },
    rippleCenter: { value: new THREE.Vector2(-1, -1) }, // Default off-screen
    rippleIntensity: { value: 0.4 }, // Increased ripple intensity for refraction
  };

  const wallMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D wallTexture;
      uniform vec2 rippleCenter;
      uniform float rippleIntensity;
      uniform float time;

      void main() {
        // Simulate refraction by distorting texture coordinates
        float distance = length(vUv - rippleCenter);
        float ripple = sin(distance * 60.0 - time * 10.0) * rippleIntensity / (distance * 50.0 + 1.0);

        // Adjust ripple effect based on wall's relative position to the water plane
        vec2 direction = normalize(vUv - rippleCenter);
        vec2 distortedUv = vUv + ripple * direction * 0.5; // Hug the top of the wall

        vec4 color = texture2D(wallTexture, distortedUv);
        gl_FragColor = color;
      }
    `,
    uniforms: {
      wallTexture: { value: wallTexture },
      rippleCenter: refractionUniforms.rippleCenter,
      rippleIntensity: refractionUniforms.rippleIntensity,
      time: refractionUniforms.time,
    },
    transparent: true,
  });

  poolWalls.forEach((wall) => {
    wall.children[0].material = wallMaterial; // Apply refraction shader to inward-facing walls
  });

  const floorShaderMaterial = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D floorTexture;
      uniform vec2 rippleCenter;
      uniform float rippleIntensity;
      uniform float time;

      void main() {
        // Simulate refraction by distorting texture coordinates
        float distance = length(vUv - rippleCenter);
        float ripple = sin(distance * 60.0 - time * 10.0) * rippleIntensity / (distance * 50.0 + 1.0);

        // Subtle refraction effect on the floor
        vec2 direction = normalize(vUv - rippleCenter);
        vec2 distortedUv = vUv + ripple * direction * 0.3; // Reduce intensity for the floor

        vec4 color = texture2D(floorTexture, distortedUv);
        gl_FragColor = color;
      }
    `,
    uniforms: {
      floorTexture: { value: floorTexture },
      rippleCenter: refractionUniforms.rippleCenter,
      rippleIntensity: refractionUniforms.rippleIntensity,
      time: refractionUniforms.time,
    },
    transparent: true,
  });

  poolFloor.material = floorShaderMaterial;

  // Track mouse position for ripple effects
  const mouse = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();

  canvas.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update mouse position in water plane's UV coordinates
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(water);
    if (intersects.length > 0) {
      const uv = intersects[0].uv; // Get UV coordinates of the intersection
      waterMaterial.uniforms.mousePosition.value.set(uv.x, uv.y);
      refractionUniforms.rippleCenter.value.set(uv.x, uv.y);
    } else {
      waterMaterial.uniforms.mousePosition.value.set(-1, -1); // Off-screen
      refractionUniforms.rippleCenter.value.set(-1, -1);
    }
  });

  // Handle window resize
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });

  // Animate the scene
  const clock = new THREE.Clock();
  function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Update time uniform for ripple animation
    waterMaterial.uniforms.time.value = elapsedTime;
    refractionUniforms.time.value = elapsedTime;

    orbitControls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();
});