/**
 * 수직선 디펜스 & 스나이퍼
 * Vanilla JS + HTML5 Canvas
 */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const healthEl = document.getElementById('health');
const btnDefense = document.getElementById('btn-mode-defense');
const btnSniper = document.getElementById('btn-mode-sniper');
const defenseControls = document.getElementById('defense-controls');
const sniperControls = document.getElementById('sniper-controls');
const answerInput = document.getElementById('answer-input');
const sniperAlert = document.getElementById('sniper-alert');
const targetCoordContainer = document.getElementById('target-coord-container');
const globalTimerContainer = document.getElementById('global-timer-container');
const globalTimerBar = document.getElementById('global-timer-bar');
const overlay = document.getElementById('overlay');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameContainer = document.getElementById('game-container');
const gameOverModeInfo = document.getElementById('game-over-mode-info');

const startTitle = document.getElementById('start-title');
const startDesc = document.getElementById('start-desc');
const modeInfoText = document.getElementById('mode-info-text');
const difficultySelector = document.getElementById('difficulty-selector');
const btnEasy = document.getElementById('btn-easy');
const btnNormal = document.getElementById('btn-normal');

// Game State
let gameState = {
    mode: 'defense', // 'defense' or 'sniper'
    sniperDifficulty: 'normal', // 'easy' or 'normal'
    score: 0,
    health: 3,
    isGameOver: false,
    isStarted: false,
    enemies: [],
    projectiles: [],
    particles: [],
    lastEnemySpawnTime: 0,
    spawnInterval: 3000,
    difficulty: 1,
    sniperTarget: { val: 0, display: '0' },
    sniperTimer: 0,
    sniperMaxTime: 5000,
    animationFrameId: null
};

// Constants
const COLORS = {
    primary: '#007bff',
    secondary: '#6c757d',
    danger: '#dc3545',
    success: '#28a745',
    grid: '#f8f9fa',
    text: '#343a40',
    enemy: '#dc3545',
    player: '#007bff'
};

const NUMBER_LINE = {
    min: -10,
    max: 10,
    step: 1,
    subStep: 0.5,
    y: 0,
    padding: 50
};

// Initialize
function init() {
    resize();
    window.addEventListener('resize', resize);
    
    btnDefense.addEventListener('click', () => switchMode('defense'));
    btnSniper.addEventListener('click', () => switchMode('sniper'));
    
    btnEasy.addEventListener('click', () => setDifficulty('easy'));
    btnNormal.addEventListener('click', () => setDifficulty('normal'));

    answerInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleDefenseInput();
        }
    });

    canvas.addEventListener('mousedown', handleCanvasClick);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', showStartScreen);

    updateUI();
}

function setDifficulty(diff) {
    gameState.sniperDifficulty = diff;
    btnEasy.classList.toggle('active', diff === 'easy');
    btnNormal.classList.toggle('active', diff === 'normal');
}

function showStartScreen() {
    overlay.classList.remove('hidden');
    startScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    
    if (gameState.mode === 'defense') {
        startTitle.textContent = '수직선 디펜스';
        modeInfoText.innerHTML = '<strong>모드 1:</strong> 적의 위치를 숫자로 입력하세요.';
        difficultySelector.classList.add('hidden');
    } else {
        startTitle.textContent = '블라인드 스나이퍼';
        modeInfoText.innerHTML = '<strong>모드 2:</strong> 표시된 숫자의 위치를 클릭하세요.';
        difficultySelector.classList.remove('hidden');
    }
}

function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    NUMBER_LINE.y = canvas.height * 0.6;
}

