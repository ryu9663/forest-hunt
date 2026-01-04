import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';

const canvas = document.querySelector('#game');
const instructions = document.querySelector('#instructions');
const healthEl = document.querySelector('#health');
const scoreEl = document.querySelector('#score');

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xcfe8e0, 30, 220);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 1.7, 10);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;

const hemi = new THREE.HemisphereLight(0xd8f7ff, 0x3d5c48, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2cc, 1.2);
sun.position.set(60, 80, 40);
scene.add(sun);

const clock = new THREE.Clock();

const world = {
  size: 260,
  riverWidth: 12,
};

function createGroundTexture() {
  const size = 1024;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.width = size;
  ctx.canvas.height = size;

  ctx.fillStyle = '#3f6b3f';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 12000; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const shade = 40 + Math.random() * 60;
    ctx.fillStyle = `rgba(40, ${shade}, 40, 0.35)`;
    ctx.fillRect(x, y, 2, 2);
  }

  ctx.strokeStyle = '#2a84c4';
  ctx.lineWidth = 90;
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let x = -50; x <= size + 50; x += 40) {
    const y = size * 0.5 + Math.sin(x * 0.008) * 140 + Math.cos(x * 0.02) * 30;
    if (x === -50) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.lineWidth = 6;
  for (let x = -50; x <= size + 50; x += 80) {
    const y = size * 0.5 + Math.sin(x * 0.008) * 140 + Math.cos(x * 0.02) * 30;
    ctx.beginPath();
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x + 30, y - 6);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(ctx.canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSkyTexture() {
  const size = 512;
  const ctx = document.createElement('canvas').getContext('2d');
  ctx.canvas.width = size;
  ctx.canvas.height = size;
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#9ad6ff');
  gradient.addColorStop(0.5, '#ccefff');
  gradient.addColorStop(1, '#f7f6e9');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(ctx.canvas);
}

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(world.size, world.size, 1, 1),
  new THREE.MeshStandardMaterial({ map: createGroundTexture() })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(240, 32, 32),
  new THREE.MeshBasicMaterial({ map: createSkyTexture(), side: THREE.BackSide })
);
scene.add(sky);

const trees = new THREE.Group();
const rocks = new THREE.Group();
const clouds = new THREE.Group();
scene.add(trees, rocks, clouds);

function riverCenterX(z) {
  return Math.sin(z * 0.03) * 18;
}

function placeOnGround(mesh, x, z) {
  mesh.position.set(x, 0, z);
}

function createTree() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.35, 2, 6),
    new THREE.MeshStandardMaterial({ color: 0x5a3d2a })
  );
  trunk.position.y = 1;
  const leaves = new THREE.Mesh(
    new THREE.ConeGeometry(1.3, 2.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c5f2b })
  );
  leaves.position.y = 3.2;
  group.add(trunk, leaves);
  return group;
}

function createRock() {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(1.1, 0),
    new THREE.MeshStandardMaterial({ color: 0x7c7f84 })
  );
  rock.scale.set(1, 0.7, 1.2);
  rock.position.y = 0.6;
  return rock;
}

function createCloud() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
  for (let i = 0; i < 5; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1.2 + Math.random(), 16, 16), material);
    puff.position.set(i * 1.4, Math.random() * 0.6, Math.random() * 1.2);
    group.add(puff);
  }
  return group;
}

for (let i = 0; i < 120; i += 1) {
  const x = (Math.random() - 0.5) * world.size;
  const z = (Math.random() - 0.5) * world.size;
  const riverX = riverCenterX(z);
  if (Math.abs(x - riverX) < world.riverWidth) {
    i -= 1;
    continue;
  }
  const tree = createTree();
  placeOnGround(tree, x, z);
  tree.rotation.y = Math.random() * Math.PI * 2;
  trees.add(tree);
}

