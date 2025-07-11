// script.js

// --- 初期設定 ---
// var で宣言を統一
var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var uiContainer = document.getElementById('ui-container');
var scoreEl = document.getElementById('score');
var livesEl = document.getElementById('lives');
var timerEl = document.getElementById('timer');
var startScreen = document.getElementById('start-screen');
var startMessageEl = document.getElementById('start-message'); 
var gameOverScreen = document.getElementById('game-over-screen');
var gameOverTitleEl = document.getElementById('game-over-title');
var finalScoreEl = document.getElementById('final-score');
var restartButton = document.getElementById('restart-button');
var scoreHistoryButton = document.getElementById('score-history-button');
var scoreHistoryModal = document.getElementById('score-history-modal');
var scoreList = document.getElementById('score-list');
var closeButton = document.querySelector('.close-button');

// モバイル操作ボタンの要素を取得
var jumpButton = document.getElementById('jump-button');
var leftButton = document.getElementById('left-button');
var rightButton = document.getElementById('right-button');
var attackButton = document.getElementById('attack-button');
// 操作説明の表示切り替え用
var desktopControlsInfo = document.getElementById('desktop-controls');
var desktopJumpInfo = document.getElementById('desktop-jump');
var desktopAttackInfo = document.getElementById('desktop-attack');
var mobileControlsInfo = document.getElementById('mobile-controls-info'); 

// Canvasの基準サイズをPC版に固定
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;

// Canvasの属性を設定 (常にPC版の解像度にする)
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- ゲームの定数（固定値に戻す） ---
var GRAVITY = 0.5;
var JUMP_FORCE = 12;
var PLAYER_SPEED = 5;
var BULLET_SPEED = 10;
var ENEMY_BULLET_SPEED = 5;

// ゲームオブジェクトのサイズも固定値に戻す
var PLAYER_WIDTH = 30;
var PLAYER_HEIGHT = 30;
var PLAYER_RADIUS = 15;
var ENEMY_WIDTH = 30;
var ENEMY_HEIGHT = 30;
var ITEM_WIDTH = 30;
var ITEM_HEIGHT = 30;
var BULLET_WIDTH = 25;
var BULLET_HEIGHT = 5;
var ENEMY_BULLET_RADIUS = 5;


var MAX_GROUND_ENEMIES = 3;
var MAX_FLYING_ENEMIES = 2;
var INITIAL_LIVES = 3;
var GAME_DURATION = 60;
var INVINCIBILITY_DURATION = 120;
var ITEM_LIFESPAN = 300;
var HEALING_EFFECT_DURATION = 120;
var SCORES_KEY = 'blueSphereDashScores';

// --- ゲームの状態変数 ---
var player, enemies, playerBullets, enemyBullets, defenseItem, attackItem, recoveryItem, score, lives, timeLeft;
var gameTimer, groundEnemySpawnTimer, flyingEnemySpawnTimer, defenseItemSpawnTimer, attackItemSpawnTimer, recoveryItemSpawnTimer;
var worldOffsetX, keys, isGameOver, gameActive = false;
var backgroundObjects;

// 地面のY座標も固定値に戻す
var ground = { y: CANVAS_HEIGHT - 40, color: '#28A745' };

// --- オブジェクト生成関数 ---
function createPlayer() { return { 
    x: CANVAS_WIDTH / 2,
    y: ground.y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH, height: PLAYER_HEIGHT, radius: PLAYER_RADIUS,
    dx: 0, dy: 0, onGround: false, color: '#007BFF', isInvincible: false, invincibilityTimer: 0, hasShield: false, hasAttack: false, isHealing: false, healingTimer: 0 
}; }
function createEnemy(type) { return { 
    type: type, 
    x: worldOffsetX + CANVAS_WIDTH + Math.random() * 200,
    y: type === 'ground' ? ground.y - ENEMY_HEIGHT : Math.random() * (ground.y - 200) + 50,
    width: ENEMY_WIDTH, height: ENEMY_HEIGHT, color: type === 'ground' ? '#DC3545' : 'black', 
    speed: type === 'ground' ? PLAYER_SPEED * 0.6 : PLAYER_SPEED * (Math.random() * 0.4 + 0.2),
    shootCooldown: 120 
}; }
function createItem(type) { return { 
    type: type, x: 0, y: 0, 
    width: ITEM_WIDTH, height: ITEM_HEIGHT,
    color: type === 'defense' ? '#8A2BE2' : (type === 'attack' ? '#FFD700' : '#32CD32'), isActive: false, lifeTimer: 0 
}; }
function createPlayerBullet() { playerBullets.push({ 
    x: player.x + player.radius, y: player.y + player.radius, 
    width: BULLET_WIDTH, height: BULLET_HEIGHT, color: 'white'
}); }
function createEnemyBullet(enemy) { 
    var angle = Math.atan2((player.y + player.radius) - (enemy.y + enemy.height / 2), (player.x + player.radius) - (enemy.x + enemy.width / 2)); 
    enemyBullets.push({ 
        x: enemy.x, y: enemy.y + enemy.height / 2, 
        radius: ENEMY_BULLET_RADIUS, color: 'red',
        dx: Math.cos(angle) * ENEMY_BULLET_SPEED, dy: Math.sin(angle) * ENEMY_BULLET_SPEED
    }); 
}

