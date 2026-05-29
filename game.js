const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Mobile-friendly layout:
// - Desktop/tablet landscape uses 960x540.
// - Phone portrait uses 540x960.
function isPortraitMobile() {
  return window.innerHeight > window.innerWidth && window.innerWidth <= 800;
}

function setCanvasForScreen() {
  if (isPortraitMobile()) {
    canvas.width = 540;
    canvas.height = 960;
  } else {
    canvas.width = 960;
    canvas.height = 540;
  }
}

const overlay = document.getElementById("overlay");
const gameOver = document.getElementById("gameOver");
const startBtn = document.getElementById("startBtn");
const restartBtn = document.getElementById("restartBtn");
const finalScore = document.getElementById("finalScore");
const finalHigh = document.getElementById("finalHigh");

const saturnImg = new Image();
saturnImg.src = "assets/saturn-bean.png";

let running = false;
let keys = {};
let score = 0;
let highScore = Number(localStorage.getItem("stellarBeansHighScore") || 0);
let speed = 2.4;
let spawnTimer = 0;
let pickupTimer = 0;
let frame = 0;

setCanvasForScreen();

const player = {
  x: 140,
  y: canvas.height / 2,
  w: 96,
  h: 80,
  vy: 0,
  health: 3,
  fuel: 100
};

let hazards = [];
let pickups = [];
let stars = [];
let particles = [];
let floatingTexts = [];
let screenShake = 0;
let hitFlash = 0;

// v0.7a Shield Power-Up
let shieldPowerups = [];
let shieldActive = false;
let shieldTimer = 360;

// v0.5 Atmosphere Pack
let farStars = [];
let midStars = [];
let nearStars = [];
let atmosphereFrame = 0;
let shootingStars = [];
let nextShootingStar = 240 + Math.random() * 300;


function addPickupEffect(x, y, value) {
  floatingTexts.push({
    x,
    y,
    text: "+" + value,
    life: 40
  });

  for (let i = 0; i < 10; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 5,
      vy: (Math.random() - 0.5) * 5,
      size: 2 + Math.random() * 4,
      color: Math.random() > 0.5 ? "#ffe082" : "#6ee7ff",
      life: 30
    });
  }
}

function addHitEffect(x, y) {
  screenShake = 12;
  hitFlash = 12;

  for (let i = 0; i < 18; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 9,
      vy: (Math.random() - 0.5) * 9,
      size: 3 + Math.random() * 5,
      color: Math.random() > 0.5 ? "#ff5a6e" : "#ffffff",
      life: 35
    });
  }
}

function drawParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];

    p.x += p.vx;
    p.y += p.vy;
    p.life--;

    ctx.globalAlpha = p.life / 35;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    if (p.life <= 0) particles.splice(i, 1);
  }
}

function drawFloatingTexts() {
  ctx.font = "bold 24px Courier New";

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];

    t.y -= 1.2;
    t.life--;

    ctx.globalAlpha = t.life / 40;
    ctx.fillStyle = "#ffe082";
    ctx.fillText(t.text, t.x, t.y);
    ctx.globalAlpha = 1;

    if (t.life <= 0) floatingTexts.splice(i, 1);
  }
}

function resetStars() {
  farStars = [];
  midStars = [];
  nearStars = [];

  const farCount = isPortraitMobile() ? 90 : 80;
  const midCount = isPortraitMobile() ? 70 : 60;
  const nearCount = isPortraitMobile() ? 36 : 32;

  for (let i = 0; i < farCount; i++) {
    farStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.4,
      s: Math.random() * 0.35 + 0.12,
      twinkle: Math.random() * Math.PI * 2
    });
  }

  for (let i = 0; i < midCount; i++) {
    midStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.7,
      s: Math.random() * 0.9 + 0.45,
      twinkle: Math.random() * Math.PI * 2
    });
  }

  for (let i = 0; i < nearCount; i++) {
    nearStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2.6 + 1.1,
      s: Math.random() * 1.5 + 1.0,
      twinkle: Math.random() * Math.PI * 2
    });
  }

  // Keep this for compatibility with older code.
  stars = [...farStars, ...midStars, ...nearStars];
}

function keepPlayerOnScreen() {
  const maxPlayerX = canvas.width * 0.65;
  player.x = Math.max(30, Math.min(maxPlayerX, player.x));
  player.y = Math.max(40, Math.min(canvas.height - 110, player.y));
}

