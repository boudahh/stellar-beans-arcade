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
  stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      s: Math.random() * 1.8 + 0.4
    });
  }
}

function keepPlayerOnScreen() {
  player.x = Math.max(30, Math.min(canvas.width - 130, player.x));
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
  const type = Math.random() > 0.72 ? "ufo" : "asteroid";
  hazards.push({
    type,
    x: canvas.width + 80,
    y: 70 + Math.random() * (canvas.height - 150),
    w: type === "ufo" ? 58 : size,
    h: type === "ufo" ? 34 : size,
    spin: Math.random() * Math.PI,
    speed: speed + Math.random() * 2.1
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

  ctx.fillStyle = "#05040b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const st of stars) {
    st.x -= st.s * speed * 0.35;
    if (st.x < -5) {
      st.x = canvas.width + 5;
      st.y = Math.random() * canvas.height;
    }
    ctx.fillStyle = st.r > 1.6 ? "#ffe8b0" : "#b6e7ff";
    ctx.globalAlpha = 0.45 + Math.random() * 0.45;
    ctx.fillRect(st.x, st.y, st.r, st.r);
    ctx.globalAlpha = 1;
  }

  ctx.globalAlpha = 0.12;
  ctx.fillStyle = "#7b46b4";
  ctx.beginPath();
  ctx.ellipse(720, 420, 380, 55, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

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

function drawHazard(h) {
  if (h.type === "ufo") {
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

    if (spawnTimer <= 0) {
      spawnHazard();
      spawnTimer = Math.max(34, 92 - speed * 8 + calmModifier);
    }

    if (pickupTimer <= 0) {
      spawnPickup();
      pickupTimer = Math.max(30, 72 - speed * 4);
    }

    for (const h of hazards) h.x -= h.speed;
    for (const p of pickups) p.x -= p.speed;

    hazards = hazards.filter(h => h.x > -120);
    pickups = pickups.filter(p => p.x > -80);

    const hitBox = { x: player.x + 12, y: player.y + 12, w: player.w - 20, h: player.h - 12 };

    for (let i = hazards.length - 1; i >= 0; i--) {
      if (rectsHit(hitBox, hazards[i])) {
        addHitEffect(player.x + 40, player.y + 40);
        hazards.splice(i, 1);
        player.health--;
        if (player.health <= 0) endGame();
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
  }

  drawStars();

  for (const p of pickups) drawPickup(p);
  for (const h of hazards) drawHazard(h);

  if (running) drawCupShip();

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
