/* --- CONFIGURATION --- */
const CONFIG = {
    COLORS: {
        BG: 255,                  // 背景色
        TEXT_MAIN: 0,             // メインテキスト色（黒）
        TEXT_SUB: 120,            // サブテキスト色（グレー）
        ACCENT: [255, 0, 0],      // アクセント色（赤）
        NEEDLE: [255, 0, 0]       // 針の色
    },
    SCREEN: {
        OCCUPANCY_W: 0.95,        // 横方向の画面占有率
        OCCUPANCY_H: 0.70,        // 縦方向の画面占有率
        MARGIN: 0.02              // 基本マージン（2%）
    },
    WHEEL: {
        SPACING_ANGLE: 12.5,      // 干支どうしの間隔（度数）
        ACTIVE_SLOT: 4,           // アクティブな干支が配置の何番目に来るか
        HIGHLIGHT_ANGLE: 137.5,   // アクティブな干支を表示する基準角度
        CENTER_X_RATIO: 1.2,      // ホイールの中心X座標のオフセット比率
        RADIUS_RATIO_X: 0.82 * 1.25, // 干支ホイールの横半径比率
        RADIUS_RATIO_Y: 0.82 * 0.9   // 干支ホイールの縦半径比率
    },
    DECORATION: {
        ARC_START_ANGLE: 110,     // 赤い円弧の開始角度
        ARC_END_ANGLE: 250,       // 赤い円弧の終了角度
        ARC_RADIUS_RATIO_X: 0.68 * 1.25, // 赤い円弧の横半径比率
        ARC_RADIUS_RATIO_Y: 0.68 * 0.9,  // 赤い円弧の縦半径比率
        DOT_START_ANGLE: 120,     // 装飾ドットの開始角度
        DOT_SPACING_ANGLE: 35,    // 装飾ドットの間隔
        DOT_COUNT: 4,             // 装飾ドットの個数
        NEEDLE_LENGTH_RATIO: 0.55 // 針の長さ比率（1:8の隙間用）
    },
    ANIMATION: {
        LERP_SPEED: 0.1,          // アニメーションの滑らかさ
        THRESHOLD: 0.05           // アニメーション終了判定の閾値
    }
};

class Viewport {
    constructor(centerX, centerY, frameW, frameH) {
        this._center = { x: centerX, y: centerY };
        this._width = frameW;
        this._height = frameH;
    }

    x(lx) { return this._center.x + lx * (this._width / 2); }
    y(ly) { return this._center.y + ly * (this._height / 2); }
    scale(ls) { return ls * (this._width / 2); }

    get width() { return this._width; }
    get height() { return this._height; }
}

let zodiacs = [
    "子", "丑", "寅", "卯", "辰", "巳",
    "午", "未", "申", "酉", "戌", "亥"
];

let currentYear = new Date().getFullYear();

// Animation Variables
let scrollOffset = 0;
let targetScroll = 0;
let isAnimating = false;
let displayYear = currentYear - 1; // Initialize to previous year for transition effect
let activeIndex = getZodiacIndex(currentYear);

// Layout State
let viewport;

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont("Noto Sans JP");
    textAlign(CENTER, CENTER);
    rectMode(CENTER);
    angleMode(DEGREES);

    // Trigger initial animation
    triggerZodiacAnimation();
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

/**
 * Recalculates layout parameters based on current window size.
 */
function updateLayout() {
    let centerX = width / 2;
    let centerY = height / 2;

    // Fixed 1:1 Aspect Ratio (Square)
    // Always fit within the smaller dimension of the screen
    // Fixed 1:1 Aspect Ratio (Square)
    // Always fit within the smaller dimension of the screen, considering separate occupancy rules
    let constrainedWidth = width * CONFIG.SCREEN.OCCUPANCY_W;
    let constrainedHeight = height * CONFIG.SCREEN.OCCUPANCY_H;
    let frameSize = min(constrainedWidth, constrainedHeight);

    viewport = new Viewport(centerX, centerY, frameSize, frameSize);
}

/**
 * Handles the smooth scrolling animation and state updates.
 */
