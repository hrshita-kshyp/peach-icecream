import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js";

const canvas = document.querySelector("#peach-canvas");
const story = document.querySelector(".story");
const stage = document.querySelector(".stage");
const chapters = [...document.querySelectorAll(".chapter")];
const dots = [...document.querySelectorAll(".scene-dot")];
const counter = document.querySelector(".counter span");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const lerp = THREE.MathUtils.lerp;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, .1, 100);
camera.position.set(0, .1, 10.5);

const world = new THREE.Group();
const product = new THREE.Group();
const ingredients = new THREE.Group();
world.add(product, ingredients);
scene.add(world);

function makeCanvasTexture(draw, size = 512) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = textureCanvas.height = size;
  const context = textureCanvas.getContext("2d");
  draw(context, size);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

const scoopTexture = makeCanvasTexture((context, size) => {
  const gradient = context.createRadialGradient(size * .31, size * .22, 12, size * .52, size * .56, size * .78);
  gradient.addColorStop(0, "#ffe6ce");
  gradient.addColorStop(.42, "#f7a58c");
  gradient.addColorStop(.78, "#df6f67");
  gradient.addColorStop(1, "#b94b41");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  let seed = 713;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 2600; i += 1) {
    const alpha = .018 + random() * .075;
    context.fillStyle = random() > .78 ? `rgba(120,42,34,${alpha})` : `rgba(255,245,226,${alpha})`;
    const radius = .25 + random() * 1.55;
    context.beginPath();
    context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = "rgba(255,226,204,.12)";
  context.lineWidth = 3;
  for (let line = 0; line < 16; line += 1) {
    context.beginPath();
    const x = random() * size;
    const y = random() * size;
    context.moveTo(x, y);
    context.bezierCurveTo(x + 42, y - 18, x + 90, y + 14, x + 128, y - 4);
    context.stroke();
  }
});

const bumpTexture = makeCanvasTexture((context, size) => {
  const image = context.createImageData(size, size);
  let seed = 29;
  for (let i = 0; i < image.data.length; i += 4) {
    seed = (seed * 9301 + 49297) % 233280;
    const value = 105 + (seed / 233280) * 95;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = value;
    image.data[i + 3] = 255;
  }
  context.putImageData(image, 0, 0);
}, 256);

const waffleTexture = makeCanvasTexture((context, size) => {
  const gradient = context.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, "#e8b56e");
  gradient.addColorStop(.52, "#c78648");
  gradient.addColorStop(1, "#8f542f");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  let seed = 911;
  const random = () => ((seed = (seed * 48271) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 900; i += 1) {
    context.fillStyle = `rgba(${120 + random() * 70},${60 + random() * 45},${28 + random() * 20},${.025 + random() * .06})`;
    context.fillRect(random() * size, random() * size, 1 + random() * 3, 1 + random() * 3);
  }
  context.strokeStyle = "rgba(82,42,24,.32)";
  context.lineWidth = 8;
  for (let offset = -size; offset < size * 2; offset += 62) {
    context.beginPath(); context.moveTo(offset, 0); context.lineTo(offset + size, size); context.stroke();
    context.beginPath(); context.moveTo(offset, size); context.lineTo(offset + size, 0); context.stroke();
  }
  context.strokeStyle = "rgba(255,224,158,.2)";
  context.lineWidth = 3;
  for (let offset = -size; offset < size * 2; offset += 62) {
    context.beginPath(); context.moveTo(offset + 8, 0); context.lineTo(offset + size + 8, size); context.stroke();
  }
});
waffleTexture.repeat.set(2.8, 4.5);

function createScoop() {
  const geometry = new THREE.SphereGeometry(1.56, 96, 64);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const wave = Math.sin(vertex.x * 7.1 + vertex.y * 3.2) * .018
      + Math.sin(vertex.y * 11.4 - vertex.z * 4.7) * .012
      + Math.cos(vertex.z * 13.2 + vertex.x * 2.8) * .01;
    vertex.normalize().multiplyScalar(1.56 * (1 + wave));
    positions.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({
    map: scoopTexture,
    bumpMap: bumpTexture,
    bumpScale: .035,
    roughness: .68,
    metalness: 0,
    clearcoat: .18,
    clearcoatRoughness: .72
  });
  const scoop = new THREE.Mesh(geometry, material);
  scoop.position.y = .62;
  scoop.castShadow = true;
  scoop.receiveShadow = true;
  product.add(scoop);

  return scoop;
}