function startGame() {
    gameState.score = 0;
    gameState.health = 3;
    gameState.isGameOver = false;
    gameState.isStarted = true;
    gameState.enemies = [];
    gameState.projectiles = [];
    gameState.particles = [];
    gameState.lastEnemySpawnTime = Date.now();
    gameState.spawnInterval = 3000;
    gameState.difficulty = 1;
    
    updateUI();
    overlay.classList.add('hidden');
    
    answerInput.value = '';
    if (gameState.mode === 'defense') answerInput.focus();
    
    if (gameState.mode === 'sniper') {
        spawnSniperTarget();
    }

    if (gameState.animationFrameId) {
        cancelAnimationFrame(gameState.animationFrameId);
    }
    gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

function switchMode(mode) {
    if (gameState.mode === mode) return;
    
    gameState.mode = mode;
    btnDefense.classList.toggle('active', mode === 'defense');
    btnSniper.classList.toggle('active', mode === 'sniper');
    defenseControls.classList.toggle('hidden', mode !== 'defense');
    sniperControls.classList.toggle('hidden', mode !== 'sniper');
    sniperAlert.classList.toggle('hidden', mode !== 'sniper');
    globalTimerContainer.classList.toggle('hidden', mode !== 'sniper');
    
    gameState.isStarted = false;
    if (gameState.animationFrameId) {
        cancelAnimationFrame(gameState.animationFrameId);
    }
    showStartScreen();
}

function updateUI() {
    scoreEl.textContent = gameState.score;
    healthEl.textContent = '❤️'.repeat(gameState.health);
}

function gameOver() {
    gameState.isGameOver = true;
    gameState.isStarted = false;
    finalScoreEl.textContent = gameState.score;
    
    if (gameState.mode === 'defense') {
        gameOverModeInfo.textContent = '[ 아케이드 디펜스 ]';
    } else {
        const diffText = gameState.sniperDifficulty === 'easy' ? '쉬움' : '보통';
        gameOverModeInfo.textContent = `[ 블라인드 스나이퍼 - ${diffText} ]`;
    }

    overlay.classList.remove('hidden');
    startScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
    if (gameState.animationFrameId) {
        cancelAnimationFrame(gameState.animationFrameId);
    }
}

function shakeScreen() {
    gameContainer.classList.add('shake');
    setTimeout(() => {
        gameContainer.classList.remove('shake');
    }, 400);
}

// Coordinate Conversion
function valToX(val) {
    const range = NUMBER_LINE.max - NUMBER_LINE.min;
    const percent = (val - NUMBER_LINE.min) / range;
    const availableWidth = canvas.width - (NUMBER_LINE.padding * 2);
    return NUMBER_LINE.padding + (percent * availableWidth);
}

function xToVal(x) {
    const range = NUMBER_LINE.max - NUMBER_LINE.min;
    const availableWidth = canvas.width - (NUMBER_LINE.padding * 2);
    const percent = (x - NUMBER_LINE.padding) / availableWidth;
    return NUMBER_LINE.min + percent * range;
}

// Target Generation Logic
function generateTarget() {
    const score = gameState.score;
    const isEasy = gameState.mode === 'sniper' && gameState.sniperDifficulty === 'easy';
    let val, display, fraction;

    if (gameState.mode === 'defense') {
        // Always 0.5 units for defense mode (Integer or Integer.5)
        val = (Math.floor(Math.random() * 41) - 20) * 0.5;
        display = val > 0 ? `+${val}` : `${val}`;
        if (val === 0) return generateTarget();
        return { val, display };
    }

    if (score < 50 || isEasy && score < 100) {
        // Integers only
        val = Math.floor(Math.random() * 21) - 10;
        display = val > 0 ? `+${val}` : `${val}`;
    } else if (score < 100 || isEasy) {
        // Decimals (0.1, 0.2, 0.5 steps)
        const steps = [0.1, 0.2, 0.5];
        const step = steps[Math.floor(Math.random() * steps.length)];
        const count = Math.floor(20 / step);
        val = (Math.floor(Math.random() * (count + 1)) * step - 10);
        val = Math.round(val * 10) / 10; 
        display = val > 0 ? `+${val}` : `${val}`;
    } else {
        // Fractions (denominator 2-6)
        const den = Math.floor(Math.random() * 5) + 2; 
        const num = Math.floor(Math.random() * (20 * den + 1)) - (10 * den);
        val = num / den;
        
        const gcd = (a, b) => b ? gcd(b, a % b) : a;
        const common = Math.abs(gcd(num, den));
        const sNum = num / common;
        const sDen = den / common;
        
        if (sDen === 1) {
            display = sNum > 0 ? `+${sNum}` : `${sNum}`;
        } else {
            const sign = sNum >= 0 ? '+' : '-';
            display = `${sign}${Math.abs(sNum)}/${sDen}`;
            fraction = { sign, num: Math.abs(sNum), den: sDen };
        }
    }

    if (val === 0 && score > 0) return generateTarget(); 
    return { val, display, fraction };
}

function spawnEnemy() {
    if (gameState.mode !== 'defense') return;
    
    const target = generateTarget();
    const enemy = {
        id: Date.now() + Math.random(),
        pos: target.val,
        display: target.display,
        maxTime: Math.max(2000, 7000 - gameState.difficulty * 600),
        startTime: Date.now(),
        isDead: false,
        isRevealed: false
    };
    gameState.enemies.push(enemy);
}

function spawnSniperTarget() {
    if (gameState.mode !== 'sniper') return;
    
    const target = generateTarget();
    gameState.sniperTarget = target;
    
    let baseTime = Math.max(1500, 6000 - gameState.difficulty * 500);
    if (gameState.sniperDifficulty === 'easy') baseTime += 2000;
    
    // Add 2 seconds for fractions
    if (target.fraction) {
        baseTime += 2000;
    }
    
    gameState.sniperMaxTime = baseTime;
    gameState.sniperTimer = gameState.sniperMaxTime;
    
    // Render target display
    if (target.fraction) {
        targetCoordContainer.innerHTML = `
            <span class="fraction-sign">${target.fraction.sign}</span>
            <div class="fraction">
                <span class="fraction-numerator">${target.fraction.num}</span>
                <span class="fraction-denominator">${target.fraction.den}</span>
            </div>
        `;
    } else {
        targetCoordContainer.textContent = target.display;
    }
}

function handleDefenseInput() {
    const input = answerInput.value.trim();
    if (!input) return;

    let val;
    if (input.includes('/')) {
        const parts = input.split('/');
        val = parseFloat(parts[0]) / parseFloat(parts[1]);
    } else {
        val = parseFloat(input);
    }

    if (isNaN(val)) return;

    let targetEnemy = null;
    gameState.enemies.forEach(enemy => {
        if (enemy.isDead) return;
        if (Math.abs(enemy.pos - val) < 0.001) {
            targetEnemy = enemy;
        }
    });

    if (targetEnemy) {
        fireProjectile(targetEnemy.pos, () => {
            targetEnemy.isDead = true;
            createExplosion(valToX(targetEnemy.pos), NUMBER_LINE.y);
            gameState.score += 10;
            gameState.difficulty += 0.1;
            updateUI();
        });
    } else {
        fireProjectile(val, () => {
            createExplosion(valToX(val), NUMBER_LINE.y, true);
        });
    }

    answerInput.value = '';
}

function handleCanvasClick(e) {
    if (gameState.mode !== 'sniper' || !gameState.isStarted || gameState.isGameOver) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clickedVal = xToVal(x);
    const targetVal = gameState.sniperTarget.val;
    const diff = Math.abs(clickedVal - targetVal);

    if (diff <= 0.3) {
        const isPerfect = diff <= 0.1;
        fireProjectile(targetVal, () => {
            // Reveal enemy briefly before explosion
            const revealEnemy = {
                pos: targetVal,
                isRevealed: true,
                revealTime: Date.now()
            };
            gameState.enemies.push(revealEnemy);
            
            setTimeout(() => {
                revealEnemy.isDead = true;
                createExplosion(valToX(targetVal), NUMBER_LINE.y);
                gameState.score += isPerfect ? 20 : 10;
                gameState.difficulty += 0.1;
                updateUI();
                spawnSniperTarget();
            }, 300);
        });
    } else {
        fireProjectile(clickedVal, () => {
            createExplosion(valToX(clickedVal), NUMBER_LINE.y, true);
            shakeScreen();
        });
    }
}

function fireProjectile(targetVal, onHit) {
    const startX = valToX(0);
    const startY = NUMBER_LINE.y - 10;
    const endX = valToX(targetVal);
    const endY = NUMBER_LINE.y;
    
    const projectile = {
        startX, startY, endX, endY,
        x: startX, y: startY,
        progress: 0,
        speed: 0.08,
        onHit
    };
    gameState.projectiles.push(projectile);
}

function createExplosion(x, y, isSmall = false) {
    const count = isSmall ? 8 : 20;
    for (let i = 0; i < count; i++) {
        gameState.particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 1.0,
            color: isSmall ? COLORS.secondary : (Math.random() > 0.5 ? COLORS.primary : COLORS.success)
        });
    }
}