window.addEventListener("resize", () => {
  setCanvasForScreen();
  keepPlayerOnScreen();
  resetStars();
});

function startGame() {
  running = true;
  score = 0;
  speed = 2.4;
  spawnTimer = 0;
  pickupTimer = 0;
  hazards = [];
  pickups = [];
  shieldPowerups = [];
  shieldActive = false;
  shieldTimer = 360;
  player.x = isPortraitMobile() ? canvas.width / 2 - 48 : 140;
  player.y = canvas.height / 2;
  player.health = 3;
  player.fuel = 100;
  overlay.classList.add("hidden");
  gameOver.classList.add("hidden");
  resetStars();
}

function endGame() {
  running = false;
  highScore = Math.max(highScore, Math.floor(score));
  localStorage.setItem("stellarBeansHighScore", highScore);
  finalScore.textContent = `Score: ${Math.floor(score)}`;
  finalHigh.textContent = `High Score: ${highScore}`;
  gameOver.classList.remove("hidden");
}

function rectsHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function spawnHazard() {
  const size = 34 + Math.random() * 42;
  const roll = Math.random();

  let type = "asteroid";
  if (roll > 0.88) type = "gator";
  else if (roll > 0.68) type = "ufo";

  if (type === "gator") {
    floatingTexts.push({
      x: canvas.width - 210,
      y: 110,
      text: "SPACE GATOR!",
      life: 70
    });
  }

  hazards.push({
    type,
    x: canvas.width + 80,
    y: 70 + Math.random() * (canvas.height - 150),
    w: type === "gator" ? 92 : type === "ufo" ? 58 : size,
    h: type === "gator" ? 48 : type === "ufo" ? 34 : size,
    spin: Math.random() * Math.PI,
    speed: type === "gator" ? speed * 0.85 + 1.0 : speed + Math.random() * 2.1,
    wobble: Math.random() * Math.PI * 2
  });
}

function spawnPickup() {
  const kindRoll = Math.random();
  const kind = kindRoll > 0.9 ? "gold" : kindRoll > 0.62 ? "saturn" : "bean";
  pickups.push({
    kind,
    x: canvas.width + 60,
    y: 70 + Math.random() * (canvas.height - 150),
    w: kind === "saturn" ? 36 : 28,
    h: kind === "saturn" ? 36 : 28,
    speed: speed + 1.1,
    pulse: Math.random() * 10
  });
}

function spawnShieldPowerup() {
  shieldPowerups.push({
    x: canvas.width + 70,
    y: 90 + Math.random() * (canvas.height - 190),
    w: 38,
    h: 38,
    speed: speed + 0.7,
    pulse: Math.random() * Math.PI * 2
  });
}


function drawLayeredStarField(layer, speedMultiplier, colorA, colorB) {
  for (const st of layer) {
    st.x -= st.s * speed * speedMultiplier;

    if (st.x < -8) {
      st.x = canvas.width + 8;
      st.y = Math.random() * canvas.height;
    }

    const twinkle = 0.45 + Math.sin(frame / 24 + st.twinkle) * 0.22;
    ctx.globalAlpha = Math.max(0.18, twinkle);
    ctx.fillStyle = st.r > 1.6 ? colorA : colorB;
    ctx.fillRect(st.x, st.y, st.r, st.r);
    ctx.globalAlpha = 1;
  }
}