function updateAnimation() {
    scrollOffset = lerp(scrollOffset, targetScroll, CONFIG.ANIMATION.LERP_SPEED);

    if (isAnimating && abs(scrollOffset - targetScroll) < CONFIG.ANIMATION.THRESHOLD) {
        scrollOffset = 0;
        targetScroll = 0;
        isAnimating = false;
        // Update displayYear only when animation finishes
        displayYear = currentYear;
    }
}

function draw() {
    updateLayout();
    updateAnimation();

    background(CONFIG.COLORS.BG);

    drawDecoration();
    drawOuterFrame();
    drawTextContent();
    drawZodiacWheel();
}

function mousePressed() {
    if (isAnimating) return;
    currentYear++;
    activeIndex = getZodiacIndex(currentYear);
    triggerZodiacAnimation();
}

function drawZodiacWheel() {
    let wheelX = viewport.x(CONFIG.WHEEL.CENTER_X_RATIO);
    let wheelY = viewport.y(0);

    push();
    translate(wheelX, wheelY);

    let startAngle = CONFIG.WHEEL.HIGHLIGHT_ANGLE - (CONFIG.WHEEL.ACTIVE_SLOT * CONFIG.WHEEL.SPACING_ANGLE);

    // Calculate highlight range based on spacing (can be adjusted for "sharpness" of transition)
    let highlightRange = CONFIG.WHEEL.SPACING_ANGLE;

    for (let i = 12; i >= 0; i--) {
        let angle = startAngle + i * CONFIG.WHEEL.SPACING_ANGLE + scrollOffset;
        let zodiacIdx = (activeIndex - (i - CONFIG.WHEEL.ACTIVE_SLOT) + 12) % 12;

        // Calculate distance to HIGHLIGHT center
        let angleDist = abs(angle - CONFIG.WHEEL.HIGHLIGHT_ANGLE);

        // Calculate highlight factor (1.0 at center, 0.0 at highlightRange distance)
        let hFactor = map(angleDist, 0, highlightRange, 1.0, 0.0, true);

        // Use an easing function for a smoother feel (optional, but nice)
        // hFactor = sin(hFactor * 90); // Simple sine ease

        let rx = viewport.height * CONFIG.WHEEL.RADIUS_RATIO_X;
        let ry = viewport.height * CONFIG.WHEEL.RADIUS_RATIO_Y;

        push();
        translate(rx * cos(angle), ry * sin(angle));

        noStroke();

        // Interpolate size
        let boxSize = lerp(viewport.scale(0.30), viewport.scale(0.60), hFactor);
        let textSizeVal = lerp(viewport.scale(0.24), viewport.scale(0.48), hFactor);

        // Interpolate color (Gray to Black)
        // TEXT_SUB is gray (120), TEXT_MAIN is black (0)
        let textColor = lerp(CONFIG.COLORS.TEXT_SUB, CONFIG.COLORS.TEXT_MAIN, hFactor);

        fill(textColor);
        stroke(1);
        rect(0, 0, boxSize, boxSize);

        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(textSizeVal);
        text(zodiacs[zodiacIdx], 0, 0);
        pop();
    }
    pop();
}