// Rendering
function drawNumberLine() {
    ctx.strokeStyle = '#adb5bd';
    ctx.lineWidth = 2;
    
    // Main line
    ctx.beginPath();
    ctx.moveTo(0, NUMBER_LINE.y);
    ctx.lineTo(canvas.width, NUMBER_LINE.y);
    ctx.stroke();

    // Arrows at both ends
    const arrowSize = 10;
    // Left arrow
    ctx.beginPath();
    ctx.moveTo(arrowSize, NUMBER_LINE.y - arrowSize/2);
    ctx.lineTo(0, NUMBER_LINE.y);
    ctx.lineTo(arrowSize, NUMBER_LINE.y + arrowSize/2);
    ctx.stroke();
    // Right arrow
    ctx.beginPath();
    ctx.moveTo(canvas.width - arrowSize, NUMBER_LINE.y - arrowSize/2);
    ctx.lineTo(canvas.width, NUMBER_LINE.y);
    ctx.lineTo(canvas.width - arrowSize, NUMBER_LINE.y + arrowSize/2);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = 'bold 12px sans-serif';

    for (let v = NUMBER_LINE.min; v <= NUMBER_LINE.max; v += NUMBER_LINE.subStep) {
        const x = valToX(v);
        const isMain = Number.isInteger(v);
        const tickHeight = isMain ? 12 : 6;
        
        ctx.beginPath();
        ctx.moveTo(x, NUMBER_LINE.y - tickHeight);
        ctx.lineTo(x, NUMBER_LINE.y + tickHeight);
        ctx.strokeStyle = isMain ? '#495057' : '#dee2e6';
        ctx.stroke();

        if (isMain) {
            let shouldShowLabel = true;
            if (gameState.mode === 'defense') {
                const allowed = [-10, -5, 0, 5, 10];
                shouldShowLabel = allowed.includes(v);
            }

            if (shouldShowLabel) {
                ctx.fillStyle = v === 0 ? COLORS.primary : '#495057';
                ctx.fillText(v, x, NUMBER_LINE.y + 15);
            }
        }
    }

    const originX = valToX(0);
    ctx.fillStyle = COLORS.player;
    ctx.beginPath();
    ctx.moveTo(originX - 10, NUMBER_LINE.y);
    ctx.lineTo(originX + 10, NUMBER_LINE.y);
    ctx.lineTo(originX, NUMBER_LINE.y - 20);
    ctx.closePath();
    ctx.fill();
}

