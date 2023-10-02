import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as dat from "lil-gui";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { Noise } from "noisejs";

THREE.ColorManagement.enabled = false;
const gui = new dat.GUI({
  width: 300,
});
const debugObject = {
  randomWalkType: "simulateCoinToss",
  showDistribution: false,
  weightTowardsPositiveSide: false,
  restartSimulation: () => {
    currentTrailLength = 0;
    for (let i = 0; i < choiceCounts.length; i++) {
      choiceCounts[i] = 0;
    }
    for (let i = 0; i < bars.length; i++) {
      bars[i].scale.y = 0;
      bars[i].position.y = 0;
    }
    particleMesh.position.set(0, 0, 0);
    debugObject.restart = false;
  },
  foodAttractionForce: 0.1,
  usePerlinNoise: false,
};

const foodAttractionController = gui
  .add(debugObject, "foodAttractionForce", 0, 1)
  .name("Food Attraction Force");

foodAttractionController.hide();

const bloomParams = {
  threshold: 0.1,
  strength: 0.5,
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
  .options(["simulateCoinToss", "modifiedCoinToss", "levysFlight"])
  .onChange((value) => {
    if (value === "simulateCoinToss") {
      randomWalk = simulateCoinToss;
    } else if (value === "modifiedCoinToss") {
      randomWalk = modifiedCoinToss;
    }
    if (value === "levysFlight") {
      randomWalk = levysFlight;
    } else {
      randomWalk = simulateCoinToss;
    }

    if (value === "levysFlight") {
      foodAttractionController.show();
      foodMesh.visible = true;
    } else {
      foodAttractionController.hide();
      foodMesh.visible = false;
    }
  });
gui.add(debugObject, "showDistribution").onChange((value) => {
  if (value) {
    for (let i = 0; i < bars.length; i++) {
      bars[i].visible = true;
    }
  } else {
    for (let i = 0; i < bars.length; i++) {
      bars[i].visible = false;
    }
  }
});
gui.add(debugObject, "weightTowardsPositiveSide");
gui.add(debugObject, "restartSimulation");
gui.add(debugObject, "usePerlinNoise").name("Use Perlin Noise");

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

//Distribution
const barGeometry = new THREE.BoxGeometry(1, 1, 1);
const barMaterial = new THREE.MeshBasicMaterial({
  color: 0xffaa00,
  transparent: true,
  opacity: 0.5,
});
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
camera.position.set(1, 5, 5);
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
bloomPass.strength = 0.5;
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

const bars = [];
for (let i = 0; i < 8; i++) {
  const bar = barMesh.clone();
  bar.position.set(i - 3, 0, -5);
  bar.visible = false;
  scene.add(bar);
  bars.push(bar);
}
//FIND FOOD

const foodMaterial = new THREE.MeshPhongMaterial({
  color: new THREE.Color(0xff0000),
  emissive: new THREE.Color(0xff0000),
  shininess: 100,
  specular: new THREE.Color(0xffaaff),
});

const foodMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.1, 32, 32),
  foodMaterial
);
foodMesh.position.set(
  Math.random() * 10 - 5,
  Math.random() * 10 - 5,
  Math.random() * 10 - 5
);
scene.add(foodMesh);

foodMesh.visible = false;

// //

const noise = new Noise(Math.random());
let perlinOffset = 0;
let perlinX = Math.random() * 1000;
let perlinY = Math.random() * 1000;
let perlinZ = Math.random() * 1000;