function drawDecoration() {
    let wheelX = viewport.x(CONFIG.WHEEL.CENTER_X_RATIO);
    let wheelY = viewport.y(0);
    let arcRadiusX = viewport.height * CONFIG.DECORATION.ARC_RADIUS_RATIO_X;
    let arcRadiusY = viewport.height * CONFIG.DECORATION.ARC_RADIUS_RATIO_Y;
    let lMargin = CONFIG.SCREEN.MARGIN * 2;

    // Red Arc
    noFill();
    stroke(CONFIG.COLORS.ACCENT);
    strokeWeight(3);
    arc(wheelX, wheelY, arcRadiusX * 2, arcRadiusY * 2, CONFIG.DECORATION.ARC_START_ANGLE, CONFIG.DECORATION.ARC_END_ANGLE);

    // Red Dots on Arc
    fill(CONFIG.COLORS.ACCENT);
    noStroke();
    for (let i = 0; i < CONFIG.DECORATION.DOT_COUNT; i++) {
        let a = CONFIG.DECORATION.DOT_START_ANGLE + i * CONFIG.DECORATION.DOT_SPACING_ANGLE;
        circle(wheelX + cos(a) * arcRadiusX, wheelY + sin(a) * arcRadiusY, viewport.scale(0.06));
    }

    // Red Needle
    stroke(CONFIG.COLORS.NEEDLE);
    strokeWeight(15);
    let needleStartX = viewport.x(1.0 - lMargin);

    // Target: Center of the highlighted zodiac box
    let wheelRadiusX = viewport.height * CONFIG.WHEEL.RADIUS_RATIO_X;
    let wheelRadiusY = viewport.height * CONFIG.WHEEL.RADIUS_RATIO_Y;
    let targetX = wheelX + cos(CONFIG.WHEEL.HIGHLIGHT_ANGLE) * wheelRadiusX;
    let targetY = wheelY + sin(CONFIG.WHEEL.HIGHLIGHT_ANGLE) * wheelRadiusY;

    // Vector from Start to Target
    let dx = targetX - needleStartX;
    let dy = targetY - wheelY;

    // Draw needle using a fixed ratio for easy manual adjustment
    let ratio = CONFIG.DECORATION.NEEDLE_LENGTH_RATIO;
    line(needleStartX, wheelY, needleStartX + dx * ratio, wheelY + dy * ratio);
}

function drawOuterFrame() {
    noFill();
    stroke(0);
    strokeWeight(2);
    rect(viewport.x(0), viewport.y(0), viewport.width, viewport.height);
}

// Calculation helpers
function triggerZodiacAnimation() {
    scrollOffset = -CONFIG.WHEEL.SPACING_ANGLE;
    targetScroll = 0;
    isAnimating = true;
}

function getZodiacIndex(year) {
    return ((year - 4) % 12 + 12) % 12;
}

// Coordinate Calculation helper
function getTileEdges(angle, size) {
    let wheelX = viewport.x(CONFIG.WHEEL.CENTER_X_RATIO);
    let wheelY = viewport.y(0);
    let wheelRadiusX = viewport.height * CONFIG.WHEEL.RADIUS_RATIO_X;
    let wheelRadiusY = viewport.height * CONFIG.WHEEL.RADIUS_RATIO_Y;

    return {
        bottom: wheelY + sin(angle) * wheelRadiusY + size / 2,
        left: wheelX + cos(angle) * wheelRadiusX - size / 2
    };
}

function drawTextContent() {
    let lMargin = CONFIG.SCREEN.MARGIN * 2;
    let frameMarginPxl = viewport.scale(lMargin);

    // 1. HAPPY NEW YEAR!
    textAlign(RIGHT, CENTER);
    fill(CONFIG.COLORS.TEXT_MAIN);
    noStroke();
    textSize(viewport.scale(0.24));
    textStyle(BOLDITALIC);

    let headerX = viewport.x(1.0 - lMargin);
    text("HAPPY", headerX, viewport.y(-0.2));
    text("NEW YEAR!", headerX, viewport.y(0));

    // 2. Year Labels (Aligned to tiles)
    textAlign(RIGHT, BOTTOM);
    textStyle(NORMAL);

    let posCurr = getTileEdges(CONFIG.WHEEL.HIGHLIGHT_ANGLE, viewport.scale(0.60));
    let posPrev = getTileEdges(CONFIG.WHEEL.HIGHLIGHT_ANGLE + CONFIG.WHEEL.SPACING_ANGLE, viewport.scale(0.30));

    // Previous Year (Gray)
    fill(CONFIG.COLORS.TEXT_SUB);
    textSize(viewport.scale(0.1));
    text((displayYear - 1) + ":", posPrev.left - frameMarginPxl, posPrev.bottom);

    // Current Year (Black)
    // Use displayYear logic for the main label
    fill(CONFIG.COLORS.TEXT_MAIN);
    textSize(viewport.scale(0.2));
    text(displayYear + ":", posCurr.left - frameMarginPxl, posCurr.bottom);

    // 3. Footer
    textAlign(LEFT, BOTTOM);
    textSize(viewport.scale(0.07));
    fill(50);
    text("今年もよろしくお願いします。", viewport.x(-1.0 + lMargin), viewport.y(1.0 - lMargin));
}


