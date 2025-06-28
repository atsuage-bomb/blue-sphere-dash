// ... (script.js の他の部分はそのまま) ...

// --- 描画関数 ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    
    // 【重要: 修正点】 scaleを先に適用し、その後にtranslateを適用する
    ctx.scale(scaleFactor, scaleFactor); 
    ctx.translate(-worldOffsetX, 0); 
    

    backgroundObjects.forEach(obj => {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(obj.x, ground.y - obj.trunkHeight, obj.trunkWidth, obj.trunkHeight);
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        const treeTopX = obj.x + (obj.trunkWidth / 2);
        const treeTopY = ground.y - obj.trunkHeight - obj.leafHeight;
        ctx.moveTo(treeTopX, treeTopY);
        ctx.lineTo(treeTopX - obj.leafWidth / 2, ground.y - obj.trunkHeight);
        ctx.lineTo(treeTopX + obj.leafWidth / 2, ground.y - obj.trunkHeight);
        ctx.closePath();
        ctx.fill();
    });
    
    // 地面の描画
    ctx.fillStyle = ground.color;
    ctx.fillRect(0, ground.y, ORIGINAL_CANVAS_WIDTH * 100, ORIGINAL_CANVAS_HEIGHT - ground.y);
    
    // 左側の壁（画面外のエリア）
    ctx.fillStyle = '#C2B280';
    ctx.fillRect(-10, 0, 10, ORIGINAL_CANVAS_HEIGHT);

    let shouldDrawPlayer = !(player.isInvincible && Math.floor(player.invincibilityTimer / 10) % 2 === 0);
    if (shouldDrawPlayer) {
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x + player.radius, player.y + player.radius, player.radius, 0, Math.PI * 2);
        ctx.fill();
        if (player.hasShield) {
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 3 / scaleFactor; // 線幅はスケールを考慮
            ctx.stroke();
        }
        if (player.isHealing && Math.floor(player.healingTimer / 10) % 2 !== 0) {
            ctx.fillStyle = '#32CD32';
            ctx.beginPath();
            ctx.arc(player.x + player.radius, player.y + player.radius, 6, 0, Math.PI * 2);
            ctx.fill();
        }
        if (player.hasAttack) {
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(player.x + player.radius, player.y + player.radius, 5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    [defenseItem, attackItem, recoveryItem].forEach(item => {
        if (item.isActive) {
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.moveTo(item.x + item.width / 2, item.y);
            ctx.lineTo(item.x, item.y + item.height);
            ctx.lineTo(item.x + item.width, item.y + item.height);
            ctx.closePath();
            ctx.fill();
        }
    });
    playerBullets.forEach(bullet => { ctx.fillStyle = bullet.color; ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height); });
    enemyBullets.forEach(bullet => { ctx.fillStyle = bullet.color; ctx.beginPath(); ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); ctx.fill(); });
    enemies.forEach(enemy => { ctx.fillStyle = enemy.color; ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height); });
    
    ctx.restore(); // スケールを元に戻す
}

// ... (script.js の他の部分はそのまま) ...
