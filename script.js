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

// スタート画面のどこかをクリック/タップでゲームスタート (ボタンは不要になったため)
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
