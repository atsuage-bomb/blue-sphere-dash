// script.js

console.log("script.jsが読み込まれ、実行されています！");

// --- 初期設定 ---
// const 宣言ではなく、var に変更します。これまでのエラー回避策として維持します。
var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var uiContainer = document.getElementById('ui-container');
var scoreEl = document.getElementById('score');
var livesEl = document.getElementById('lives');
var timerEl = document.getElementById('timer');
var startScreen = document.getElementById('start-screen');
var startMessageEl = document.getElementById('start-message'); // このメッセージは使わなくなるが要素は残っている
var gameOverScreen = document.getElementById('game-over-screen');
var gameOverTitleEl = document.getElementById('game-over-title');
var finalScoreEl = document.getElementById('final-score');
var restartButton = document.getElementById('restart-button');
var scoreHistoryButton = document.getElementById('score-history-button');
var scoreHistoryModal = document.getElementById('score-history-modal');
var scoreList = document.getElementById('score-list');
var closeButton = document.querySelector('.close-button');

// 新しいスタートボタンの要素を取得
var startPcButton = document.getElementById('start-pc');
var startMobileButton = document.getElementById('start-mobile');

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


// Canvasの元のサイズを定数として保持 (PC版の基準サイズ)
const PC_CANVAS_WIDTH = 800;
const PC_CANVAS_HEIGHT = 400;
// スマホ版の基準サイズ
const MOBILE_CANVAS_WIDTH = 400;
const MOBILE_CANVAS_HEIGHT = 200; // 高さもPC版の半分に

// 現在のCanvasの基準サイズを格納する変数
var CURRENT_CANVAS_WIDTH;
var CURRENT_CANVAS_HEIGHT;

// --- ゲームの定数（動的に設定される） ---
var GRAVITY;
var JUMP_FORCE;
var PLAYER_SPEED;
var BULLET_SPEED;
var ENEMY_BULLET_SPEED;
// ゲームオブジェクトのサイズも変数化し、初期化時に設定
var PLAYER_WIDTH;
var PLAYER_HEIGHT;
var PLAYER_RADIUS;
var ENEMY_WIDTH;
var ENEMY_HEIGHT;
var ITEM_WIDTH;
var ITEM_HEIGHT;
var BULLET_WIDTH;
var BULLET_HEIGHT;
var ENEMY_BULLET_RADIUS;

// 他の定数はそのまま
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
// scaleFactor は物理パラメータ調整のための比率になります（PC版は1、スマホ版は0.5）
var scaleFactor = 1;

// 地面のY座標は、その時点の CURRENT_CANVAS_HEIGHT から計算するように変更
var ground;

// --- オブジェクト生成関数 ---
function createPlayer() { return { 
    x: CURRENT_CANVAS_WIDTH / 2,
    y: ground.y - PLAYER_HEIGHT,
    width: PLAYER_WIDTH, height: PLAYER_HEIGHT, radius: PLAYER_RADIUS,
    dx: 0, dy: 0, onGround: false, color: '#007BFF', isInvincible: false, invincibilityTimer: 0, hasShield: false, hasAttack: false, isHealing: false, healingTimer: 0 
}; }
function createEnemy(type) { return { 
    type: type, 
    x: worldOffsetX + CURRENT_CANVAS_WIDTH + Math.random() * 200, // 敵の初期X座標はCURRENT_CANVAS_WIDTH基準
    y: type === 'ground' ? ground.y - ENEMY_HEIGHT : Math.random() * (ground.y - (200 * scaleFactor)) + (50 * scaleFactor), // Y座標もCURRENT_CANVAS_HEIGHT基準に調整
    width: ENEMY_WIDTH, height: ENEMY_HEIGHT, color: type === 'ground' ? '#DC3545' : 'black', 
    speed: type === 'ground' ? PLAYER_SPEED * 0.6 : PLAYER_SPEED * (Math.random() * 0.4 + 0.2), // プレイヤー速度基準で調整
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
    if (e.code === 'Space' || e.code === 'ArrowLeft' || e.code === 'ArrowRight' || e.code === 'KeyA' || e.code === 'Enter') {
        e.preventDefault();
    }
    if (keys.hasOwnProperty(e.code)) { keys[e.code] = true; }
    if (e.code === 'Enter' && !gameActive) { 
        // Enterキーが押された場合、画面幅でモードを自動判別して開始
        startGame(window.innerWidth > 820 ? 'pc' : 'mobile'); 
    }
});
window.addEventListener('keyup', (e) => { 
    if (keys.hasOwnProperty(e.code)) { keys[e.code] = false; }
});