function createCone() {
  const material = new THREE.MeshPhysicalMaterial({ map: waffleTexture, roughness: .78, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.24, 3.15, 64, 1, true), material);
  cone.position.y = -2.13;
  cone.rotation.y = .12;
  cone.castShadow = true;
  cone.receiveShadow = true;
  product.add(cone);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.22, .075, 12, 64),
    new THREE.MeshPhysicalMaterial({ color: 0xc77d3d, roughness: .7 })
  );
  rim.position.y = -.555;
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  product.add(rim);
}

function createSoftServeSwirl() {
  const profile = [
    new THREE.Vector2(.1, 0),
    new THREE.Vector2(.56, .13),
    new THREE.Vector2(1.03, .37),
    new THREE.Vector2(1.22, .66),
    new THREE.Vector2(.98, .93),
    new THREE.Vector2(.74, 1.16),
    new THREE.Vector2(.9, 1.39),
    new THREE.Vector2(.63, 1.68),
    new THREE.Vector2(.45, 1.95),
    new THREE.Vector2(.56, 2.17),
    new THREE.Vector2(.25, 2.43),
    new THREE.Vector2(.08, 2.58)
  ];
  const geometry = new THREE.LatheGeometry(profile, 128);
  const positions = geometry.attributes.position;
  const vertex = new THREE.Vector3();
  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    const theta = Math.atan2(vertex.z, vertex.x);
    const ridge = Math.sin(theta * 5.5 + vertex.y * 6.4) * (.055 - vertex.y * .012);
    const radius = Math.hypot(vertex.x, vertex.z) + ridge;
    positions.setXYZ(index, Math.cos(theta) * radius, vertex.y, Math.sin(theta) * radius);
  }
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffead8,
    roughness: .48,
    clearcoat: .18,
    clearcoatRoughness: .6,
    bumpMap: bumpTexture,
    bumpScale: .018
  });
  const swirl = new THREE.Mesh(geometry, material);
  swirl.position.set(.02, 1.68, -.05);
  swirl.scale.set(.72, .64, .72);
  swirl.castShadow = true;
  swirl.receiveShadow = true;
  product.add(swirl);
  return swirl;
}

function createMeltingEdge() {
  const meltMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xee928b,
    roughness: .44,
    clearcoat: .22,
    clearcoatRoughness: .38
  });
  const collar = new THREE.Mesh(new THREE.TorusGeometry(1.11, .065, 16, 96), meltMaterial);
  collar.position.y = -.55;
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1.04, .74, 1);
  collar.castShadow = true;
  product.add(collar);

  const drips = [
    [-.82, .28, .42, .072],
    [-.36, .58, .56, .055],
    [.18, .62, .7, .068],
    [.62, .38, .46, .055]
  ];
  drips.forEach(([x, z, length, radius], index) => {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius * .52, radius, length, 18), meltMaterial);
    body.position.y = -length / 2;
    const drop = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.18, 18, 14), meltMaterial);
    drop.position.y = -length - radius * .16;
    const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 10), meltMaterial);
    group.add(body, drop, cap);
    group.position.set(x, -.58 + Math.sin(index) * .04, z);
    group.rotation.z = (index - 1.5) * .025;
    group.castShadow = true;
    product.add(group);
  });
}

function createPeachSlice(index) {
  const shape = new THREE.Shape();
  shape.moveTo(-.92, -.04);
  shape.bezierCurveTo(-.48, -.62, .52, -.66, .96, -.08);
  shape.bezierCurveTo(.46, .58, -.34, .68, -.92, -.04);
  const settings = { depth: .13, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .035, bevelThickness: .025 };
  const group = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, settings), new THREE.MeshPhysicalMaterial({ color: 0xb45a2f, roughness: .72 }));
  const flesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, settings), new THREE.MeshPhysicalMaterial({ color: 0xf5ad63, roughness: .7, clearcoat: .08 }));
  flesh.scale.set(.97, .94, .82);
  flesh.position.z = .052;
  skin.castShadow = flesh.castShadow = true;
  group.add(skin, flesh);

  const groove = new THREE.Mesh(new THREE.TorusGeometry(.33, .018, 8, 28, Math.PI * 1.12), new THREE.MeshStandardMaterial({ color: 0xc77640, roughness: .86 }));
  groove.scale.y = .55;
  groove.position.set(-.1, .23, .28);
  groove.rotation.z = -.25;
  group.add(groove);
  group.scale.setScalar(.46 + (index % 2) * .06);
  ingredients.add(group);
  return group;
}