const simulateCoinToss = () => {
  let choice;
  if (debugObject.usePerlinNoise) {
    const perlinValue = noise.simplex3(perlinX, perlinY, perlinZ);
    perlinX += (Math.random() - 0.5) * 0.2;
    perlinY += (Math.random() - 0.5) * 0.2;
    perlinZ += (Math.random() - 0.5) * 0.2;
    choice = Math.floor((perlinValue + 1) * 4);
  } else {
    choice = debugObject.weightTowardsPositiveSide
      ? Math.floor(Math.random() * 9)
      : Math.floor(Math.random() * 8);
  }
  if (currentTrailLength < maxTrailLength) {
    if (debugObject.randomWalkType === "levysFlight") {
      levysFlight();
    } else {
      const offset = currentTrailLength * 3;

      trailPositions[offset] = particleMesh.position.x - 0.5;
      trailPositions[offset + 1] = particleMesh.position.y - 0.5;
      trailPositions[offset + 2] = particleMesh.position.z - 0.5;

      // if (choice > 6) {
      //   choice = 1;
      // }
      if (choice === 8) {
        choice = 1;
      }
      choiceCounts[choice - 1]++;

      const maxCount = Math.max(...choiceCounts);
      for (let i = 0; i < bars.length; i++) {
        bars[i].scale.y = choiceCounts[i] / maxCount;
        bars[i].position.y = bars[i].scale.y / 2;
      }

      switch (choice) {
        case 0: // HHH
        case 8: //Biased
          particleMesh.position.x += 0.05;
          particleMesh.position.y += 0.05;
          particleMesh.position.z += 0.05;
          break;
        case 1: // HHT
          particleMesh.position.x += 0.05;
          particleMesh.position.y += 0.05;
          particleMesh.position.z -= 0.05;
          break;
        case 2: // HTH
          particleMesh.position.x += 0.05;
          particleMesh.position.y -= 0.05;
          particleMesh.position.z += 0.05;
          break;
        case 3: // HTT
          particleMesh.position.x += 0.05;
          particleMesh.position.y -= 0.05;
          particleMesh.position.z -= 0.05;
          break;
        case 4: // THH
          particleMesh.position.x -= 0.05;
          particleMesh.position.y += 0.05;
          particleMesh.position.z += 0.05;
          break;
        case 5: // THT
          particleMesh.position.x -= 0.05;
          particleMesh.position.y += 0.05;
          particleMesh.position.z -= 0.05;
          break;
        case 6: // TTH
          particleMesh.position.x -= 0.05;
          particleMesh.position.y -= 0.05;
          particleMesh.position.z += 0.05;
          break;
        case 7: // TTT
          particleMesh.position.x -= 0.05;
          particleMesh.position.y -= 0.05;
          particleMesh.position.z -= 0.05;
          break;
      }
      updateTrail();
    }
  }
};

const modifiedCoinToss = () => {
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

const levyFlightStepSize = () => {
  const random = Math.random();
  const alpha = 2;

  return Math.pow(random, -1 / alpha);
};

const updateTrail = () => {
  const offset = currentTrailLength * 3;

  trailPositions[offset] = particleMesh.position.x;
  trailPositions[offset + 1] = particleMesh.position.y;
  trailPositions[offset + 2] = particleMesh.position.z;

  currentTrailLength++;
  trailGeometry.setDrawRange(0, currentTrailLength);
  trailGeometry.attributes.position.needsUpdate = true;
};

const levysFlight = () => {
  const directionToFood = new THREE.Vector3()
    .subVectors(foodMesh.position, particleMesh.position)
    .normalize();

  if (debugObject.usePerlinNoise) {
    const perturbation = new THREE.Vector3(
      noise.simplex3(perlinX, perlinY, perlinZ),
      noise.simplex3(perlinY, perlinZ, perlinX),
      noise.simplex3(perlinZ, perlinX, perlinY)
    ).normalize();

    const noiseInfluence = 0.5;
    const flightLength = 0.05;
    const magnitude = perturbation.length();
    const combinedDirection = new THREE.Vector3()
      .addVectors(
        directionToFood.multiplyScalar(1 - noiseInfluence),
        perturbation.multiplyScalar(noiseInfluence)
      )
      .normalize();

    combinedDirection.normalize().multiplyScalar(flightLength * magnitude);
    particleMesh.position.add(combinedDirection);

    perlinX += (Math.random() - 0.5) * 0.2;
    perlinY += (Math.random() - 0.5) * 0.2;
    perlinZ += (Math.random() - 0.5) * 0.2;
  } else {
    const direction = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    ).normalize();

    const stepSize = levyFlightStepSize();

    particleMesh.position.add(direction.multiplyScalar(stepSize));
  }
  const foodAttractionForce = debugObject.foodAttractionForce;
  particleMesh.position.add(
    directionToFood.multiplyScalar(foodAttractionForce)
  );
  updateTrail();
  camera.lookAt(foodMesh.position);
  camera.updateProjectionMatrix();
};
let randomWalk = simulateCoinToss;

let distanceBetweenParticleAndFood = particleMesh.position.distanceTo(
  foodMesh.position
);

let continueAnimation = true;
if (distanceBetweenParticleAndFood <= 0.02 + 0.1) {
  foodMesh.material.color.set(0x00ff00);
  continueAnimation = false;
}

// Animation loop
let currentTrailLength = 0;
const clock = new THREE.Clock();
const tick = () => {
  if (!continueAnimation) return;
  randomWalk();

  const elapsedTime = clock.getElapsedTime();
  controls.update();
  composer.render();
  window.requestAnimationFrame(tick);
};

tick();
