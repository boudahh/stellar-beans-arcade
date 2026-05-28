const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

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

const player = {
  x: 140,
  y: canvas.height / 2,
  w: 82,
  h: 52,
  vy: 0,
  health: 3,
  fuel: 100
};

let hazards = [];
let pickups = [];
let stars = [];

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

function startGame() {
  running = true;
  score = 0;
  speed = 2.4;
  spawnTimer = 0;
  pickupTimer = 0;
  hazards = [];
  pickups = [];
  player.x = 140;
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
    y: 45 + Math.random() * (canvas.height - 120),
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
    y: 45 + Math.random() * (canvas.height - 110),
    w: kind === "saturn" ? 36 : 28,
    h: kind === "saturn" ? 36 : 28,
    speed: speed + 1.1,
    pulse: Math.random() * 10
  });
}

function drawStars() {
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
}

function drawCupShip() {
  const bob = Math.sin(frame / 14) * 3;
  const x = player.x;
  const y = player.y + bob;

  // soft engine glow
  ctx.save();
  const glow = ctx.createRadialGradient(x + 2, y + 42, 2, x + 2, y + 42, 34);
  glow.addColorStop(0, "rgba(46, 216, 255, 0.55)");
  glow.addColorStop(1, "rgba(46, 216, 255, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x + 2, y + 42, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // upgraded steam trail
  for (let i = 0; i < 6; i++) {
    const puffX = x - 18 - i * 15;
    const puffY = y + 38 + Math.sin(frame / 6 + i) * 7;
    const puffSize = 9 + i * 2;

    ctx.globalAlpha = 0.38 - i * 0.045;
    ctx.fillStyle = i % 2 ? "#b6e7ff" : "#ffffff";
    ctx.beginPath();
    ctx.arc(puffX, puffY, puffSize, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // back mechanical booster rail
  ctx.fillStyle = "#4a3b36";
  ctx.fillRect(x + 2, y + 34, 66, 18);

  // metal highlights
  ctx.fillStyle = "#8d7b6a";
  ctx.fillRect(x + 12, y + 37, 42, 4);
  ctx.fillStyle = "#2a2220";
  ctx.fillRect(x + 12, y + 47, 42, 3);

  // blue rear thruster
  ctx.fillStyle = "#2ed8ff";
  ctx.beginPath();
  ctx.arc(x + 2, y + 43, 11, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#dff8ff";
  ctx.beginPath();
  ctx.arc(x + 0, y + 43, 5, 0, Math.PI * 2);
  ctx.fill();

  // front warm thruster / nose light
  ctx.fillStyle = "#ffb347";
  ctx.beginPath();
  ctx.arc(x + 72, y + 43, 8, 0, Math.PI * 2);
  ctx.fill();

  // cup shadow
  ctx.fillStyle = "#c7b795";
  ctx.beginPath();
  ctx.roundRect(x + 14, y + 19, 62, 34, 8);
  ctx.fill();

  // main cup body
  ctx.fillStyle = "#efe2c8";
  ctx.strokeStyle = "#2d2522";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.roundRect(x + 12, y + 16, 64, 34, 8);
  ctx.fill();
  ctx.stroke();

  // cup rim / coffee top
  ctx.fillStyle = "#3a2116";
  ctx.strokeStyle = "#2d2522";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(x + 44, y + 16, 34, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // subtle coffee shine
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "#9b6a44";
  ctx.beginPath();
  ctx.ellipse(x + 38, y + 14, 12, 3, -0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // cup handle
  ctx.strokeStyle = "#2d2522";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 77, y + 32, 14, -1.15, 1.15);
  ctx.stroke();

  ctx.strokeStyle = "#efe2c8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x + 77, y + 32, 8, -1.15, 1.15);
  ctx.stroke();

  // cockpit canopy
  ctx.fillStyle = "#101926";
  ctx.strokeStyle = "#d9edf7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x + 45, y + 13, 18, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // canopy glow
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#6ee7ff";
  ctx.beginPath();
  ctx.arc(x + 39, y + 10, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // tiny pilot
  ctx.fillStyle = "#f7ead0";
  ctx.fillRect(x + 37, y + 4, 14, 11);
  ctx.fillStyle = "#05040b";
  ctx.fillRect(x + 42, y + 7, 5, 4);

  // antenna
  ctx.strokeStyle = "#7efc9a";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 58, y + 3);
  ctx.lineTo(x + 66, y - 8);
  ctx.stroke();

  ctx.fillStyle = frame % 40 < 20 ? "#7efc9a" : "#2ed8ff";
  ctx.beginPath();
  ctx.arc(x + 67, y - 9, 4, 0, Math.PI * 2);
  ctx.fill();

  // cleaner Saturn Bean style logo on side
  ctx.save();
  ctx.translate(x + 44, y + 34);
  ctx.rotate(-0.32);

  ctx.strokeStyle = "#b87932";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "#8b4b24";
  ctx.beginPath();
  ctx.ellipse(0, 0, 9, 13, 0.45, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#3a2116";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(-4, -4, 4, 4, 0, 10);
  ctx.stroke();

  ctx.restore();

  // tiny rivets / patched homemade feel
  ctx.fillStyle = "#8d7b6a";
  ctx.fillRect(x + 22, y + 23, 4, 4);
  ctx.fillRect(x + 64, y + 24, 4, 4);
  ctx.fillRect(x + 58, y + 42, 4, 4);

  // little duct-tape patch
  ctx.fillStyle = "#b9b2a4";
  ctx.fillRect(x + 19, y + 39, 14, 6);
  ctx.strokeStyle = "#777166";
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 19, y + 39, 14, 6);
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

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < player.health ? "#ff4f6d" : "#2b2530";
    ctx.fillRect(795 + i * 28, 25, 20, 20);
  }

  ctx.fillStyle = "#f7ead0";
  ctx.font = "16px Courier New";
  ctx.fillText("HEALTH", 795, 64);
}

function update() {
  frame++;

  if (running) {
    score += 0.12 * speed;
    speed += 0.0008;

    if (keys.ArrowUp || keys.w) player.y -= 5.2;
    if (keys.ArrowDown || keys.s) player.y += 5.2;
    if (keys.ArrowLeft || keys.a) player.x -= 4.6;
    if (keys.ArrowRight || keys.d) player.x += 4.6;

    player.x = Math.max(30, Math.min(canvas.width - 130, player.x));
    player.y = Math.max(40, Math.min(canvas.height - 90, player.y));

    spawnTimer--;
    pickupTimer--;

    if (spawnTimer <= 0) {
      spawnHazard();
      spawnTimer = Math.max(36, 92 - speed * 8);
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
        hazards.splice(i, 1);
        player.health--;
        if (player.health <= 0) endGame();
      }
    }

    for (let i = pickups.length - 1; i >= 0; i--) {
      if (rectsHit(hitBox, pickups[i])) {
        const kind = pickups[i].kind;
        score += kind === "gold" ? 100 : kind === "saturn" ? 50 : 10;
        pickups.splice(i, 1);
      }
    }
  }

  drawStars();

  for (const p of pickups) drawPickup(p);
  for (const h of hazards) drawHazard(h);

  if (running) drawCupShip();

  drawHUD();

  requestAnimationFrame(update);
}

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

canvas.addEventListener("pointermove", e => {
  if (!running) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  player.x = (e.clientX - rect.left) * scaleX - player.w / 2;
  player.y = (e.clientY - rect.top) * scaleY - player.h / 2;
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