function drawEnemies() {
    gameState.enemies.forEach((enemy, index) => {
        if (enemy.isDead) {
            gameState.enemies.splice(index, 1);
            return;
        }

        const x = valToX(enemy.pos);
        
        if (gameState.mode === 'defense' || enemy.isRevealed) {
            const isRevealed = enemy.isRevealed;
            const size = isRevealed ? 12 : 8;
            const yOffset = isRevealed ? 20 : 15;

            // Draw Villain Shape
            ctx.fillStyle = COLORS.enemy;
            
            // Body
            ctx.fillRect(x - size, NUMBER_LINE.y - yOffset, size * 2, yOffset);
            
            // Head
            ctx.beginPath();
            ctx.arc(x, NUMBER_LINE.y - yOffset, size, Math.PI, 0);
            ctx.fill();
            
            // Eyes
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(x - size/2.5, NUMBER_LINE.y - yOffset + 2, size/4, 0, Math.PI * 2);
            ctx.arc(x + size/2.5, NUMBER_LINE.y - yOffset + 2, size/4, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(x - size/2.5, NUMBER_LINE.y - yOffset + 2, size/8, 0, Math.PI * 2);
            ctx.arc(x + size/2.5, NUMBER_LINE.y - yOffset + 2, size/8, 0, Math.PI * 2);
            ctx.fill();

            if (gameState.mode === 'defense') {
                const elapsed = Date.now() - enemy.startTime;
                const timeLeft = Math.max(0, enemy.maxTime - elapsed);
                const timePercent = timeLeft / enemy.maxTime;

                const barWidth = 40;
                ctx.fillStyle = '#e9ecef';
                ctx.fillRect(x - barWidth / 2, NUMBER_LINE.y - yOffset - 15, barWidth, 4);
                ctx.fillStyle = timePercent > 0.3 ? COLORS.success : COLORS.danger;
                ctx.fillRect(x - barWidth / 2, NUMBER_LINE.y - yOffset - 15, barWidth * timePercent, 4);

                if (timeLeft <= 0) {
                    enemy.isDead = true;
                    gameState.health--;
                    shakeScreen();
                    updateUI();
                    if (gameState.health <= 0) gameOver();
                }
            }
        }
    });
}

function drawProjectiles() {
    gameState.projectiles.forEach((p, index) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
            p.onHit();
            gameState.projectiles.splice(index, 1);
            return;
        }

        const dx = p.endX - p.startX;
        const dy = p.endY - p.startY;
        p.x = p.startX + dx * p.progress;
        const height = -80 * Math.sin(Math.PI * p.progress);
        p.y = p.startY + dy * p.progress + height;

        ctx.fillStyle = COLORS.primary;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
    });
}

function drawParticles() {
    gameState.particles.forEach((p, index) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.03;

        if (p.life <= 0) {
            gameState.particles.splice(index, 1);
            return;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
        ctx.globalAlpha = 1.0;
    });
}

function gameLoop() {
    if (!gameState.isStarted || gameState.isGameOver) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawNumberLine();
    drawEnemies();
    drawProjectiles();
    drawParticles();

    if (gameState.mode === 'defense') {
        const now = Date.now();
        if (now - gameState.lastEnemySpawnTime > gameState.spawnInterval) {
            spawnEnemy();
            gameState.lastEnemySpawnTime = now;
            gameState.spawnInterval = Math.max(1000, 3500 - gameState.difficulty * 300);
        }
    } else if (gameState.mode === 'sniper') {
        gameState.sniperTimer -= 16.67;
        const percent = Math.max(0, gameState.sniperTimer / gameState.sniperMaxTime);
        globalTimerBar.style.width = (percent * 100) + '%';
        
        if (gameState.sniperTimer <= 0) {
            gameState.health--;
            shakeScreen();
            updateUI();
            if (gameState.health <= 0) gameOver();
            else spawnSniperTarget();
        }
    }

    gameState.animationFrameId = requestAnimationFrame(gameLoop);
}

// Start
init();