var keys = { ArrowRight: false, ArrowLeft: false, Space: false, KeyA: false };

// --- イベントリスナー ---
window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA') {
        e.preventDefault();
    }
    if (keys.hasOwnProperty(e.code)) { keys[e.code] = true; }
    // Enterキーでもゲームスタート
    if (e.code === 'Enter' && !gameActive) { 
        startGame(); 
    }
});
window.addEventListener('keyup', (e) => { 
    if (keys.hasOwnProperty(e.code)) { keys[e.code] = false; }
});

restartButton.addEventListener('click', startGame);
scoreHistoryButton.addEventListener('click', displayScores);
closeButton.addEventListener('click', () => { scoreHistoryModal.style.display = 'none'; });
scoreHistoryModal.addEventListener('click', (e) => { if (e.target === scoreHistoryModal) { scoreHistoryModal.style.display = 'none'; } });

// スタート画面のどこかをクリック/タップでゲームスタート
startScreen.addEventListener('click', (e) => {
    // ターゲットがモーダル内要素でない場合のみ処理 (スコア履歴モーダルとの干渉防止)
    if (!gameActive && !scoreHistoryModal.contains(e.target)) {
        startGame();
    }
}, {capture: true, passive: false}); // capture:true を追加してイベントを確実に捕捉

startScreen.addEventListener('touchstart', (e) => {
    // ターゲットがモーダル内要素でない場合のみ処理
    if (!gameActive && !scoreHistoryModal.contains(e.target)) {
        e.preventDefault(); // タッチ操作によるスクロール等を防止
        startGame();
    }
}, {capture: true, passive: false}); // capture:true を追加してイベントを確実に捕捉


// モバイル操作ボタンのイベントリスナー (変更なし)
jumpButton.addEventListener('touchstart', (e) => { e.preventDefault(); keys.Space = true; });
jumpButton.addEventListener('touchend', (e) => { e.preventDefault(); keys.Space = false; });
jumpButton.addEventListener('mousedown', (e) => { e.preventDefault(); keys.Space = true; });
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
// この関数はCanvasの属性を変更しなくなります。CSSで対応済みのため。
// 操作説明の表示/非表示のみ行います。
function resizeGame() {
    var mobileControlsInfoElement = document.getElementById('mobile-controls-info');
    if (mobileControlsInfoElement) { // 要素が存在する場合のみ処理
        if (window.innerWidth <= 820) {
            desktopControlsInfo.style.display = 'none';
            desktopJumpInfo.style.display = 'none';
            desktopAttackInfo.style.display = 'none';
            mobileControlsInfoElement.style.display = 'block';
        } else {
            desktopControlsInfo.style.display = 'list-item';
            desktopJumpInfo.style.display = 'list-item';
            desktopAttackInfo.style.display = 'list-item';
            mobileControlsInfoElement.style.display = 'none';
        }
    }
}

window.addEventListener('resize', resizeGame);
resizeGame(); // 初回ロード時にも実行

// startGame関数はモード選択なしで直接ゲームを開始する
function startGame() {
    gameActive = true;
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    init(); // ゲーム初期化
    if (!gameLoop.isRunning) {
        gameLoop();
    }
}