function drawNebulaClouds() {
  const drift = atmosphereFrame * 0.18;

  ctx.globalAlpha = 0.10;
  ctx.fillStyle = "#7b46b4";
  ctx.beginPath();
  ctx.ellipse(
    canvas.width * 0.28 + Math.sin(drift / 90) * 35,
    canvas.height * 0.24,
    canvas.width * 0.32,
    canvas.height * 0.10,
    -0.18,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.globalAlpha = 0.075;
  ctx.fillStyle = "#1ba7d8";
  ctx.beginPath();
  ctx.ellipse(
    canvas.width * 0.78 + Math.cos(drift / 110) * 40,
    canvas.height * 0.62,
    canvas.width * 0.36,
    canvas.height * 0.13,
    0.18,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.globalAlpha = 1;
}

function drawSwampPlanet() {
  const px = canvas.width * 0.82;
  const py = canvas.height * 0.28;
  const radius = isPortraitMobile() ? 78 : 92;

  ctx.globalAlpha = 0.55;
  ctx.fillStyle = "#233b2a";
  ctx.beginPath();
  ctx.arc(px, py, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#8fb45a";
  ctx.beginPath();
  ctx.arc(px - radius * 0.25, py - radius * 0.12, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = "#d8b16a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(px, py, radius + 20, radius * 0.34, -0.18, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 1;
}

function drawDistantMoon() {
  const mx = canvas.width * 0.30;
  const my = canvas.height * 0.16;
  const mr = isPortraitMobile() ? 22 : 28;

  ctx.globalAlpha = 0.42;
  ctx.fillStyle = "#d8d2c2";
  ctx.beginPath();
  ctx.arc(mx, my, mr, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.16;
  ctx.fillStyle = "#6f6b62";
  ctx.beginPath();
  ctx.arc(mx - 8, my - 5, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(mx + 7, my + 9, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
}

function drawSaturnBeanConstellation() {
  const startX = isPortraitMobile() ? 68 : 110;
  const startY = isPortraitMobile() ? 115 : 92;
  const points = [
    [0, 12], [18, 0], [36, 18], [58, 8], [78, 24]
  ];

  ctx.globalAlpha = 0.42;
  ctx.strokeStyle = "#d8b16a";
  ctx.lineWidth = 1;

  ctx.beginPath();
  points.forEach((p, i) => {
    const x = startX + p[0];
    const y = startY + p[1];
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();

  ctx.fillStyle = "#ffe8b0";
  for (const p of points) {
    ctx.fillRect(startX + p[0], startY + p[1], 3, 3);
  }

  ctx.globalAlpha = 1;
}

function maybeSpawnShootingStar() {
  nextShootingStar--;

  if (nextShootingStar <= 0) {
    shootingStars.push({
      x: canvas.width + 30,
      y: 60 + Math.random() * (canvas.height * 0.55),
      vx: -7 - Math.random() * 4,
      vy: 2 + Math.random() * 2,
      life: 50
    });

    nextShootingStar = 320 + Math.random() * 480;
  }
}

function drawShootingStars() {
  maybeSpawnShootingStar();

  for (let i = shootingStars.length - 1; i >= 0; i--) {
    const s = shootingStars[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life--;

    ctx.globalAlpha = Math.max(0, s.life / 50);
    ctx.strokeStyle = "#ffe8b0";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(s.x - s.vx * 4, s.y - s.vy * 4);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(s.x, s.y, 3, 3);
    ctx.globalAlpha = 1;

    if (s.life <= 0 || s.x < -80 || s.y > canvas.height + 80) {
      shootingStars.splice(i, 1);
    }
  }
}

function drawStars() {
  ctx.save();

  if (screenShake > 0) {
    ctx.translate(
      (Math.random() - 0.5) * screenShake,
      (Math.random() - 0.5) * screenShake
    );
    screenShake *= 0.85;
    if (screenShake < 0.5) screenShake = 0;
  }

  atmosphereFrame++;

  ctx.fillStyle = "#05040b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawNebulaClouds();
  drawDistantMoon();
  drawSwampPlanet();

  drawLayeredStarField(farStars, 0.16, "#f7ead0", "#7ebcff");
  drawLayeredStarField(midStars, 0.32, "#ffe8b0", "#b6e7ff");
  drawLayeredStarField(nearStars, 0.56, "#ffffff", "#d8b16a");

  drawSaturnBeanConstellation();
  drawShootingStars();

  if (hitFlash > 0) {
    ctx.globalAlpha = hitFlash / 18;
    ctx.fillStyle = "#ff3355";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
    hitFlash--;
  }

  ctx.restore();
}

function drawCupShip() {
  const bob = Math.sin(frame / 14) * 3;
  const x = player.x;
  const y = player.y + bob;

  // soft pulsing engine glow
  ctx.save();
  const glowPulse = 0.75 + Math.sin(frame / 8) * 0.25;
  const glow = ctx.createRadialGradient(x + 2, y + 42, 2, x + 2, y + 42, 34);
  glow.addColorStop(0, `rgba(46, 216, 255, ${0.45 * glowPulse})`);
  glow.addColorStop(1, "rgba(46, 216, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x + 2, y + 42, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // steam trail
  for (let i = 0; i < 5; i++) {
    ctx.globalAlpha = 0.35 - i * 0.045;
    ctx.fillStyle = i % 2 ? "#b6e7ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(x - 14 - i * 16, y + 32 + Math.sin(frame / 5 + i) * 7, 10 + i * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // boosters
  ctx.fillStyle = "#6b5a4a";
  ctx.fillRect(x + 8, y + 35, 58, 15);
  ctx.fillStyle = "#2ed8ff";
  ctx.beginPath();
  ctx.arc(x + 3, y + 42, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffb347";
  ctx.beginPath();
  ctx.arc(x + 70, y + 42, 8, 0, Math.PI * 2);
  ctx.fill();

  // cup body
  ctx.fillStyle = "#efe2c8";
  ctx.strokeStyle = "#3a2f2a";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 16, 62, 34, 8);
  ctx.fill();
  ctx.stroke();

  // cup handle
  ctx.beginPath();
  ctx.arc(x + 76, y + 32, 13, -1.2, 1.2);
  ctx.stroke();

  // coffee top
  ctx.fillStyle = "#3a2116";
  ctx.beginPath();
  ctx.ellipse(x + 43, y + 16, 33, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // canopy
  ctx.fillStyle = "#111827";
  ctx.strokeStyle = "#d9edf7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 44, y + 13, 18, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // tiny pilot
  ctx.fillStyle = "#f7ead0";
  ctx.fillRect(x + 37, y + 4, 13, 11);
  ctx.fillStyle = "#05040b";
  ctx.fillRect(x + 41, y + 7, 5, 4);

  // tiny blinking antenna
  ctx.strokeStyle = "#7efc9a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 58, y + 3);
  ctx.lineTo(x + 66, y - 8);
  ctx.stroke();

  ctx.fillStyle = frame % 44 < 22 ? "#7efc9a" : "#2ed8ff";
  ctx.beginPath();
  ctx.arc(x + 67, y - 9, 4, 0, Math.PI * 2);
  ctx.fill();

  // saturn logo approximation
  ctx.strokeStyle = "#b87932";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x + 43, y + 34, 19, 7, -0.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#8b4b24";
  ctx.beginPath();
  ctx.ellipse(x + 43, y + 34, 9, 13, 0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawBean(p) {
  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
  ctx.rotate(-0.35);
  ctx.fillStyle = p.kind === "gold" ? "#f6c748" : "#8b4b24";
  ctx.strokeStyle = p.kind === "gold" ? "#ffe9a3" : "#3a2116";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#2d180f";
  ctx.beginPath();
  ctx.moveTo(0, -p.h / 2 + 5);
  ctx.bezierCurveTo(-5, -5, 5, 5, 0, p.h / 2 - 5);
  ctx.stroke();
  ctx.restore();
}

function drawPickup(p) {
  if (p.kind === "saturn") {
    if (saturnImg.complete && saturnImg.naturalWidth) {
      ctx.drawImage(saturnImg, p.x - 4, p.y - 4, p.w + 8, p.h + 8);
    } else {
      drawBean(p);
    }
  } else {
    drawBean(p);
  }
}

function drawShieldPowerup(p) {
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const pulse = 1 + Math.sin(frame / 8 + p.pulse) * 0.08;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  ctx.globalAlpha = 0.30;
  ctx.fillStyle = "#6ee7ff";
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "#6ee7ff";
  ctx.fillStyle = "#102436";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#d9edf7";
  ctx.font = "bold 18px Courier New";
  ctx.fillText("S", -6, 7);

  ctx.restore();
}

function drawHazard(h) {
  if (h.type === "gator") {
    const gx = h.x;
    const gy = h.y + Math.sin(frame / 8 + h.wobble) * 2;

    // jetpack flame
    ctx.fillStyle = "#2ed8ff";
    ctx.beginPath();
    ctx.ellipse(gx + h.w + 3, gy + h.h / 2, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffb347";
    ctx.beginPath();
    ctx.ellipse(gx + h.w + 10, gy + h.h / 2, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // gator body
    ctx.fillStyle = "#375f2b";
    ctx.strokeStyle = "#162614";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(gx + 8, gy + 13, 66, 24, 10);
    ctx.fill();
    ctx.stroke();

    // snout
    ctx.fillStyle = "#4f8a38";
    ctx.beginPath();
    ctx.roundRect(gx + 0, gy + 18, 34, 18, 8);
    ctx.fill();
    ctx.stroke();

    // tail
    ctx.fillStyle = "#2b4d22";
    ctx.beginPath();
    ctx.moveTo(gx + 72, gy + 25);
    ctx.lineTo(gx + 92, gy + 14);
    ctx.lineTo(gx + 84, gy + 36);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // helmet bubble
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#b6e7ff";
    ctx.beginPath();
    ctx.arc(gx + 32, gy + 16, 18, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "#d9edf7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gx + 32, gy + 16, 18, Math.PI, Math.PI * 2);
    ctx.stroke();

    // eye
    ctx.fillStyle = "#ffe082";
    ctx.fillRect(gx + 21, gy + 20, 5, 5);
    ctx.fillStyle = "#05040b";
    ctx.fillRect(gx + 23, gy + 21, 2, 3);

    // teeth
    ctx.fillStyle = "#f7ead0";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(gx + 8 + i * 7, gy + 35);
      ctx.lineTo(gx + 11 + i * 7, gy + 41);
      ctx.lineTo(gx + 14 + i * 7, gy + 35);
      ctx.closePath();
      ctx.fill();
    }

    // little warning glow
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = "#7efc9a";
    ctx.beginPath();
    ctx.ellipse(gx + 44, gy + 26, 55, 26, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

  } else if (h.type === "ufo") {
    ctx.fillStyle = "#c9d0c7";
    ctx.strokeStyle = "#1b1b24";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(h.x + h.w / 2, h.y + h.h / 2, h.w / 2, h.h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#6ee7b7";
    ctx.beginPath();
    ctx.arc(h.x + h.w / 2, h.y + 10, 13, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#ff4f6d";
    ctx.fillRect(h.x + 12, h.y + 21, 7, 5);
    ctx.fillRect(h.x + 39, h.y + 21, 7, 5);
  } else {
    ctx.save();
    ctx.translate(h.x + h.w / 2, h.y + h.h / 2);
    ctx.rotate(h.spin + frame * 0.01);
    ctx.fillStyle = "#6b6258";
    ctx.strokeStyle = "#2d2a26";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, h.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#3e3934";
    ctx.beginPath(); ctx.arc(-8, -6, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(9, 8, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -13, 4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

function drawHUD() {
  ctx.fillStyle = "rgba(0,0,0,.45)";
  ctx.fillRect(18, 16, 250, 74);
  ctx.strokeStyle = "#d8b16a";
  ctx.strokeRect(18, 16, 250, 74);
  ctx.fillStyle = "#f7ead0";
  ctx.font = "22px Courier New";
  ctx.fillText(`SCORE ${Math.floor(score).toString().padStart(5, "0")}`, 35, 45);
  ctx.fillText(`HI ${highScore.toString().padStart(5, "0")}`, 35, 75);

  const healthX = canvas.width - 165;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < player.health ? "#ff4f6d" : "#2b2530";
    ctx.fillRect(healthX + i * 28, 25, 20, 20);
  }

  ctx.fillStyle = "#f7ead0";
  ctx.font = "16px Courier New";
  ctx.fillText("HEALTH", healthX, 64);

  if (shieldActive) {
    ctx.fillStyle = "#6ee7ff";
    ctx.font = "bold 16px Courier New";
    ctx.fillText("SHIELD ON", 35, 112);
  }
}

function update() {
  frame++;

  if (running) {
    score += 0.12 * speed;

    // smoother arcade difficulty ramp
    speed += 0.00055;

    // occasional calmer moments
    const calmModifier = Math.sin(frame / 240) * 8;

    if (keys.ArrowUp || keys.w) player.y -= 5.2;
    if (keys.ArrowDown || keys.s) player.y += 5.2;
    if (keys.ArrowLeft || keys.a) player.x -= 4.6;
    if (keys.ArrowRight || keys.d) player.x += 4.6;

    keepPlayerOnScreen();

    spawnTimer--;
    pickupTimer--;
    shieldTimer--;

    if (spawnTimer <= 0) {
      spawnHazard();
      spawnTimer = Math.max(34, 92 - speed * 8 + calmModifier);
    }

    if (pickupTimer <= 0) {
      spawnPickup();
      pickupTimer = Math.max(30, 72 - speed * 4);
    }

    if (shieldTimer <= 0) {
      spawnShieldPowerup();
      shieldTimer = 520 + Math.random() * 420;
    }

    for (const h of hazards) {
      h.x -= h.speed;

      // Space Gator slowly hunts the player's vertical position.
      if (h.type === "gator") {
        const targetY = player.y + player.h / 2;
        const gatorY = h.y + h.h / 2;
        h.y += Math.sign(targetY - gatorY) * Math.min(1.2, Math.abs(targetY - gatorY) * 0.018);
        h.y += Math.sin(frame / 18 + h.wobble) * 0.35;
      }
    }
    for (const p of pickups) p.x -= p.speed;
    for (const s of shieldPowerups) s.x -= s.speed;

    hazards = hazards.filter(h => h.x > -120);
    pickups = pickups.filter(p => p.x > -80);
    shieldPowerups = shieldPowerups.filter(s => s.x > -80);

    const hitBox = { x: player.x + 12, y: player.y + 12, w: player.w - 20, h: player.h - 12 };

    for (let i = hazards.length - 1; i >= 0; i--) {
      if (rectsHit(hitBox, hazards[i])) {
        addHitEffect(player.x + 40, player.y + 40);
        hazards.splice(i, 1);

        if (shieldActive) {
          shieldActive = false;
          floatingTexts.push({
            x: player.x + 20,
            y: player.y - 10,
            text: "SHIELD!",
            life: 50
          });
        } else {
          player.health--;
          if (player.health <= 0) endGame();
        }
      }
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
      if (rectsHit(hitBox, pickups[i])) {
        const kind = pickups[i].kind;
        const value = kind === "gold" ? 100 : kind === "saturn" ? 50 : 10;

        addPickupEffect(
          pickups[i].x,
          pickups[i].y,
          value
        );

        score += value;
        pickups.splice(i, 1);
      }
    }

    for (let i = shieldPowerups.length - 1; i >= 0; i--) {
      if (rectsHit(hitBox, shieldPowerups[i])) {
        shieldActive = true;
        floatingTexts.push({
          x: shieldPowerups[i].x,
          y: shieldPowerups[i].y,
          text: "SHIELD",
          life: 55
        });
        addPickupEffect(shieldPowerups[i].x, shieldPowerups[i].y, 0);
        shieldPowerups.splice(i, 1);
      }
    }
  }

  drawStars();

  for (const p of pickups) drawPickup(p);
  for (const s of shieldPowerups) drawShieldPowerup(s);
  for (const h of hazards) drawHazard(h);

  if (running) {
    drawCupShip();

    if (shieldActive) {
      ctx.globalAlpha = 0.32 + Math.sin(frame / 7) * 0.08;
      ctx.strokeStyle = "#6ee7ff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(player.x + 45, player.y + 40, 62, 42, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawParticles();
  drawFloatingTexts();

  drawHUD();

  requestAnimationFrame(update);
}

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

let pointerActive = false;
let pointerOffsetX = 0;
let pointerOffsetY = 0;

function pointerToCanvas(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

// Touch/drag anywhere on the game screen.
// You do NOT have to put your finger on top of the ship.
// Wherever you first touch becomes your control point.
canvas.addEventListener("pointerdown", e => {
  if (!running) return;
  canvas.setPointerCapture(e.pointerId);
  const p = pointerToCanvas(e);
  pointerActive = true;
  pointerOffsetX = player.x - p.x;
  pointerOffsetY = player.y - p.y;
});

canvas.addEventListener("pointermove", e => {
  if (!running || !pointerActive) return;
  const p = pointerToCanvas(e);
  player.x = p.x + pointerOffsetX;
  player.y = p.y + pointerOffsetY;
  keepPlayerOnScreen();
});

canvas.addEventListener("pointerup", () => {
  pointerActive = false;
});

canvas.addEventListener("pointercancel", () => {
  pointerActive = false;
});

startBtn.addEventListener("click", startGame);
restartBtn.addEventListener("click", startGame);

if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    this.beginPath();
    this.moveTo(x + r, y);
    this.arcTo(x + w, y, x + w, y + h, r);
    this.arcTo(x + w, y + h, x, y + h, r);
    this.arcTo(x, y + h, x, y, r);
    this.arcTo(x, y, x + w, y, r);
    this.closePath();
  };
}

resetStars();
update();
