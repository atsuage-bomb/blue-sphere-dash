// --- 初期設定 ---
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const uiContainer = document.getElementById('ui-container');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const timerEl = document.getElementById('timer');
const startScreen = document.getElementById('start-screen');
const startMessageEl = document.getElementById('start-message');
const gameOverScreen = document.getElementById('game-over-screen');
const gameOverTitleEl = document.getElementById('game-over-title');
const finalScoreEl = document.getElementById('final-score');
const restartButton = document.getElementById('restart-button');
const scoreHistoryButton = document.getElementById('score-history-button');
const scoreHistoryModal = document.getElementById('score-history-modal');
const scoreList = document.getElementById('score-list');
const closeButton = document.querySelector('.close-button');

// モバイル操作ボタンの要素を取得
const jumpButton = document.getElementById('jump-button');
const leftButton = document.getElementById('left-button');
const rightButton = document.getElementById('right-button');
const attackButton = document.getElementById('attack-button');
// 操作説明の表示切り替え用
const desktopControlsInfo = document.getElementById('desktop-controls');
const desktopJumpInfo = document.getElementById('desktop-jump');
const desktopAttackInfo = document.getElementById('desktop-attack');
const mobileControlsInfo = document.getElementById('mobile-controls-info');


// canvasの元のサイズを定数として保持
const ORIGINAL_CANVAS_WIDTH = 800;
const ORIGINAL_CANVAS_HEIGHT = 400;
canvas.width = ORIGINAL_CANVAS_WIDTH;
canvas.height = ORIGINAL_CANVAS_HEIGHT;

// --- ゲームの定数 ---
const GRAVITY = 0.5; const JUMP_FORCE = 12; const PLAYER_SPEED = 5; const BULLET_SPEED = 10; const ENEMY_BULLET_SPEED = 5;
const MAX_GROUND_ENEMIES = 3; const MAX_FLYING_ENEMIES = 2; const INITIAL_LIVES = 3; const GAME_DURATION = 60;
const INVINCIBILITY_DURATION = 120; const ITEM_LIFESPAN = 300; const HEALING_EFFECT_DURATION = 120;
const SCORES_KEY = 'blueSphereDashScores';

// --- ゲームの状態変数 ---
let player, enemies, playerBullets, enemyBullets, defenseItem, attackItem, recoveryItem, score, lives, timeLeft;
let gameTimer, groundEnemySpawnTimer, flyingEnemySpawnTimer, defenseItemSpawnTimer, attackItemSpawnTimer, recoveryItemSpawnTimer;
let worldOffsetX, keys, isGameOver, gameActive = false;
let backgroundObjects;
let scaleFactor = 1; // スケーリングファクターを追加

// --- オブジェクト生成関数 ---
function createPlayer() { return { x: canvas.width / 2 / scaleFactor, y: 300 / scaleFactor, width: 30 / scaleFactor, height: 30 / scaleFactor, radius: 15 / scaleFactor, dx: 0, dy: 0, onGround: false, color: '#007BFF', isInvincible: false, invincibilityTimer: 0, hasShield: false, hasAttack: false, isHealing: false, healingTimer: 0 }; }
function createEnemy(type) { return { type: type, x: worldOffsetX / scaleFactor + canvas.width / scaleFactor + Math.random() * 200 / scaleFactor, y: type === 'ground' ? ground.y / scaleFactor - 30 / scaleFactor : Math.random() * (ground.y / scaleFactor - 200 / scaleFactor) + 50 / scaleFactor, width: 30 / scaleFactor, height: 30 / scaleFactor, color: type === 'ground' ? '#DC3545' : 'black', speed: type === 'ground' ? 3 / scaleFactor : (Math.random() * 2 + 1) / scaleFactor, shootCooldown: 120 }; }
function createItem(type) { return { type: type, x: 0, y: 0, width: 30 / scaleFactor, height: 30 / scaleFactor, color: type === 'defense' ? '#8A2BE2' : (type === 'attack' ? '#FFD700' : '#32CD32'), isActive: false, lifeTimer: 0 }; }
function createPlayerBullet() { playerBullets.push({ x: player.x + player.radius, y: player.y + player.radius, width: 25 / scaleFactor, height: 5 / scaleFactor, color: 'white' }); }
function createEnemyBullet(enemy) { const angle = Math.atan2((player.y + player.radius) - (enemy.y + enemy.height / 2), (player.x + player.radius) - (enemy.x + enemy.width / 2)); enemyBullets.push({ x: enemy.x, y: enemy.y + enemy.height / 2, radius: 5 / scaleFactor, color: 'red', dx: Math.cos(angle) * ENEMY_BULLET_SPEED / scaleFactor, dy: Math.sin(angle) * ENEMY_BULLET_SPEED / scaleFactor }); }

