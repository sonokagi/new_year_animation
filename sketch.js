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

class Layout {
    constructor(vp) {
        this.vp = vp;
        this._update();
    }

    _update() {
        // 1. Wheel Geometry
        this.wheelCenter = {
            x: this.vp.x(CONFIG.WHEEL.CENTER_X_RATIO),
            y: this.vp.y(0)
        };
        this.wheelRadius = {
            x: this.vp.height * CONFIG.WHEEL.RADIUS_RATIO_X,
            y: this.vp.height * CONFIG.WHEEL.RADIUS_RATIO_Y
        };

        // 2. Decoration Geometry
        this.arcRadius = {
            x: this.vp.height * CONFIG.DECORATION.ARC_RADIUS_RATIO_X,
            y: this.vp.height * CONFIG.DECORATION.ARC_RADIUS_RATIO_Y
        };

        // 3. Spacing & Margins
        this.margin = this.vp.scale(CONFIG.SCREEN.MARGIN);

        // 4. Text Layout Metrics
        this.text = {
            sizes: {
                header: this.vp.scale(0.24),
                yearMain: this.vp.scale(0.2),
                yearSub: this.vp.scale(0.1),
                footer: this.vp.scale(0.07),
                boxMain: this.vp.scale(0.60),
                boxSub: this.vp.scale(0.30)
            }
        };

        // Calculate independent anchor points for labels
        const mainEdges = this.getLabelEdges(CONFIG.WHEEL.HIGHLIGHT_ANGLE, this.text.sizes.boxMain);
        const subEdges = this.getLabelEdges(CONFIG.WHEEL.HIGHLIGHT_ANGLE + CONFIG.WHEEL.SPACING_ANGLE, this.text.sizes.boxSub);

        // Pre-calculated Text Positions (The "View Model")
        this.text.pos = {
            header: {
                x: this.vp.x(1.0 - CONFIG.SCREEN.MARGIN * 2),
                yHappy: this.vp.y(-0.2),
                yNewYear: this.vp.y(0)
            },
            yearMain: {
                x: mainEdges.left - this.margin,
                y: mainEdges.bottom
            },
            yearSub: {
                x: subEdges.left - this.margin,
                y: subEdges.bottom
            },
            footer: {
                x: this.vp.x(-1.0 + CONFIG.SCREEN.MARGIN * 2),
                y: this.vp.y(1.0 - CONFIG.SCREEN.MARGIN * 2)
            }
        };
    }

    // Semantic helper for needle start position
    get needleStart() {
        return {
            x: this.vp.x(1.0 - CONFIG.SCREEN.MARGIN * 2),
            y: this.wheelCenter.y
        };
    }

    // POSITION HELPERS

    // Absolute position for a specific angle on the wheel
    getWheelPosition(angle) {
        return {
            x: this.wheelCenter.x + cos(angle) * this.wheelRadius.x,
            y: this.wheelCenter.y + sin(angle) * this.wheelRadius.y
        };
    }

    // Label positioning (adapted from getTileEdges)
    getLabelEdges(angle, size) {
        const pos = this.getWheelPosition(angle);
        return {
            bottom: pos.y + size / 2,
            left: pos.x - size / 2
        };
    }
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
let layout;

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
    layout = new Layout(viewport);
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
    push();
    translate(layout.wheelCenter.x, layout.wheelCenter.y);

    let startAngle = CONFIG.WHEEL.HIGHLIGHT_ANGLE - (CONFIG.WHEEL.ACTIVE_SLOT * CONFIG.WHEEL.SPACING_ANGLE);
    let highlightRange = CONFIG.WHEEL.SPACING_ANGLE;

    for (let i = 12; i >= 0; i--) {
        let angle = startAngle + i * CONFIG.WHEEL.SPACING_ANGLE + scrollOffset;
        let zodiacIdx = (activeIndex - (i - CONFIG.WHEEL.ACTIVE_SLOT) + 12) % 12;

        // Calculate distance to HIGHLIGHT center
        let angleDist = abs(angle - CONFIG.WHEEL.HIGHLIGHT_ANGLE);

        // Calculate highlight factor
        let hFactor = map(angleDist, 0, highlightRange, 1.0, 0.0, true);

        push();
        translate(layout.wheelRadius.x * cos(angle), layout.wheelRadius.y * sin(angle));

        noStroke();

        // Interpolate size
        let boxSize = lerp(viewport.scale(0.30), viewport.scale(0.60), hFactor);
        let textSizeVal = lerp(viewport.scale(0.24), viewport.scale(0.48), hFactor);

        // Interpolate color (Gray to Black)
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
    // Red Arc
    noFill();
    stroke(CONFIG.COLORS.ACCENT);
    strokeWeight(3);
    arc(layout.wheelCenter.x, layout.wheelCenter.y, layout.arcRadius.x * 2, layout.arcRadius.y * 2, CONFIG.DECORATION.ARC_START_ANGLE, CONFIG.DECORATION.ARC_END_ANGLE);

    // Red Dots on Arc
    fill(CONFIG.COLORS.ACCENT);
    noStroke();
    for (let i = 0; i < CONFIG.DECORATION.DOT_COUNT; i++) {
        let a = CONFIG.DECORATION.DOT_START_ANGLE + i * CONFIG.DECORATION.DOT_SPACING_ANGLE;
        circle(layout.wheelCenter.x + cos(a) * layout.arcRadius.x, layout.wheelCenter.y + sin(a) * layout.arcRadius.y, viewport.scale(0.06));
    }

    // Red Needle
    stroke(CONFIG.COLORS.NEEDLE);
    strokeWeight(15);
    let start = layout.needleStart;
    let target = layout.getWheelPosition(CONFIG.WHEEL.HIGHLIGHT_ANGLE);

    // Vector from Start to Target
    let dx = target.x - start.x;
    let dy = target.y - start.y;

    // Draw needle using a fixed ratio for easy manual adjustment
    let ratio = CONFIG.DECORATION.NEEDLE_LENGTH_RATIO;
    line(start.x, start.y, start.x + dx * ratio, start.y + dy * ratio);
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


function drawTextContent() {
    const pos = layout.text.pos;
    const sizes = layout.text.sizes;

    // 1. HAPPY NEW YEAR!
    textAlign(RIGHT, CENTER);
    fill(CONFIG.COLORS.TEXT_MAIN);
    noStroke();
    textSize(sizes.header);
    textStyle(BOLDITALIC);
    text("HAPPY", pos.header.x, pos.header.yHappy);
    text("NEW YEAR!", pos.header.x, pos.header.yNewYear);

    // 2. Year Labels (Aligned to tiles)
    textAlign(RIGHT, BOTTOM);
    textStyle(NORMAL);

    // Previous Year (Gray)
    fill(CONFIG.COLORS.TEXT_SUB);
    textSize(sizes.yearSub);
    text((displayYear - 1) + ":", pos.yearSub.x, pos.yearSub.y);

    // Current Year (Black)
    fill(CONFIG.COLORS.TEXT_MAIN);
    textSize(sizes.yearMain);
    text(displayYear + ":", pos.yearMain.x, pos.yearMain.y);

    // 3. Footer
    textAlign(LEFT, BOTTOM);
    textSize(sizes.footer);
    fill(50);
    text("今年もよろしくお願いします。", pos.footer.x, pos.footer.y);
}