// --- ゲーム初期化 ---
function init() {
    player = createPlayer();
    enemies = []; playerBullets = []; enemyBullets = [];
    defenseItem = createItem('defense'); attackItem = createItem('attack'); recoveryItem = createItem('recovery');
    backgroundObjects = [];
    score = 0; lives = INITIAL_LIVES; timeLeft = GAME_DURATION; isGameOver = false;
    worldOffsetX = player.x - (CANVAS_WIDTH / 2); // worldOffsetXも固定のCanvas幅に基づいて計算

    for (var i = 0; i < 30; i++) { 
        backgroundObjects.push({ 
            x: i * (Math.random() * 150 + 250), // 固定値で調整
            trunkWidth: 20,
            trunkHeight: 40,
            leafWidth: 80,
            leafHeight: 80
        }); 
    }
    
    updateUI();
    uiContainer.style.display = 'block';

    clearInterval(gameTimer); clearTimeout(groundEnemySpawnTimer); clearTimeout(flyingEnemySpawnTimer); clearTimeout(defenseItemSpawnTimer); clearTimeout(attackItemSpawnTimer); clearTimeout(recoveryItemSpawnTimer);

    gameTimer = setInterval(() => { if(isGameOver) return; timeLeft--; if (timeLeft <= 0) { timeLeft = 0; endGame("ゲームクリア"); } updateUI(); }, 1000);
    
    function scheduleNextGroundEnemy() { if (isGameOver) return; spawnEnemy('ground'); groundEnemySpawnTimer = setTimeout(scheduleNextGroundEnemy, 2000 + Math.random() * 2000); }
    function scheduleNextFlyingEnemy() { if (isGameOver) return; spawnEnemy('flying'); flyingEnemySpawnTimer = setTimeout(scheduleNextFlyingEnemy, 3000 + Math.random() * 3000); }
    scheduleNextGroundEnemy(); scheduleNextFlyingEnemy();
    
    defenseItemSpawnTimer = setTimeout(() => scheduleNextItem(defenseItem), 10000);
    attackItemSpawnTimer = setTimeout(() => scheduleNextItem(attackItem), 15000);
}

// --- アイテム & 敵の出現制御 ---
function scheduleNextItem(item) { if (isGameOver) return; spawnItem(item); }
function spawnItem(item) {
    if (isGameOver || item.isActive) return;
    if (item.type === 'defense' && player.hasShield) return;
    if (item.type === 'attack' && player.hasAttack) return;
    if (item.type === 'recovery' && lives > 2) return;
    item.isActive = true; item.lifeTimer = ITEM_LIFESPAN;
    item.x = player.x + 100 + Math.random() * (CANVAS_WIDTH / 2); // CANVAS_WIDTH 基準
    item.y = ground.y - item.height - (Math.random() * 80 + 50); // 固定値で調整
}
function spawnEnemy(type) { if (isGameOver) return; var currentEnemies = enemies.filter(e => e.type === type); var maxEnemies = type === 'ground' ? MAX_GROUND_ENEMIES : MAX_FLYING_ENEMIES; if (currentEnemies.length < maxEnemies) { enemies.push(createEnemy(type)); } }

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
    var scores = JSON.parse(localStorage.getItem(SCORES_KEY)) || [];
    var newEntry = { score: scoreToSave, date: new Date().toLocaleString('ja-JP') };
    scores.unshift(newEntry);
    scores = scores.slice(0, 10);
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores));
}