const ground = { y: ORIGINAL_CANVAS_HEIGHT - 40, color: '#28A745' }; // 地面のY座標はオリジナルの高さで保持
keys = { ArrowRight: false, ArrowLeft: false, Space: false, KeyA: false };

// --- イベントリスナー ---
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.code)) { e.preventDefault(); keys[e.code] = true; }
    if (e.code === 'Enter' && !gameActive) { startGame(); }
});
window.addEventListener('keyup', (e) => { if (keys.hasOwnProperty(e.code)) { e.preventDefault(); keys[e.code] = false; }});
restartButton.addEventListener('click', startGame);
scoreHistoryButton.addEventListener('click', displayScores);
closeButton.addEventListener('click', () => { scoreHistoryModal.style.display = 'none'; });
scoreHistoryModal.addEventListener('click', (e) => { if (e.target === scoreHistoryModal) { scoreHistoryModal.style.display = 'none'; } });

// スタート画面のクリックイベント（スマートフォン対応）
startScreen.addEventListener('click', () => {
    if (!gameActive) {
        startGame();
    }
});

// モバイル操作ボタンのイベントリスナー
jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Space = true; });
jumpButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.Space = false; });
jumpButton.addEventListener('mousedown', (e) => { e.preventDefault(); keys.Space = true; }); // PCでのクリックも考慮
jumpButton.addEventListener('mouseup', (e) => { e.preventDefault(); keys.Space = false; });

leftButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowLeft = true; });
leftButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowLeft = false; });
leftButton.addEventListener('mousedown', (e) => { e.preventDefault(); keys.ArrowLeft = true; });
leftButton.addEventListener('mouseup', (e) => { e.preventDefault(); keys.ArrowLeft = false; });

rightButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.ArrowRight = true; });
rightButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.ArrowRight = false; });
rightButton.addEventListener('mousedown', (e) => { e.preventDefault(); keys.ArrowRight = true; });
rightButton.addEventListener('mouseup', (e) => { e.preventDefault(); keys.ArrowRight = false; });

attackButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.KeyA = true; });
attackButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.KeyA = false; });
attackButton.addEventListener('mousedown', (e) => { e.preventDefault(); keys.KeyA = true; });
attackButton.addEventListener('mouseup', (e) => { e.preventDefault(); keys.KeyA = false; });


// --- 画面サイズ変更時の処理 ---
function resizeGame() {
    // コンテナの現在の幅に基づいてスケールを計算
    const gameContainer = document.getElementById('game-container');
    const containerWidth = gameContainer.clientWidth;
    scaleFactor = containerWidth / ORIGINAL_CANVAS_WIDTH;

    canvas.width = ORIGINAL_CANVAS_WIDTH;
    canvas.height = ORIGINAL_CANVAS_HEIGHT;

    // CSSでサイズを調整するため、canvasの属性サイズは固定のまま
    // ctx.scale() を使って描画を調整
    initialDraw(); // スケール変更後に初期描画を呼び出す
    
    // モバイルデバイスでの操作説明の表示/非表示を切り替え
    if (window.innerWidth <= 820) { // CSSのメディアクエリと合わせる
        desktopControlsInfo.style.display = 'none';
        desktopJumpInfo.style.display = 'none';
        desktopAttackInfo.style.display = 'none';
        mobileControlsInfo.style.display = 'block';
        startMessageEl.textContent = '画面をタップしてスタート';
    } else {
        desktopControlsInfo.style.display = 'list-item';
        desktopJumpInfo.style.display = 'list-item';
        desktopAttackInfo.style.display = 'list-item';
        mobileControlsInfo.style.display = 'none';
        startMessageEl.textContent = 'エンターキーでスタート';
    }
}

window.addEventListener('resize', resizeGame);
resizeGame(); // 初回ロード時にも実行

function startGame() {
    gameActive = true;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    init();
}

