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
  const gradient = context.createRadialGradient(size * .34, size * .26, 10, size * .5, size * .5, size * .72);
  gradient.addColorStop(0, "#ffd2bc");
  gradient.addColorStop(.48, "#ef9878");
  gradient.addColorStop(1, "#c95749");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  let seed = 713;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 2100; i += 1) {
    const alpha = .025 + random() * .1;
    context.fillStyle = random() > .72 ? `rgba(173,65,45,${alpha})` : `rgba(255,245,220,${alpha})`;
    const radius = .4 + random() * 2.1;
    context.beginPath();
    context.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    context.fill();
  }
  context.strokeStyle = "rgba(173,65,45,.18)";
  context.lineWidth = 5;
  for (let line = 0; line < 11; line += 1) {
    context.beginPath();
    const y = 50 + line * 40;
    context.moveTo(-20, y);
    context.bezierCurveTo(120, y - 30, 320, y + 28, size + 20, y - 8);
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
  gradient.addColorStop(0, "#efb34f");
  gradient.addColorStop(.55, "#c8792f");
  gradient.addColorStop(1, "#8e4827");
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);
  context.strokeStyle = "rgba(103,48,24,.5)";
  context.lineWidth = 12;
  for (let offset = -size; offset < size * 2; offset += 54) {
    context.beginPath(); context.moveTo(offset, 0); context.lineTo(offset + size, size); context.stroke();
    context.beginPath(); context.moveTo(offset, size); context.lineTo(offset + size, 0); context.stroke();
  }
  context.strokeStyle = "rgba(255,224,139,.28)";
  context.lineWidth = 4;
  for (let offset = -size; offset < size * 2; offset += 54) {
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
    bumpScale: .055,
    roughness: .82,
    metalness: 0,
    clearcoat: .08,
    clearcoatRoughness: .8
  });
  const scoop = new THREE.Mesh(geometry, material);
  scoop.position.y = .62;
  scoop.castShadow = true;
  scoop.receiveShadow = true;
  product.add(scoop);

  const ruffleMaterial = material.clone();
  ruffleMaterial.color.set(0xf2a080);
  for (let index = 0; index < 18; index += 1) {
    const angle = (index / 18) * Math.PI * 2;
    const ruffle = new THREE.Mesh(new THREE.SphereGeometry(.22 + (index % 3) * .018, 18, 14), ruffleMaterial);
    ruffle.position.set(Math.cos(angle) * 1.14, -.82 + Math.sin(index * 2.1) * .075, Math.sin(angle) * 1.14);
    ruffle.scale.set(.98, .48, .82);
    ruffle.castShadow = true;
    product.add(ruffle);
  }
  return scoop;
}

function createCone() {
  const material = new THREE.MeshPhysicalMaterial({ map: waffleTexture, roughness: .72, side: THREE.DoubleSide });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(1.24, 3.15, 64, 1, true), material);
  cone.position.y = -2.13;
  cone.rotation.y = .12;
  cone.castShadow = true;
  cone.receiveShadow = true;
  product.add(cone);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.22, .075, 12, 64),
    new THREE.MeshPhysicalMaterial({ color: 0xd98c3d, roughness: .68 })
  );
  rim.position.y = -.555;
  rim.rotation.x = Math.PI / 2;
  rim.castShadow = true;
  product.add(rim);
}

function createPeachSlice(index) {
  const shape = new THREE.Shape();
  shape.moveTo(-.92, -.04);
  shape.bezierCurveTo(-.48, -.62, .52, -.66, .96, -.08);
  shape.bezierCurveTo(.46, .58, -.34, .68, -.92, -.04);
  const settings = { depth: .18, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: .06, bevelThickness: .05 };
  const group = new THREE.Group();
  const skin = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, settings), new THREE.MeshPhysicalMaterial({ color: 0xc94e31, roughness: .58 }));
  const flesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, settings), new THREE.MeshPhysicalMaterial({ color: 0xffb52f, roughness: .62, clearcoat: .16 }));
  flesh.scale.set(.91, .87, .8);
  flesh.position.z = .075;
  skin.castShadow = flesh.castShadow = true;
  group.add(skin, flesh);

  const groove = new THREE.Mesh(new THREE.TorusGeometry(.33, .035, 8, 26, Math.PI * 1.2), new THREE.MeshStandardMaterial({ color: 0xc84d2c, roughness: .8 }));
  groove.scale.y = .55;
  groove.position.set(-.1, .23, .28);
  groove.rotation.z = -.25;
  group.add(groove);
  group.scale.setScalar(.72 + (index % 2) * .1);
  ingredients.add(group);
  return group;
}

const scoop = createScoop();
createCone();
const peachSlices = Array.from({ length: 7 }, (_, index) => createPeachSlice(index));

const leafMaterial = new THREE.MeshPhysicalMaterial({ color: 0x1f6847, roughness: .72, side: THREE.DoubleSide });
for (let index = 0; index < 3; index += 1) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.48, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), leafMaterial);
  leaf.scale.set(1.8, .12, .68);
  leaf.position.set(index - 1, 1.4 + index * .2, -.5);
  leaf.rotation.set(.4, index * 1.5, .5);
  leaf.castShadow = true;
  ingredients.add(leaf);
  peachSlices.push(leaf);
}

const particleGeometry = new THREE.SphereGeometry(.045, 8, 8);
const particleMaterial = new THREE.MeshBasicMaterial({ color: 0xffd277, transparent: true, opacity: .78 });
const particles = [];
for (let index = 0; index < 42; index += 1) {
  const particle = new THREE.Mesh(particleGeometry, particleMaterial);
  particle.userData.angle = (index / 42) * Math.PI * 2;
  particle.userData.radius = 2.2 + (index % 7) * .18;
  particle.userData.speed = .08 + (index % 5) * .012;
  ingredients.add(particle);
  particles.push(particle);
}

const softLight = new THREE.HemisphereLight(0xffe8ca, 0x7d2d2c, 1.55);
scene.add(softLight);
const keyLight = new THREE.DirectionalLight(0xfff1d7, 3.5);
keyLight.position.set(-4, 6, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);
const cursorLight = new THREE.PointLight(0xffcb65, 34, 13, 1.7);
cursorLight.position.set(3, 2, 5);
scene.add(cursorLight);
const rimLight = new THREE.PointLight(0xff5c4d, 28, 12, 2);
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
  { x: 2.25, y: .1, rx: -.02, ry: -.2, rz: -.08, scale: 1, explode: .12 },
  { x: -2.25, y: .05, rx: -.12, ry: .62, rz: .06, scale: 1.34, explode: .2 },
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

  const explosion = view.explode + state.burst * 1.65;
  peachSlices.forEach((slice, index) => {
    const angle = time * (.16 + index * .003) + index * (Math.PI * 2 / peachSlices.length) + state.smoothPointer.x * .8;
    const radius = 2.42 + explosion * 1.25 + (index % 3) * .13;
    const targetX = Math.cos(angle) * radius + state.smoothPointer.x * (index % 2 ? .7 : -.4);
    const targetY = .25 + Math.sin(angle * 1.35 + index) * (1.45 + explosion * .36) + state.smoothPointer.y * .5;
    const targetZ = Math.sin(angle) * (1.65 + explosion * .5);
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