// リスタートボタンも現在の画面幅でモードを自動判別して開始
restartButton.addEventListener('click', () => startGame(window.innerWidth > 820 ? 'pc' : 'mobile'));
scoreHistoryButton.addEventListener('click', displayScores);
closeButton.addEventListener('click', () => { scoreHistoryModal.style.display = 'none'; });
scoreHistoryModal.addEventListener('click', (e) => { if (e.target === scoreHistoryModal) { scoreHistoryModal.style.display = 'none'; } });

// 新しいスタートボタンのイベントリスナー
startPcButton.addEventListener('click', () => startGame('pc'));
startPcButton.addEventListener('touchstart', (e) => { e.preventDefault(); startGame('pc'); });

startMobileButton.addEventListener('click', () => startGame('mobile'));
startMobileButton.addEventListener('touchstart', (e) => { e.preventDefault(); startGame('mobile'); });


// モバイル操作ボタンのイベントリスナー
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
    if (window.innerWidth <= 820) {
        desktopControlsInfo.style.display = 'none';
        desktopJumpInfo.style.display = 'none';
        desktopAttackInfo.style.display = 'none';
        mobileControlsInfo.style.display = 'block';
    } else {
        desktopControlsInfo.style.display = 'list-item';
        desktopJumpInfo.style.display = 'list-item';
        desktopAttackInfo.style.display = 'list-item';
        mobileControlsInfo.style.display = 'none';
    }
}

window.addEventListener('resize', resizeGame);
resizeGame(); // 初回ロード時にも実行