// --- ゲーム初期化 ---
function init() {
    player = createPlayer();
    enemies = []; playerBullets = []; enemyBullets = [];
    defenseItem = createItem('defense'); attackItem = createItem('attack'); recoveryItem = createItem('recovery');
    backgroundObjects = [];
    score = 0; lives = INITIAL_LIVES; timeLeft = GAME_DURATION; isGameOver = false;
    worldOffsetX = player.x - (canvas.width / 2); // 既にスケールが適用されているcreatePlayer()の値を使う

    for (let i = 0; i < 30; i++) { backgroundObjects.push({ x: i * (Math.random() * 150 + 250), trunkWidth: 20, trunkHeight: 40, leafWidth: 80, leafHeight: 80 }); }
    
    updateUI();
    uiContainer.style.display = 'block';

    clearInterval(gameTimer); clearTimeout(groundEnemySpawnTimer); clearTimeout(flyingEnemySpawnTimer); clearTimeout(defenseItemSpawnTimer); clearTimeout(attackItemSpawnTimer); clearTimeout(recoveryItemSpawnTimer);

    gameTimer = setInterval(() => { if(isGameOver) return; timeLeft--; if (timeLeft <= 0) { timeLeft = 0; endGame("ゲームクリア"); } updateUI(); }, 1000);
    
    function scheduleNextGroundEnemy() { if (isGameOver) return; spawnEnemy('ground'); groundEnemySpawnTimer = setTimeout(scheduleNextGroundEnemy, 2000 + Math.random() * 2000); }
    function scheduleNextFlyingEnemy() { if (isGameOver) return; spawnEnemy('flying'); flyingEnemySpawnTimer = setTimeout(scheduleNextFlyingEnemy, 3000 + Math.random() * 3000); }
    scheduleNextGroundEnemy(); scheduleNextFlyingEnemy();
    
    defenseItemSpawnTimer = setTimeout(() => scheduleNextItem(defenseItem), 10000);
    attackItemSpawnTimer = setTimeout(() => scheduleNextItem(attackItem), 15000);

    if (!gameLoop.isRunning) { gameLoop(); }
}

// --- アイテム & 敵の出現制御 ---
function scheduleNextItem(item) { if (isGameOver) return; spawnItem(item); }
function spawnItem(item) {
    if (isGameOver || item.isActive) return;
    if (item.type === 'defense' && player.hasShield) return;
    if (item.type === 'attack' && player.hasAttack) return;
    if (item.type === 'recovery' && lives > 2) return;
    item.isActive = true; item.lifeTimer = ITEM_LIFESPAN; item.x = player.x + (100 + Math.random() * (canvas.width / 2)) / scaleFactor; item.y = ground.y / scaleFactor - item.height - (Math.random() * 80 + 50) / scaleFactor;
}
function spawnEnemy(type) { if (isGameOver) return; const currentEnemies = enemies.filter(e => e.type === type); const maxEnemies = type === 'ground' ? MAX_GROUND_ENEMIES : MAX_FLYING_ENEMIES; if (currentEnemies.length < maxEnemies) { enemies.push(createEnemy(type)); } }

function updateUI() {
    scoreEl.textContent = `スコア: ${score}`;
    livesEl.textContent = `ライフ: ${lives} / ${INITIAL_LIVES}`;
    timerEl.textContent = `残り時間: ${timeLeft}`;
}
function endGame(message) {
    isGameOver = true;
    gameActive = false;
    clearTimeout(groundEnemySpawnTimer); clearTimeout(flyingEnemySpawnTimer); clearTimeout(defenseItemSpawnTimer); clearTimeout(attackItemSpawnTimer); clearTimeout(recoveryItemSpawnTimer); clearInterval(gameTimer);
    gameOverTitleEl.textContent = message; finalScoreEl.textContent = `最終スコア: ${score}`;
    saveScore(score);
    gameOverScreen.style.display = 'flex';
    uiContainer.style.display = 'none';
}

