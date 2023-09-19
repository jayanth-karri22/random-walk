import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

THREE.ColorManagement.enabled = false;
const gui = new dat.GUI({
  width: 300,
});
const debugObject = {
  randomWalkType: "",
};

const bloomParams = {
  threshold: 0.1,
  strength: 1.5,
  radius: 1,
};
gui.add(bloomParams, "threshold", 0, 1).onChange((value) => {
  bloomPass.threshold = value;
});
gui.add(bloomParams, "strength", 0, 5).onChange((value) => {
  bloomPass.strength = value;
});
gui.add(bloomParams, "radius", 0, 1).onChange((value) => {
  bloomPass.radius = value;
});

gui
  .add(debugObject, "randomWalkType")
  .options(["simpleRandom", "multiAxisRandom"])
  .onChange((value) => {
    if (value === "simpleRandom") {
      randomWalk = simpleRandom;
    } else if (value === "multiAxisRandom") {
      randomWalk = multiAxisRandom;
    } else {
      randomWalk = simpleRandom;
    }
  });

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

//Distribution
const barGeometry = new THREE.BoxGeometry(1, 1, 1);
const barMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff });
const barMesh = new THREE.Mesh(barGeometry, barMaterial);

// Particle Color & Material
const particleColor = new THREE.Color(0x0077ff);
const particleMaterial = new THREE.MeshPhongMaterial({
  color: particleColor,
  emissive: particleColor,
  shininess: 100,
  specular: new THREE.Color(0x00aaff),
});
const particleMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.02, 32, 32),
  particleMaterial
);
scene.add(particleMesh);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const pointLight = new THREE.PointLight(0xffffff, 0.2);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.set(1, 1, 1);
scene.add(camera);

// Bloom effect setup
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  1.5,
  0.4,
  0.85
);
bloomPass.threshold = 0.1;
bloomPass.strength = 1.5;
bloomPass.radius = 1;
bloomPass.renderToScreen = true;

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

const size = 100;
const divisions = 100;
const gridHelper = new THREE.GridHelper(size, divisions, 0x222222, 0x222222);
gridHelper.position.y = -1;
scene.add(gridHelper);

// Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setClearColor(new THREE.Color(0x000000));

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

const maxTrailLength = 5000;
const trailPositions = new Float32Array(maxTrailLength * 3);
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(trailPositions, 3)
);

const trailMaterial = new THREE.LineBasicMaterial({
  color: 0x00aaff,
  multiFace: true,
});
const trailLine = new THREE.Line(trailGeometry, trailMaterial);
scene.add(trailLine);

const choiceCounts = new Array(7).fill(0);

// const bars = [];
// for (let i = 0; i < 7; i++) {
//   const bar = barMesh.clone();
//   bar.position.set(i - 3, 0, -5);
//   scene.add(bar);
//   bars.push(bar);
// }

const simpleRandom = () => {
  let choice = Math.floor(Math.random() * 7) + 1;
  if (currentTrailLength < maxTrailLength) {
    const offset = currentTrailLength * 3;

    trailPositions[offset] = particleMesh.position.x;
    trailPositions[offset + 1] = particleMesh.position.y;
    trailPositions[offset + 2] = particleMesh.position.z;

    // if (choice > 6) {
    //   choice = 1;
    // }
    // choiceCounts[choice - 1]++;

    // const maxCount = Math.max(...choiceCounts);
    // for (let i = 0; i < bars.length; i++) {
    //   bars[i].scale.y = choiceCounts[i] / maxCount; // Normalize to the max count
    //   bars[i].position.y = bars[i].scale.y / 2;
    // }

    switch (choice) {
      case 1:
        particleMesh.position.x += 0.05;
        break;
      case 2:
        particleMesh.position.x -= 0.05;
        break;
      case 3:
        particleMesh.position.y += 0.05;
        break;
      case 4:
        particleMesh.position.y -= 0.05;
        break;
      case 5:
        particleMesh.position.z += 0.05;
        break;
      case 6:
        particleMesh.position.z -= 0.05;
        break;
      default:
        particleMesh.position.x += 0.05;
        break;
    }

    // Update the trail positions again after making changes
    trailPositions[offset] = particleMesh.position.x;
    trailPositions[offset + 1] = particleMesh.position.y;
    trailPositions[offset + 2] = particleMesh.position.z;

    currentTrailLength++;

    // Update draw range and flag the geometry as needing an update
    trailGeometry.setDrawRange(0, currentTrailLength);
    trailGeometry.attributes.position.needsUpdate = true;
  }
};

const multiAxisRandom = () => {
  if (currentTrailLength < maxTrailLength) {
    // Set the latest position (changing all three axes)
    particleMesh.position.x += (Math.random() - 0.5) * 0.1;
    particleMesh.position.y += (Math.random() - 0.5) * 0.1;
    particleMesh.position.z += (Math.random() - 0.5) * 0.1;
    const offset = currentTrailLength * 3;
    trailPositions[offset] = particleMesh.position.x;
    trailPositions[offset + 1] = particleMesh.position.y;
    trailPositions[offset + 2] = particleMesh.position.z;

    currentTrailLength++;

    // Update draw range and flag the geometry as needing an update
    trailGeometry.setDrawRange(0, currentTrailLength);
    trailGeometry.attributes.position.needsUpdate = true;
  }
};

let randomWalk = simpleRandom;

// Animation loop
let currentTrailLength = 0;
const clock = new THREE.Clock();
const tick = () => {
  randomWalk();

  const elapsedTime = clock.getElapsedTime();
  controls.update();
  composer.render();
  window.requestAnimationFrame(tick);
};

tick();
