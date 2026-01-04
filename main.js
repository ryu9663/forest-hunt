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

// 충돌 감지 함수들
function isInRiver(x, z) {
  const riverX = riverCenterX(z);
  return Math.abs(x - riverX) < world.riverWidth * 0.6;
}

function checkCollisionWithObjects(x, z, radius = 1.0) {
  // 나무와의 충돌 체크
  for (let tree of trees.children) {
    const dx = x - tree.position.x;
    const dz = z - tree.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < radius + 1.5) { // 나무 충돌 반경
      return true;
    }
  }
  
  // 바위와의 충돌 체크
  for (let rock of rocks.children) {
    const dx = x - rock.position.x;
    const dz = z - rock.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    if (distance < radius + 1.2) { // 바위 충돌 반경
      return true;
    }
  }
  
  return false;
}

function checkCollisionWithMonsters(x, z, radius = 1.0, excludeMonster = null) {
  for (let monster of monsters) {
    if (monster === excludeMonster) continue;
    const dx = x - monster.mesh.position.x;
    const dz = z - monster.mesh.position.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const monsterRadius = (monster.scale || 1.0) * 0.8;
    if (distance < radius + monsterRadius) {
      return true;
    }
  }
  return false;
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
    
    // 다음 위치 계산
    const newPos = new THREE.Vector3().copy(camera.position);
    const velocity = direction.clone().multiplyScalar(player.speed);
    
    // 강 안에 있는지 체크하고 속도 조정
    if (isInRiver(newPos.x, newPos.z)) {
      velocity.multiplyScalar(0.4); // 강에서는 40% 속도로 느려짐
    }
    
    newPos.addScaledVector(velocity, delta);
    
    // 충돌 체크
    if (!checkCollisionWithObjects(newPos.x, newPos.z, 0.8)) {
      camera.position.copy(newPos);
    }
  }

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
  
  // 랜덤 색상 변화 (갈색, 회색, 검은색 계열)
  const colorVariations = [
    { main: 0x8d4a2b, dark: 0x5a2f1a, emissive: 0x2a140c }, // 갈색
    { main: 0x6d6d6d, dark: 0x4a4a4a, emissive: 0x1a1a1a }, // 회색
    { main: 0x4a2c2c, dark: 0x2d1a1a, emissive: 0x150c0c }, // 어두운 갈색
    { main: 0x8d1b1b, dark: 0x6d1515, emissive: 0x3a0808 }, // 빨간색 (원래)
    { main: 0x2c4a2c, dark: 0x1a2d1a, emissive: 0x0c150c }  // 어두운 녹색
  ];
  const colorScheme = colorVariations[Math.floor(Math.random() * colorVariations.length)];
  
  // 몸통 (body)
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.4, 1.2, 4, 8),
    new THREE.MeshStandardMaterial({ 
      color: colorScheme.main, 
      emissive: colorScheme.emissive,
      roughness: 0.8,
      metalness: 0.1
    })
  );
  body.position.set(0, 0.8, 0);
  body.rotation.z = Math.PI / 2; // 몸통을 가로로 눕힘
  
  // 머리 (head)
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshStandardMaterial({ 
      color: colorScheme.main * 1.1, 
      emissive: colorScheme.emissive,
      roughness: 0.7,
      metalness: 0.05
    })
  );
  head.position.set(0.8, 0.9, 0);
  
  // 눈 (eyes)
  const eyeGeometry = new THREE.SphereGeometry(0.08, 6, 6);
  const eyeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xff4444, 
    emissive: 0x220000,
    roughness: 0.3,
    metalness: 0.2
  });
  const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
  leftEye.position.set(1.0, 1.0, 0.15);
  const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial.clone());
  rightEye.position.set(1.0, 1.0, -0.15);
  
  // 다리 (legs)
  const legGeometry = new THREE.CylinderGeometry(0.12, 0.15, 0.7, 6);
  const legMaterial = new THREE.MeshStandardMaterial({ 
    color: colorScheme.dark, 
    emissive: colorScheme.emissive,
    roughness: 0.9,
    metalness: 0.0
  });
  
  const frontLeftLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
  frontLeftLeg.position.set(0.4, 0.35, 0.3);
  const frontRightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
  frontRightLeg.position.set(0.4, 0.35, -0.3);
  const backLeftLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
  backLeftLeg.position.set(-0.4, 0.35, 0.3);
  const backRightLeg = new THREE.Mesh(legGeometry, legMaterial.clone());
  backRightLeg.position.set(-0.4, 0.35, -0.3);
  
  // 꼬리 (tail)
  const tail = new THREE.Mesh(
    new THREE.ConeGeometry(0.1, 0.8, 6),
    new THREE.MeshStandardMaterial({ 
      color: colorScheme.main * 0.9, 
      emissive: colorScheme.emissive,
      roughness: 0.8,
      metalness: 0.05
    })
  );
  tail.position.set(-0.9, 0.8, 0);
  tail.rotation.z = Math.PI / 2; // 꼬리를 뒤쪽으로 향하게 함
  
  group.add(body, head, leftEye, rightEye, frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg, tail);
  group.position.y = 0.7;
  
  // 랜덤 크기 시스템 (0.6 ~ 1.5배 크기)
  const randomScale = 0.6 + Math.random() * 0.9;
  group.scale.setScalar(randomScale);
  
  return { 
    mesh: group, 
    velocity: new THREE.Vector3(), 
    scale: randomScale,
    isAggressive: false,
    body: body,
    head: head,
    leftEye: leftEye,
    rightEye: rightEye,
    tail: tail,
    legs: [frontLeftLeg, frontRightLeg, backLeftLeg, backRightLeg],
    animationTime: Math.random() * Math.PI * 2 // 각 몬스터마다 다른 시작 시간
  };
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
  const hits = raycaster.intersectObjects(targets, true); // true로 변경하여 자식 객체도 검사
  if (hits.length > 0) {
    const hit = hits[0].object;
    // hit된 객체가 그룹 내부의 자식일 수 있으므로, 부모를 찾아야 함
    let targetMesh = hit;
    while (targetMesh.parent && !monsters.find(monster => monster.mesh === targetMesh)) {
      targetMesh = targetMesh.parent;
    }
    const index = monsters.findIndex((monster) => monster.mesh === targetMesh);
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
    const monsterScale = monster.scale || 1.0;

    // 애니메이션 시간 업데이트
    monster.animationTime += delta;

    // 플레이어 감지 시 위협적인 자세로 변경
    const detectionRange = 20;
    const wasAggressive = monster.isAggressive;
    monster.isAggressive = distance < detectionRange;

    if (monster.isAggressive && !wasAggressive) {
      // 위협적인 자세로 변경: 몸통을 앞으로 기울이고 머리를 낮춤
      monster.body.rotation.x = -0.2; // 몸통을 앞으로 기울임
      monster.head.position.y = 0.7; // 머리를 낮춤
      
      // 눈을 더 밝게 빛나게 함
      monster.leftEye.material.emissive.setHex(0x660000);
      monster.rightEye.material.emissive.setHex(0x660000);
      monster.leftEye.material.color.setHex(0xff6666);
      monster.rightEye.material.color.setHex(0xff6666);
    } else if (!monster.isAggressive && wasAggressive) {
      // 평상시 자세로 복귀
      monster.body.rotation.x = 0;
      monster.head.position.y = 0.9;
      
      // 눈 밝기를 원래대로
      monster.leftEye.material.emissive.setHex(0x220000);
      monster.rightEye.material.emissive.setHex(0x220000);
      monster.leftEye.material.color.setHex(0xff4444);
      monster.rightEye.material.color.setHex(0xff4444);
    }

    // 애니메이션 효과들
    const time = monster.animationTime;
    const isMoving = monster.velocity.length() > 0.1;
    
    // 호흡 효과: 몸통이 천천히 위아래로 움직임
    const breathingOffset = Math.sin(time * 1.5) * 0.02;
    monster.body.position.y = 0.8 + breathingOffset;
    
    // 꼬리 흔들기 애니메이션
    const tailSwing = Math.sin(time * 2.5) * 0.3;
    monster.tail.rotation.y = tailSwing;
    
    // 걷기 애니메이션: 움직일 때만 다리가 움직임
    if (isMoving) {
      const walkCycle = time * 6; // 빠른 걷기
      monster.legs[0].rotation.x = Math.sin(walkCycle) * 0.4; // 앞 왼쪽
      monster.legs[1].rotation.x = Math.sin(walkCycle + Math.PI) * 0.4; // 앞 오른쪽
      monster.legs[2].rotation.x = Math.sin(walkCycle + Math.PI) * 0.4; // 뒤 왼쪽
      monster.legs[3].rotation.x = Math.sin(walkCycle) * 0.4; // 뒤 오른쪽
    } else {
      // 정지 시 다리를 원래 위치로
      monster.legs.forEach(leg => {
        leg.rotation.x *= 0.9; // 부드럽게 복귀
      });
    }
    
    // 머리 미세한 움직임 (호기심 표현)
    if (!monster.isAggressive) {
      const headBob = Math.sin(time * 0.8) * 0.05;
      monster.head.rotation.y = headBob;
    } else {
      monster.head.rotation.y = 0; // 위협적일 때는 똑바로
    }

    if (distance < 24) {
      // 큰 몬스터일수록 빠르고, 작은 몬스터는 느리게
      const speed = 3.5 + (monsterScale - 0.8) * 2.0;
      monster.velocity.copy(target.sub(pos).normalize().multiplyScalar(speed));
      monster.mesh.lookAt(camera.position.x, monster.mesh.position.y, camera.position.z);
    } else {
      if (Math.random() < 0.02) {
        const angle = Math.random() * Math.PI * 2;
        const wanderSpeed = 1.8 + (monsterScale - 0.8) * 1.0;
        monster.velocity.set(Math.cos(angle), 0, Math.sin(angle)).multiplyScalar(wanderSpeed);
      }
    }

    // 몬스터 이동 처리 (충돌 및 강 체크 포함)
    if (monster.velocity.length() > 0.01) {
      const newPos = new THREE.Vector3().copy(monster.mesh.position);
      let adjustedVelocity = monster.velocity.clone();
      
      // 강 안에 있으면 속도 감소
      if (isInRiver(newPos.x, newPos.z)) {
        adjustedVelocity.multiplyScalar(0.5); // 몬스터는 강에서 50% 속도로 느려짐
      }
      
      newPos.addScaledVector(adjustedVelocity, delta);
      
      // 충돌 체크 (나무, 바위, 다른 몬스터와)
      const monsterRadius = monsterScale * 0.8;
      if (!checkCollisionWithObjects(newPos.x, newPos.z, monsterRadius) && 
          !checkCollisionWithMonsters(newPos.x, newPos.z, monsterRadius, monster)) {
        monster.mesh.position.copy(newPos);
      } else {
        // 충돌 시 방향 변경
        if (Math.random() < 0.5) {
          monster.velocity.multiplyScalar(-0.5);
        } else {
          const angle = Math.random() * Math.PI * 2;
          const speed = monster.velocity.length() * 0.5;
          monster.velocity.set(Math.cos(angle) * speed, 0, Math.sin(angle) * speed);
        }
      }
    }

    // 몬스터 크기에 따른 공격 범위와 데미지 조정
    const attackRange = 1.8 + monsterScale * 0.5;
    if (distance < attackRange) {
      const damage = 15 + (monsterScale - 0.8) * 10; // 큰 몬스터는 더 아픔
      player.health = Math.max(0, player.health - damage * delta);
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