// --- スコア保存・表示関数 ---
function saveScore(scoreToSave) {
    let scores = JSON.parse(localStorage.getItem(SCORES_KEY)) || [];
    const newEntry = { score: scoreToSave, date: new Date().toLocaleString('ja-JP') };
    scores.unshift(newEntry);
    scores = scores.slice(0, 10);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

function displayScores() {
    let scores = JSON.parse(localStorage.getItem(SCORES_KEY)) || [];
    scoreList.innerHTML = '';
    if (scores.length === 0) {
        scoreList.innerHTML = '<li>まだプレイ履歴がありません。</li>';
    } else {
        scores.forEach(entry => {
            const li = document.createElement('li');
            li.innerHTML = `<strong>${entry.score}点</strong> <small>${entry.date}</small>`;
            scoreList.appendChild(li);
        });
    }
    scoreHistoryModal.style.display = 'flex';
}

// --- 描画関数 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scaleFactor, scaleFactor); // ここで描画全体をスケール

    ctx.translate(-worldOffsetX, 0);

    backgroundObjects.forEach(obj => { ctx.fillStyle = '#8B4513'; ctx.fillRect(obj.x, ground.y - obj.trunkHeight, obj.trunkWidth, obj.trunkHeight); ctx.fillStyle = '#228B22'; ctx.beginPath(); const treeTopX = obj.x + (obj.trunkWidth / 2); const treeTopY = ground.y - obj.trunkHeight - obj.leafHeight; ctx.moveTo(treeTopX, treeTopY); ctx.lineTo(treeTopX - obj.leafWidth / 2, ground.y - obj.trunkHeight); ctx.lineTo(treeTopX + obj.leafWidth / 2, ground.y - obj.trunkHeight); ctx.closePath(); ctx.fill(); });
    ctx.fillStyle = ground.color; ctx.fillRect(0, ground.y, canvas.width * 100, canvas.height - ground.y); ctx.fillStyle = '#C2B280'; ctx.fillRect(-10, 0, 10, canvas.height);

    let shouldDrawPlayer = !(player.isInvincible && Math.floor(player.invincibilityTimer / 10) % 2 === 0);
    if (shouldDrawPlayer) {
        ctx.fillStyle = player.color; ctx.beginPath(); ctx.arc(player.x + player.radius, player.y + player.radius, player.radius, 0, Math.PI * 2); ctx.fill();
        if (player.hasShield) { ctx.strokeStyle = 'black'; ctx.lineWidth = 3; ctx.stroke(); }
        if (player.isHealing && Math.floor(player.healingTimer / 10) % 2 !== 0) { ctx.fillStyle = '#32CD32'; ctx.beginPath(); ctx.arc(player.x + player.radius, player.y + player.radius, 6, 0, Math.PI * 2); ctx.fill(); }
        if (player.hasAttack) { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(player.x + player.radius, player.y + player.radius, 5, 0, Math.PI * 2); ctx.fill(); }
    }

    [defenseItem, attackItem, recoveryItem].forEach(item => { if (item.isActive) { ctx.fillStyle = item.color; ctx.beginPath(); ctx.moveTo(item.x + item.width / 2, item.y); ctx.lineTo(item.x, item.y + item.height); ctx.lineTo(item.x + item.width, item.y + item.height); ctx.closePath(); ctx.fill(); } });
    playerBullets.forEach(bullet => { ctx.fillStyle = bullet.color; ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height); });
    enemyBullets.forEach(bullet => { ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill(); });
    enemies.forEach(enemy => { ctx.fillStyle = enemy.color; ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height); });
    
    ctx.restore(); // スケールを元に戻す
}

function handlePlayerDamage() {
    if (player.isInvincible) return;

    if (player.hasShield) {
        player.hasShield = false;
        defenseItemSpawnTimer = setTimeout(() => scheduleNextItem(defenseItem), 10000 + Math.random() * 5000);
    } else {
        lives--;
        if (player.hasAttack) {
            player.hasAttack = false;
            attackItemSpawnTimer = setTimeout(() => scheduleNextItem(attackItem), 10000 + Math.random() * 5000);
        }
        if (lives <= 2 && !recoveryItem.isActive) {
            clearTimeout(recoveryItemSpawnTimer);
            recoveryItemSpawnTimer = setTimeout(() => scheduleNextItem(recoveryItem), 3000);
        }
        if (lives <= 0) { lives = 0; endGame("ゲームオーバー"); }
    }
    player.isInvincible = true;
    player.invincibilityTimer = INVINCIBILITY_DURATION;
    updateUI();
}

