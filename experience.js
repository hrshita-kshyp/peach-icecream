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

// Smooth, seeded 3D noise keeps the texture continuous around all viewing angles.
function noise3(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const smooth = t => t * t * (3 - 2 * t);
  const u = smooth(x - ix), v = smooth(y - iy), w = smooth(z - iz);
  const hash = (a, b, c) => {
    const n = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  };
  const layer = dz => lerp(
    lerp(hash(ix, iy, iz + dz), hash(ix + 1, iy, iz + dz), u),
    lerp(hash(ix, iy + 1, iz + dz), hash(ix + 1, iy + 1, iz + dz), u), v);
  return lerp(layer(0), layer(1), w);
}

const bumpTexture = makeCanvasTexture((context, size) => {
  const pixels = context.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const grain = noise3(x * .38, y * .38, 4) * 36;
      const scrape = Math.sin(y * .13 + Math.sin(x * .019) * 7) * 16;
      const value = 128 + grain + scrape;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = value;
      pixels.data[i + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
}, 512);
bumpTexture.colorSpace = THREE.NoColorSpace;
bumpTexture.repeat.set(3, 2);

function createScoop() {
  const geometry = new THREE.SphereGeometry(1, 192, 128);
  const positions = geometry.attributes.position;
  const colors = [];
  const cream = new THREE.Color('#ffe2c5');
  const peach = new THREE.Color('#eeac83');
  const fruit = new THREE.Color('#ce7850');
  const color = new THREE.Color();
  const vertex = new THREE.Vector3();
  for (let i = 0; i < positions.count; i++) {
    vertex.fromBufferAttribute(positions, i).normalize();
    const { x, y, z } = vertex;
    const broad = noise3(x * 3.8, y * 3.8, z * 3.8);
    const medium = noise3(x * 13, y * 13, z * 13);
    const fine = noise3(x * 48, y * 48, z * 48);
    // Curved shallow scrape marks left by a scoop, with a ragged lower edge.
    const sweep = y * 29 + x * 7 + z * 5 + broad * 3;
    const scrape = Math.pow(.5 + .5 * Math.sin(sweep), 10) * .024;
    const lower = Math.exp(-Math.pow((y + .55) / .23, 2));
    const scallop = (.5 + .5 * Math.sin(Math.atan2(z, x) * 19 + broad)) * lower * .055;
    const radius = 1.58 * (1 + broad * .045 + medium * .016 + fine * .006 - scrape + scallop);
    positions.setXYZ(i, x * radius, y * radius * .91, z * radius);
    const ribbon = noise3(x * 4 + 12, y * 4, z * 4);
    color.copy(cream).lerp(peach, clamp((ribbon + .3) * .55));
    const fleck = noise3(x * 33 + 7, y * 33, z * 33);
    if (fleck > .48) color.lerp(fruit, clamp((fleck - .48) * 2));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true, bumpMap: bumpTexture, bumpScale: .045,
    roughness: .83, metalness: 0, clearcoat: .045, clearcoatRoughness: .8
  });
  const scoop = new THREE.Mesh(geometry, material);
  scoop.castShadow = scoop.receiveShadow = true;
  product.add(scoop);
  return scoop;
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
  group.userData.baseScale = .26 + (index % 2) * .04;
  group.scale.setScalar(group.userData.baseScale);
  ingredients.add(group);
  return group;
}

const scoop = createScoop();



const peachSlices = Array.from({ length: 2 }, (_, index) => createPeachSlice(index));

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

const softLight = new THREE.HemisphereLight(0xfff6e9, 0xc3a99b, 2.4);
scene.add(softLight);
const keyLight = new THREE.DirectionalLight(0xfff1d7, 2.9);
keyLight.position.set(-4, 6, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.normalBias = .035;
keyLight.shadow.radius = 4;
const fillLight = new THREE.DirectionalLight(0xe7efff, 1.3);
fillLight.position.set(4, 1, 4);
scene.add(fillLight);
scene.add(keyLight);
const cursorLight = new THREE.PointLight(0xffeadb, 4, 16, 2);
cursorLight.position.set(3, 2, 5);
scene.add(cursorLight);
const rimLight = new THREE.PointLight(0xff7c6b, 18, 12, 2);
rimLight.position.set(-5, -1, -2);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(3.2, 64),
  new THREE.ShadowMaterial({ color: 0x5f1e18, opacity: .08 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.85;
floor.receiveShadow = true;
product.add(floor);

const views = [
  { x: 2.05, y: 0, rx: .03, ry: -.18, rz: -.04, scale: 1.13, explode: -.95 },
  { x: -2.18, y: .05, rx: -.08, ry: .46, rz: .04, scale: 1.03, explode: -.48 },
  { x: 2.1, y: .15, rx: .1, ry: -.62, rz: -.12, scale: .92, explode: 1 },
  { x: -2.1, y: -.05, rx: .2, ry: 1.8, rz: .18, scale: .96, explode: .65 },
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
    state.dragY = clamp(state.dragY + (event.clientY - state.lastY) * .003, -.35, .35);
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
  product.rotation.y = reducedMotion ? 0 : Math.sin(time * .22) * .06;

  const explosion = view.explode + state.burst * 1.65;
  peachSlices.forEach((slice, index) => {
    const angle = time * (.16 + index * .003) + index * (Math.PI * 2 / peachSlices.length) + state.smoothPointer.x * .8;
    const heroTuck = clamp((explosion + .95) / .95);
    const radius = 1.25 + heroTuck * 1.9 + (index % 3) * .08;
    const targetX = Math.cos(angle) * radius + state.smoothPointer.x * (index % 2 ? .42 : -.24);
    const targetY = .22 + Math.sin(angle * 1.35 + index) * (.62 + heroTuck * .92) + state.smoothPointer.y * .35;
    const targetZ = Math.sin(angle) * (.82 + heroTuck * 1.05);
    slice.position.x = lerp(slice.position.x, targetX, .065);
    slice.position.y = lerp(slice.position.y, targetY, .065);
    slice.position.z = lerp(slice.position.z, targetZ, .065);
    const base = slice.userData.baseScale || .26;
    const garnishScale = base * (heroTuck * .92 + state.burst * .42);
    const nextScale = slice.userData.leaf
      ? new THREE.Vector3(garnishScale, garnishScale * .065, garnishScale * .38)
      : new THREE.Vector3(garnishScale, garnishScale, garnishScale);
    slice.scale.lerp(nextScale, .08);
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