for (let i = 0; i < 50; i += 1) {
  const x = (Math.random() - 0.5) * world.size;
  const z = (Math.random() - 0.5) * world.size;
  const riverX = riverCenterX(z);
  if (Math.abs(x - riverX) < world.riverWidth * 0.8) {
    i -= 1;
    continue;
  }
  const rock = createRock();
  placeOnGround(rock, x, z);
  rock.rotation.y = Math.random() * Math.PI * 2;
  rocks.add(rock);
}

for (let i = 0; i < 16; i += 1) {
  const cloud = createCloud();
  cloud.position.set(
    (Math.random() - 0.5) * world.size * 0.8,
    18 + Math.random() * 8,
    (Math.random() - 0.5) * world.size * 0.8
  );
  cloud.scale.setScalar(1.4 + Math.random());
  clouds.add(cloud);
}

const player = {
  yaw: 0,
  pitch: 0,
  speed: 12,
  velocity: new THREE.Vector3(),
  health: 100,
};

const keys = { w: false, a: false, s: false, d: false };

function updateMovement(delta) {
  const forward = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();

  const direction = new THREE.Vector3();
  if (keys.w) direction.add(forward);
  if (keys.s) direction.sub(forward);
  if (keys.a) direction.sub(right);
  if (keys.d) direction.add(right);

  if (direction.lengthSq() > 0) {
    direction.normalize();
    player.velocity.copy(direction.multiplyScalar(player.speed));
  } else {
    player.velocity.set(0, 0, 0);
  }

  camera.position.addScaledVector(player.velocity, delta);
  camera.position.y = 1.7;
}

function onKey(event, isDown) {
  switch (event.code) {
    case 'KeyW':
      keys.w = isDown;
      break;
    case 'KeyA':
      keys.a = isDown;
      break;
    case 'KeyS':
      keys.s = isDown;
      break;
    case 'KeyD':
      keys.d = isDown;
      break;
    default:
      break;
  }
}

window.addEventListener('keydown', (event) => onKey(event, true));
window.addEventListener('keyup', (event) => onKey(event, false));

function requestPointerLock() {
  if (document.pointerLockElement !== canvas) {
    canvas.requestPointerLock();
  }
}

canvas.addEventListener('click', requestPointerLock);
instructions.addEventListener('click', requestPointerLock);

document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement === canvas) {
    instructions.classList.add('hidden');
  } else {
    instructions.classList.remove('hidden');
  }
});

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== canvas) return;
  const sensitivity = 0.0022;
  player.yaw -= event.movementX * sensitivity;
  player.pitch -= event.movementY * sensitivity;
  const pitchLimit = Math.PI / 2 - 0.1;
  player.pitch = Math.max(-pitchLimit, Math.min(pitchLimit, player.pitch));
  camera.rotation.order = 'YXZ';
  camera.rotation.y = player.yaw;
  camera.rotation.x = player.pitch;
});

const monsterGroup = new THREE.Group();
scene.add(monsterGroup);
const monsters = [];
const monsterCount = 10;

function createMonster() {
  const group = new THREE.Group();
  
  // 몸통 (body)
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 1.2, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x8d1b1b, emissive: 0x3a0808 })
  );
  body.position.set(0, 0.8, 0);
  body.rotation.z = Math.PI / 2; // 몸통을 가로로 눕힘
  
  // 머리 (head)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xa52525, emissive: 0x4a0a0a })
  );
  head.position.set(0.8, 0.9, 0);
  
  // 눈 (eyes)
  const eyeGeometry = new THREE.SphereGeometry(0.08, 6, 6);
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0x220000 });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  leftEye.position.set(1.0, 1.0, 0.15);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
  rightEye.position.set(1.0, 1.0, -0.15);
  
  // 다리 (legs)
  const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.7, 6);
  const legMaterial = new THREE.MeshStandardMaterial({ color: 0x6d1515, emissive: 0x2a0606 });
  
  const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
  frontLeftLeg.position.set(0.4, 0.35, 0.3);
  const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial);
  frontRightLeg.position.set(0.4, 0.35, -0.3);
  const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial);
  backLeftLeg.position.set(-0.4, 0.35, 0.3);
  const backRightLeg = new THREE.Mesh(legGeometry, legMaterial);
  backRightLeg.position.set(-0.4, 0.35, -0.3);
  
  // 꼬리 (tail)
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.8, 6),
    new THREE.MeshStandardMaterial({ color: 0x7d1a1a, emissive: 0x350707 })
  );
  tail.position.set(-0.9, 0.8, 0);
  tail.rotation.z = Math.PI / 2; // 꼬리를 뒤쪽으로 향하게 함
  
  group.add(body, head, leftEye, rightEye, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg, tail);
  group.position.y = 0.7;
  
  return { mesh: group, velocity: new THREE.Vector3() };
}