// --- 更新関数 ---
function update() {
    if (isGameOver) return;
    
    if (player.isInvincible) { if (--player.invincibilityTimer <= 0) player.isInvincible = false; }
    if (player.isHealing) { if (--player.healingTimer <= 0) player.isHealing = false; }

    [defenseItem, attackItem, recoveryItem].forEach(item => { if (item.isActive) { if (--item.lifeTimer <= 0) { item.isActive = false; const nextTimer = setTimeout(() => scheduleNextItem(item), 5000 + Math.random() * 5000); if (item.type === 'defense') defenseItemSpawnTimer = nextTimer; else if (item.type === 'attack') attackItemSpawnTimer = nextTimer; else recoveryItemSpawnTimer = nextTimer; }
        // 衝突判定はスケールを考慮した値で比較
        if (player.x < item.x + item.width && player.x + player.width > item.x && player.y < item.y + item.height && player.y + player.height > item.y) {
            if (item.type === 'defense') player.hasShield = true;
            if (item.type === 'attack') player.hasAttack = true;
            if (item.type === 'recovery') { if(lives < INITIAL_LIVES) lives++; player.isHealing = true; player.healingTimer = HEALING_EFFECT_DURATION; updateUI(); }
            item.isActive = false;
        }
    } });

    if (keys.KeyA && player.hasAttack) { createPlayerBullet(); keys.KeyA = false; }
    
    for (let i = playerBullets.length - 1; i >= 0; i--) { playerBullets[i].x += BULLET_SPEED / scaleFactor; if (playerBullets[i].x > worldOffsetX / scaleFactor + canvas.width / scaleFactor) playerBullets.splice(i, 1); }
    for (let i = enemyBullets.length - 1; i >= 0; i--) { const bullet = enemyBullets[i]; bullet.x += bullet.dx; bullet.y += bullet.dy; if (bullet.x < worldOffsetX / scaleFactor - bullet.radius || bullet.x > worldOffsetX / scaleFactor + canvas.width / scaleFactor + bullet.radius || bullet.y < -bullet.radius || bullet.y > canvas.height / scaleFactor + bullet.radius) { enemyBullets.splice(i, 1); } }

    if (player.onGround) { if (keys.ArrowRight) player.dx = PLAYER_SPEED / scaleFactor; else if (keys.ArrowLeft) player.dx = -PLAYER_SPEED / scaleFactor; else player.dx = 0; } else { if (keys.ArrowRight) player.dx = PLAYER_SPEED / scaleFactor; else if (keys.ArrowLeft) player.dx = -PLAYER_SPEED / scaleFactor; }
    if (keys.Space && player.onGround) { player.dy = -JUMP_FORCE / scaleFactor; player.onGround = false; }
    player.x += player.dx; player.dy += GRAVITY / scaleFactor; player.y += player.dy; player.onGround = false;
    if (player.x < 0) player.x = 0;
    if (player.y + player.height >= ground.y / scaleFactor) { player.y = ground.y / scaleFactor - player.height; player.dy = 0; player.onGround = true; }
    
    // worldOffsetX も scaleFactor で調整
    const deadZoneLeft = worldOffsetX / scaleFactor + (canvas.width / scaleFactor) * 0.4;
    const deadZoneRight = worldOffsetX / scaleFactor + (canvas.width / scaleFactor) * 0.6;
    if (player.x < deadZoneLeft) worldOffsetX = player.x * scaleFactor - ORIGINAL_CANVAS_WIDTH * 0.4;
    else if (player.x > deadZoneRight) worldOffsetX = player.x * scaleFactor - ORIGINAL_CANVAS_WIDTH * 0.6;
    if (worldOffsetX < 0) worldOffsetX = 0;


    // --- 衝突判定 ---
    for (let i = playerBullets.length - 1; i >= 0; i--) { for (let j = enemies.length - 1; j >= 0; j--) { const bullet = playerBullets[i]; const enemy = enemies[j]; if (bullet && enemy && bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) { score += (enemy.type === 'ground') ? 1 : 2; enemies.splice(j, 1); playerBullets.splice(i, 1); updateUI(); break; } } }
    for (let i = enemyBullets.length - 1; i >= 0; i--) { const bullet = enemyBullets[i]; const dx = (player.x + player.radius) - bullet.x; const dy = (player.y + player.radius) - bullet.y; const distance = Math.sqrt(dx * dx + dy * dy); if (distance < player.radius + bullet.radius) { handlePlayerDamage(); enemyBullets.splice(i, 1); } }
    
    enemies.forEach((enemy, index) => {
        enemy.x -= enemy.speed;
        if (enemy.type === 'flying') { enemy.shootCooldown--; if (enemy.shootCooldown <= 0 && player.x < enemy.x && Math.abs(player.x - enemy.x) < (canvas.width / scaleFactor) * 0.8) { createEnemyBullet(enemy); enemy.shootCooldown = 120; } }
        
        // 敵とプレイヤーの衝突判定もスケールを考慮
        if ( player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y ) {
            if (player.dy > 0 && (player.y + player.height) < (enemy.y + 20 / scaleFactor)) { // 踏みつけ判定
                score += (enemy.type === 'ground') ? 1 : 2; enemies.splice(index, 1); player.dy = -6 / scaleFactor; updateUI();
            } else { handlePlayerDamage(); }
        }
        if (enemy.x + enemy.width < worldOffsetX / scaleFactor - (canvas.width / scaleFactor)) { enemies.splice(index, 1); }
    });
}

function gameLoop() {
    if (!gameActive) {
        gameLoop.isRunning = false;
        return;
    }
    gameLoop.isRunning = true;
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
gameLoop.isRunning = false;

function initialDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scaleFactor, scaleFactor); // 初期描画にもスケールを適用
    ctx.fillStyle = ground.color;
    ctx.fillRect(0, ground.y, canvas.width, canvas.height - ground.y);
    ctx.restore();
}
initialDraw();