function displayScores() {
    var scores = JSON.parse(localStorage.getItem(SCORES_KEY)) || [];
    scoreList.innerHTML = '';
    if (scores.length === 0) {
        scoreList.innerHTML = '<li>まだプレイ履歴がありません。</li>';
    } else {
        scores.forEach(entry => {
            var li = document.createElement('li');
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
    
    ctx.translate(-worldOffsetX, 0); 

    backgroundObjects.forEach(obj => {
        ctx.fillStyle = '#8B4513'; ctx.fillRect(obj.x, ground.y - obj.trunkHeight, obj.trunkWidth, obj.trunkHeight);
        ctx.fillStyle = '#228B22'; ctx.beginPath();
        var treeTopX = obj.x + (obj.trunkWidth / 2); var treeTopY = ground.y - obj.trunkHeight - obj.leafHeight;
        ctx.moveTo(treeTopX, treeTopY); ctx.lineTo(treeTopX - obj.leafWidth / 2, ground.y - obj.trunkHeight); ctx.lineTo(treeTopX + obj.leafWidth / 2, ground.y - obj.trunkHeight); ctx.closePath(); ctx.fill();
    });
    
    ctx.fillStyle = ground.color;
    ctx.fillRect(0, ground.y, CANVAS_WIDTH * 100, CANVAS_HEIGHT - ground.y);
    
    ctx.fillStyle = '#C2B280'; ctx.fillRect(-10, 0, 10, CANVAS_HEIGHT);

    var shouldDrawPlayer = !(player.isInvincible && Math.floor(player.invincibilityTimer / 10) % 2 === 0);
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
    
    ctx.restore();
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

    var items = [defenseItem, attackItem, recoveryItem];
    items.forEach(item => {
        if (item.isActive) {
            item.lifeTimer--;
            if (item.lifeTimer <= 0) {
                item.isActive = false;
                var nextTimer = setTimeout(() => scheduleNextItem(item), 5000 + Math.random() * 5000);
                if (item.type === 'defense') defenseItemSpawnTimer = nextTimer;
                else if (item.type === 'attack') attackItemSpawnTimer = nextTimer;
                else recoveryItemSpawnTimer = nextTimer;
            }
            if (player.x < item.x + item.width &&
                player.x + player.width > item.x &&
                player.y < item.y + item.height &&
                player.y + player.height > item.y) {
                if (item.type === 'defense') player.hasShield = true;
                if (item.type === 'attack') player.hasAttack = true;
                if (item.type === 'recovery') { if (lives < INITIAL_LIVES) lives++; player.isHealing = true; player.healingTimer = HEALING_EFFECT_DURATION; updateUI(); }
                item.isActive = false;
            }
        }
    });

    if (keys.KeyA && player.hasAttack) { createPlayerBullet(); keys.KeyA = false; }
    
    for (var i = playerBullets.length - 1; i >= 0; i--) { playerBullets[i].x += BULLET_SPEED; if (playerBullets[i].x > worldOffsetX + CANVAS_WIDTH) playerBullets.splice(i, 1); }
    for (var i = enemyBullets.length - 1; i >= 0; i--) { var bullet = enemyBullets[i]; bullet.x += bullet.dx; bullet.y += bullet.dy; if (bullet.x < worldOffsetX - bullet.radius || bullet.x > worldOffsetX + CANVAS_WIDTH + bullet.radius || bullet.y < -bullet.radius || bullet.y > CANVAS_HEIGHT + bullet.radius) { enemyBullets.splice(i, 1); } }

    if (player.onGround) { if (keys.ArrowRight) player.dx = PLAYER_SPEED; else if (keys.ArrowLeft) player.dx = -PLAYER_SPEED; else player.dx = 0; } else { if (keys.ArrowRight) player.dx = PLAYER_SPEED; else if (keys.ArrowLeft) player.dx = -PLAYER_SPEED; }
    if (keys.Space && player.onGround) { player.dy = -JUMP_FORCE; player.onGround = false; }
    player.x += player.dx; player.dy += GRAVITY; player.y += player.dy; player.onGround = false;
    if (player.x < 0) player.x = 0;
    if (player.y + player.height >= ground.y) { player.y = ground.y - player.height; player.dy = 0; player.onGround = true; }
    
    var deadZoneLeft = worldOffsetX + CANVAS_WIDTH * 0.4;
    var deadZoneRight = worldOffsetX + CANVAS_WIDTH * 0.6;
    if (player.x < deadZoneLeft) worldOffsetX = player.x - CANVAS_WIDTH * 0.4;
    else if (player.x > deadZoneRight) worldOffsetX = player.x - CANVAS_WIDTH * 0.6;
    if (worldOffsetX < 0) worldOffsetX = 0;

    for (var i = playerBullets.length - 1; i >= 0; i--) { for (var j = enemies.length - 1; j >= 0; j--) { var bullet = playerBullets[i]; var enemy = enemies[j]; if (bullet && enemy && bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) { score += (enemy.type === 'ground') ? 1 : 2; enemies.splice(j, 1); playerBullets.splice(i, 1); updateUI(); break; } } }
    for (var i = enemyBullets.length - 1; i >= 0; i--) { var bullet = enemyBullets[i]; var dx = (player.x + player.radius) - bullet.x; var dy = (player.y + player.radius) - bullet.y; var distance = Math.sqrt(dx * dx + dy * dy); if (distance < player.radius + bullet.radius) { handlePlayerDamage(); enemyBullets.splice(i, 1); } }
    
    enemies.forEach((enemy, index) => {
        enemy.x -= enemy.speed;
        if (enemy.type === 'flying') { enemy.shootCooldown--; if (enemy.shootCooldown <= 0 && player.x < enemy.x && Math.abs(player.x - enemy.x) < CANVAS_WIDTH * 0.8) { createEnemyBullet(enemy); enemy.shootCooldown = 120; } }
        
        if ( player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y ) {
            if (player.dy > 0 && (player.y + player.height) < (enemy.y + 20)) { // 踏みつけ判定は固定
                score += (enemy.type === 'ground') ? 1 : 2; enemies.splice(index, 1); player.dy = -6; updateUI(); // ジャンプ力も固定
            } else { handlePlayerDamage(); }
        }
        if (enemy.x + enemy.width < worldOffsetX - CANVAS_WIDTH) { enemies.splice(index, 1); }
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

// initialDraw関数は、ゲーム開始前にCanvasに何も描画しないシンプルなものにする
function initialDraw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Canvas全体をクリア
}
// ページロード時に一度だけ呼び出す
initialDraw();