// startGame関数をプレイモード選択に対応させる
function startGame(mode) {
    if (mode === 'pc') {
        CURRENT_CANVAS_WIDTH = PC_CANVAS_WIDTH;
        CURRENT_CANVAS_HEIGHT = PC_CANVAS_HEIGHT;
        scaleFactor = 1; // PC版は物理パラメータを基準値そのまま使う (PC_CANVAS_WIDTH / PC_CANVAS_WIDTH)
    } else { // mobile
        CURRENT_CANVAS_WIDTH = MOBILE_CANVAS_WIDTH;
        CURRENT_CANVAS_HEIGHT = MOBILE_CANVAS_HEIGHT;
        scaleFactor = MOBILE_CANVAS_WIDTH / PC_CANVAS_WIDTH; // スマホ版はPC版に対する解像度比率
    }

    // Canvasの内部解像度を動的に変更
    canvas.width = CURRENT_CANVAS_WIDTH;
    canvas.height = CURRENT_CANVAS_HEIGHT;

    // 物理パラメータを現在の scaleFactor に基づいて設定
    GRAVITY = 0.5 * scaleFactor;
    JUMP_FORCE = 12 * scaleFactor;
    PLAYER_SPEED = 5 * scaleFactor;
    BULLET_SPEED = 10 * scaleFactor;
    ENEMY_BULLET_SPEED = 5 * scaleFactor;

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
    // ゲームオブジェクトのサイズを現在のscaleFactorに基づいて設定
    PLAYER_WIDTH = 30 * scaleFactor;
    PLAYER_HEIGHT = 30 * scaleFactor;
    PLAYER_RADIUS = 15 * scaleFactor;
    ENEMY_WIDTH = 30 * scaleFactor;
    ENEMY_HEIGHT = 30 * scaleFactor;
    ITEM_WIDTH = 30 * scaleFactor;
    ITEM_HEIGHT = 30 * scaleFactor;
    BULLET_WIDTH = 25 * scaleFactor;
    BULLET_HEIGHT = 5 * scaleFactor;
    ENEMY_BULLET_RADIUS = 5 * scaleFactor;

    // ground オブジェクトのy座標をここで設定（現在のCanvas高さに基づいて）
    ground = { y: CURRENT_CANVAS_HEIGHT - 40 * scaleFactor, color: '#28A745' }; // ground.yもscaleFactorで調整

    player = createPlayer();
    enemies = []; playerBullets = []; enemyBullets = [];
    defenseItem = createItem('defense'); attackItem = createItem('attack'); recoveryItem = createItem('recovery');
    backgroundObjects = [];
    score = 0; lives = INITIAL_LIVES; timeLeft = GAME_DURATION; isGameOver = false;
    worldOffsetX = player.x - (CURRENT_CANVAS_WIDTH / 2); // worldOffsetXも現在のCanvas幅に基づいて計算

    for (var i = 0; i < 30; i++) { 
        backgroundObjects.push({ 
            x: i * (Math.random() * 150 + 250) * scaleFactor, // 背景オブジェクトも scaleFactor で調整
            trunkWidth: 20 * scaleFactor,
            trunkHeight: 40 * scaleFactor,
            leafWidth: 80 * scaleFactor,
            leafHeight: 80 * scaleFactor
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
    item.x = player.x + 100 * scaleFactor + Math.random() * (CURRENT_CANVAS_WIDTH / 2); // 調整
    item.y = ground.y - item.height - (Math.random() * 80 * scaleFactor + 50 * scaleFactor); // 調整
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
    // Canvasの実際の解像度が CURRENT_CANVAS_WIDTH/HEIGHT に設定されているため、
    // ctx.clearRect はそのままの幅と高さでOK
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // ctx.scale は削除し、全て CURRENT_CANVAS_WIDTH/HEIGHT 基準で直接描画
    ctx.translate(-worldOffsetX, 0); // worldOffsetXは CURRENT_CANVAS_WIDTH基準のワールド座標

    backgroundObjects.forEach(obj => {
        ctx.fillStyle = '#8B4513'; ctx.fillRect(obj.x, ground.y - obj.trunkHeight, obj.trunkWidth, obj.trunkHeight);
        ctx.fillStyle = '#228B22'; ctx.beginPath();
        var treeTopX = obj.x + (obj.trunkWidth / 2); var treeTopY = ground.y - obj.trunkHeight - obj.leafHeight;
        ctx.moveTo(treeTopX, treeTopY); ctx.lineTo(treeTopX - obj.leafWidth / 2, ground.y - obj.trunkHeight); ctx.lineTo(treeTopX + obj.leafWidth / 2, ground.y - obj.trunkHeight); ctx.closePath(); ctx.fill();
    });
    
    ctx.fillStyle = ground.color;
    // 地面は常に CURRENT_CANVAS_HEIGHT を基準に描画
    ctx.fillRect(0, ground.y, CURRENT_CANVAS_WIDTH * 100, CURRENT_CANVAS_HEIGHT - ground.y);
    
    ctx.fillStyle = '#C2B280'; ctx.fillRect(-10, 0, 10, CURRENT_CANVAS_HEIGHT);

    var shouldDrawPlayer = !(player.isInvincible && Math.floor(player.invincibilityTimer / 10) % 2 === 0);
    if (shouldDrawPlayer) {
        ctx.fillStyle = player.color; ctx.beginPath(); ctx.arc(player.x + player.radius, player.y + player.radius, player.radius, 0, Math.PI * 2); ctx.fill();
        // シールドの線幅は、現在のCanvas解像度に対してPC版の比率を考慮して調整
        if (player.hasShield) { ctx.strokeStyle = 'black'; ctx.lineWidth = 3 * (PC_CANVAS_WIDTH / CURRENT_CANVAS_WIDTH); ctx.stroke(); }
        // Healing/Attack エフェクトのサイズも scaleFactor で調整
        if (player.isHealing && Math.floor(player.healingTimer / 10) % 2 !== 0) { ctx.fillStyle = '#32CD32'; ctx.beginPath(); ctx.arc(player.x + player.radius, player.y + player.radius, 6 * scaleFactor, 0, Math.PI * 2); ctx.fill(); }
        if (player.hasAttack) { ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(player.x + player.radius, player.y + player.radius, 5 * scaleFactor, 0, Math.PI * 2); ctx.fill(); }
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

    var items = [defenseItem, attackItem, recoveryItem]; // ここを修正
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
                else if (item.type === 'attack') player.hasAttack = true;
                else if (item.type === 'recovery') { if (lives < INITIAL_LIVES) lives++; player.isHealing = true; player.healingTimer = HEALING_EFFECT_DURATION; updateUI(); }
                item.isActive = false;
            }
        }
    });

    if (keys.KeyA && player.hasAttack) { createPlayerBullet(); keys.KeyA = false; }
    
    for (var i = playerBullets.length - 1; i >= 0; i--) { playerBullets[i].x += BULLET_SPEED; if (playerBullets[i].x > worldOffsetX + CURRENT_CANVAS_WIDTH) playerBullets.splice(i, 1); }
    for (var i = enemyBullets.length - 1; i >= 0; i--) { var bullet = enemyBullets[i]; bullet.x += bullet.dx; bullet.y += bullet.dy; if (bullet.x < worldOffsetX - bullet.radius || bullet.x > worldOffsetX + CURRENT_CANVAS_WIDTH + bullet.radius || bullet.y < -bullet.radius || bullet.y > CURRENT_CANVAS_HEIGHT + bullet.radius) { enemyBullets.splice(i, 1); } }

    if (player.onGround) { if (keys.ArrowRight) player.dx = PLAYER_SPEED; else if (keys.ArrowLeft) player.dx = -PLAYER_SPEED; else player.dx = 0; } else { if (keys.ArrowRight) player.dx = PLAYER_SPEED; else if (keys.ArrowLeft) player.dx = -PLAYER_SPEED; }
    if (keys.Space && player.onGround) { player.dy = -JUMP_FORCE; player.onGround = false; }
    player.x += player.dx; player.dy += GRAVITY; player.y += player.dy; player.onGround = false;
    if (player.x < 0) player.x = 0;
    if (player.y + player.height >= ground.y) { player.y = ground.y - player.height; player.dy = 0; player.onGround = true; }
    
    var deadZoneLeft = worldOffsetX + CURRENT_CANVAS_WIDTH * 0.4;
    var deadZoneRight = worldOffsetX + CURRENT_CANVAS_WIDTH * 0.6;
    if (player.x < deadZoneLeft) worldOffsetX = player.x - CURRENT_CANVAS_WIDTH * 0.4;
    else if (player.x > deadZoneRight) worldOffsetX = player.x - CURRENT_CANVAS_WIDTH * 0.6;
    if (worldOffsetX < 0) worldOffsetX = 0;

    for (var i = playerBullets.length - 1; i >= 0; i--) { for (var j = enemies.length - 1; j >= 0; j--) { var bullet = playerBullets[i]; var enemy = enemies[j]; if (bullet && enemy && bullet.x < enemy.x + enemy.width && bullet.x + bullet.width > enemy.x && bullet.y < enemy.y + enemy.height && bullet.y + bullet.height > enemy.y) { score += (enemy.type === 'ground') ? 1 : 2; enemies.splice(j, 1); playerBullets.splice(i, 1); updateUI(); break; } } }
    for (var i = enemyBullets.length - 1; i >= 0; i--) { var bullet = enemyBullets[i]; var dx = (player.x + player.radius) - bullet.x; var dy = (player.y + player.radius) - bullet.y; var distance = Math.sqrt(dx * dx + dy * dy); if (distance < player.radius + bullet.radius) { handlePlayerDamage(); enemyBullets.splice(i, 1); } }
    
    enemies.forEach((enemy, index) => {
        enemy.x -= enemy.speed;
        if (enemy.type === 'flying') { enemy.shootCooldown--; if (enemy.shootCooldown <= 0 && player.x < enemy.x && Math.abs(player.x - enemy.x) < CURRENT_CANVAS_WIDTH * 0.8) { createEnemyBullet(enemy); enemy.shootCooldown = 120; } }
        
        if ( player.x < enemy.x + enemy.width && player.x + player.width > enemy.x && player.y < enemy.y + enemy.height && player.y + player.height > enemy.y ) {
            if (player.dy > 0 && (player.y + player.height) < (enemy.y + 20 * scaleFactor)) { // 踏みつけ判定も scaleFactor で調整
                score += (enemy.type === 'ground') ? 1 : 2; enemies.splice(index, 1); player.dy = -6 * scaleFactor; updateUI(); // ジャンプ力も scaleFactor で調整
            } else { handlePlayerDamage(); }
        }
        if (enemy.x + enemy.width < worldOffsetX - CURRENT_CANVAS_WIDTH) { enemies.splice(index, 1); }
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
    // initialDrawはstartGame()が呼ばれる前に行われるので、CanvasのサイズはまだPC_CANVAS_WIDTH/HEIGHT
    // ここで何か描画しても、startGame()でCanvasのサイズが変わるとリセットされるため、
    // 基本的には透明な状態を維持するだけで良い
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
// initialDraw()はresizeGame()から呼ばれるので、ここでの直接呼び出しは削除
// resizeGame() はページロード時に一度呼ばれます。