function spawnMonsters() {
  for (let i = 0; i < monsterCount; i += 1) {
    const monster = createMonster();
    const x = (Math.random() - 0.5) * world.size * 0.8;
    const z = (Math.random() - 0.5) * world.size * 0.8;
    monster.mesh.position.x = x;
    monster.mesh.position.z = z;
    monsterGroup.add(monster.mesh);
    monsters.push(monster);
  }
}

spawnMonsters();

const raycaster = new THREE.Raycaster();
const shots = [];
const shotMaterial = new THREE.LineBasicMaterial({
  color: 0xfff2a6,
  transparent: true,
  opacity: 0.9,
  depthTest: false,
});
let canShoot = true;
const shotCooldownMs = 180;

function spawnShotLine() {
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const origin = camera.position.clone().add(direction.clone().multiplyScalar(0.6));
  const end = origin.clone().add(direction.multiplyScalar(24));
  const geometry = new THREE.BufferGeometry().setFromPoints([origin, end]);
  const line = new THREE.Line(geometry, shotMaterial);
  line.renderOrder = 999;
  scene.add(line);
  shots.push({ line, life: 0.05 });
}

window.addEventListener('mousedown', () => {
  if (document.pointerLockElement !== canvas) return;
  if (!canShoot) return;
  canShoot = false;
  window.setTimeout(() => {
    canShoot = true;
  }, shotCooldownMs);
  spawnShotLine();
  raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
  const targets = monsters.map((monster) => monster.mesh);
  const hits = raycaster.intersectObjects(targets, false);
  if (hits.length > 0) {
    const hit = hits[0].object;
    const index = monsters.findIndex((monster) => monster.mesh === hit);
    if (index >= 0) {
      monsterGroup.remove(monsters[index].mesh);
      monsters.splice(index, 1);
      scoreEl.textContent = `${Number(scoreEl.textContent) + 1}`;
    }
  }
});

function updateMonsters(delta) {
  monsters.forEach((monster) => {
    const target = new THREE.Vector3(camera.position.x, 0, camera.position.z);
    const pos = new THREE.Vector3(monster.mesh.position.x, 0, monster.mesh.position.z);
    const distance = pos.distanceTo(target);

    if (distance < 24) {
      monster.velocity.copy(target.sub(pos).normalize().multiplyScalar(4.2));
      monster.mesh.lookAt(camera.position.x, monster.mesh.position.y, camera.position.z);
    } else {
      if (Math.random() < 0.02) {
        const angle = Math.random() * Math.PI * 2;
        monster.velocity.set(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(2.2);
      }
    }

    monster.mesh.position.addScaledVector(monster.velocity, delta);

    if (distance < 2.2) {
      player.health = Math.max(0, player.health - 18 * delta);
      healthEl.textContent = Math.round(player.health).toString();
    }
  });
}

function updateClouds(delta) {
  clouds.children.forEach((cloud) => {
    cloud.position.x += delta * 0.8;
    if (cloud.position.x > world.size * 0.5) {
      cloud.position.x = -world.size * 0.5;
    }
  });
}

function updateShots(delta) {
  for (let i = shots.length - 1; i >= 0; i -= 1) {
    shots[i].life -= delta;
    if (shots[i].life <= 0) {
      scene.remove(shots[i].line);
      shots.splice(i, 1);
    }
  }
}

function animate() {
  const delta = clock.getDelta();
  updateMovement(delta);
  updateMonsters(delta);
  updateClouds(delta);
  updateShots(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