const scoop = createScoop();
createCone();
createMeltingEdge();
const swirl = createSoftServeSwirl();
const peachSlices = Array.from({ length: 5 }, (_, index) => createPeachSlice(index));

const leafMaterial = new THREE.MeshPhysicalMaterial({ color: 0x5b6b46, roughness: .88, side: THREE.DoubleSide });
for (let index = 0; index < 2; index += 1) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.48, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), leafMaterial);
  leaf.scale.set(.9, .055, .34);
  leaf.position.set(index - 1, 1.4 + index * .2, -.5);
  leaf.rotation.set(.4, index * 1.5, .5);
  leaf.castShadow = true;
  ingredients.add(leaf);
  peachSlices.push(leaf);
}

const particleGeometry = new THREE.SphereGeometry(.045, 8, 8);
const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffd5a2, transparent: true, opacity: .56 });
const particles = [];
for (let index = 0; index < 30; index += 1) {
  const particle = new THREE.Mesh(particleGeometry, particleMaterial);
  particle.userData.angle = (index / 30) * Math.PI * 2;
  particle.userData.radius = 2.2 + (index % 7) * .18;
  particle.userData.speed = .08 + (index % 5) * .012;
  ingredients.add(particle);
  particles.push(particle);
}

const softLight = new THREE.HemisphereLight(0xffe8ca, 0x6f3a35, 1.25);
scene.add(softLight);
const keyLight = new THREE.DirectionalLight(0xfff1d7, 2.9);
keyLight.position.set(-4, 6, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);
const cursorLight = new THREE.PointLight(0xffd6a2, 24, 13, 1.7);
cursorLight.position.set(3, 2, 5);
scene.add(cursorLight);
const rimLight = new THREE.PointLight(0xff7c6b, 18, 12, 2);
rimLight.position.set(-5, -1, -2);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(3.2, 64),
  new THREE.ShadowMaterial({ color: 0x5f1e18, opacity: .23 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -3.72;
floor.receiveShadow = true;
product.add(floor);

const views = [
  { x: 2.05, y: -.02, rx: .03, ry: -.18, rz: -.04, scale: .88, explode: -.55 },
  { x: -2.18, y: .05, rx: -.08, ry: .46, rz: .04, scale: 1.18, explode: -.25 },
  { x: 2.1, y: .15, rx: .1, ry: -.62, rz: -.12, scale: .92, explode: 1 },
  { x: -2.1, y: -.05, rx: 1.02, ry: .05, rz: 2.3, scale: .96, explode: .65 },
  { x: 2.1, y: .05, rx: 0, ry: .25, rz: .04, scale: 1.03, explode: .22 }
];

const state = {
  progress: 0,
  pointer: new THREE.Vector2(),
  smoothPointer: new THREE.Vector2(),
  dragX: 0,
  dragY: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  burst: 0,
  burstTarget: 0,
  activeScene: 0
};

function updateScrollState() {
  const max = story.offsetHeight - innerHeight;
  state.progress = clamp((scrollY - story.offsetTop) / Math.max(1, max));
  const exact = state.progress * 4;
  state.activeScene = Math.min(4, Math.round(exact));
  chapters.forEach((chapter, index) => chapter.classList.toggle("active", index === state.activeScene));
  dots.forEach((dot, index) => dot.classList.toggle("active", index === state.activeScene));
  counter.textContent = String(state.activeScene + 1).padStart(2, "0");
  document.documentElement.style.setProperty("--progress", state.progress.toFixed(4));
  document.documentElement.style.setProperty("--light-x", `${22 + state.progress * 30}%`);
  document.documentElement.style.setProperty("--ring-scale", (.9 + state.progress * .5).toFixed(3));
}

function currentView() {
  const exact = state.progress * 4;
  const index = Math.min(4, Math.floor(exact + .0001));
  const next = Math.min(4, index + 1);
  const t = exact - index;
  const a = views[index], b = views[next];
  return Object.fromEntries(Object.keys(a).map(key => [key, lerp(a[key], b[key], t)]));
}

function resize() {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function setPointer(event) {
  state.pointer.x = (event.clientX / innerWidth) * 2 - 1;
  state.pointer.y = -((event.clientY / innerHeight) * 2 - 1);
  if (state.dragging) {
    state.dragX += (event.clientX - state.lastX) * .008;
    state.dragY += (event.clientY - state.lastY) * .006;
    state.lastX = event.clientX;
    state.lastY = event.clientY;
  }
}

addEventListener("scroll", updateScrollState, { passive: true });
addEventListener("resize", () => { resize(); updateScrollState(); });
addEventListener("pointermove", setPointer, { passive: true });
canvas.addEventListener("pointerdown", event => {
  state.dragging = true;
  state.lastX = event.clientX;
  state.lastY = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointerup", event => {
  state.dragging = false;
  canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener("pointercancel", () => { state.dragging = false; });
canvas.addEventListener("click", () => {
  state.burstTarget = 1;
  setTimeout(() => { state.burstTarget = 0; }, 320);
});
dots.forEach(dot => dot.addEventListener("click", () => {
  const max = story.offsetHeight - innerHeight;
  scrollTo({ top: story.offsetTop + (Number(dot.dataset.scene) / 4) * max, behavior: reducedMotion ? "auto" : "smooth" });
}));

const clock = new THREE.Clock();
function animate() {
  const delta = Math.min(clock.getDelta(), .05);
  const time = clock.elapsedTime;
  state.smoothPointer.lerp(state.pointer, reducedMotion ? 1 : .055);
  state.burst = lerp(state.burst, state.burstTarget, state.burstTarget ? .17 : .055);
  const view = currentView();
  const mobile = innerWidth <= 820;
  const baseScale = view.scale * (mobile ? .58 : 1);

  world.position.x = lerp(world.position.x, mobile ? 0 : view.x, .065);
  world.position.y = lerp(world.position.y, view.y + (mobile ? .8 : 0), .065);
  world.scale.lerp(new THREE.Vector3(baseScale, baseScale, baseScale), .065);
  world.rotation.x = lerp(world.rotation.x, view.rx + state.dragY + state.smoothPointer.y * .12, .065);
  world.rotation.y = lerp(world.rotation.y, view.ry + state.dragX + state.smoothPointer.x * .3, .065);
  world.rotation.z = lerp(world.rotation.z, view.rz - state.smoothPointer.x * .04, .065);
  product.position.y = Math.sin(time * 1.15) * (reducedMotion ? 0 : .055);
  scoop.rotation.y += reducedMotion ? 0 : delta * .045;
  swirl.rotation.y -= reducedMotion ? 0 : delta * .035;

  const explosion = view.explode + state.burst * 1.65;
  peachSlices.forEach((slice, index) => {
    const angle = time * (.16 + index * .003) + index * (Math.PI * 2 / peachSlices.length) + state.smoothPointer.x * .8;
    const radius = 2.15 + explosion * 1.1 + (index % 3) * .1;
    const targetX = Math.cos(angle) * radius + state.smoothPointer.x * (index % 2 ? .7 : -.4);
    const targetY = .15 + Math.sin(angle * 1.35 + index) * (1.18 + explosion * .32) + state.smoothPointer.y * .5;
    const targetZ = Math.sin(angle) * (1.35 + explosion * .45);
    slice.position.x = lerp(slice.position.x, targetX, .065);
    slice.position.y = lerp(slice.position.y, targetY, .065);
    slice.position.z = lerp(slice.position.z, targetZ, .065);
    slice.rotation.x += reducedMotion ? 0 : .006 + index * .0004;
    slice.rotation.y += reducedMotion ? 0 : .009;
    slice.rotation.z = angle + .35;
  });

  particles.forEach((particle, index) => {
    const angle = particle.userData.angle + time * particle.userData.speed;
    const radius = particle.userData.radius + explosion * .72;
    particle.position.set(
      Math.cos(angle) * radius,
      Math.sin(angle * 2 + index) * 1.7,
      Math.sin(angle) * radius * .52
    );
    const pulse = .7 + Math.sin(time * 2 + index) * .24;
    particle.scale.setScalar(pulse);
  });

  cursorLight.position.x = state.smoothPointer.x * 6;
  cursorLight.position.y = state.smoothPointer.y * 4 + 2;
  camera.position.x = lerp(camera.position.x, state.smoothPointer.x * .24, .04);
  camera.position.y = lerp(camera.position.y, state.smoothPointer.y * .16 + .1, .04);
  camera.lookAt(0, 0, 0);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

resize();
updateScrollState();
stage.classList.add("webgl-ready");
animate();
