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
        OCCUPANCY_H: 0.75,        // 縦方向の画面占有率
        MARGIN: 0.02,             // 基本マージン（2%）
        OFFSET_Y: -0.24            // 画面全体の上方へのオフセット (Viewport半径に対する比率 -0.12 * 2)
    },
    WHEEL: {
        SPACING_ANGLE: 11,      // 干支どうしの間隔（度数）
        ACTIVE_SLOT: 3,           // アクティブな干支が配置の何番目に来るか
        HIGHLIGHT_ANGLE: 133,   // アクティブな干支を表示する基準角度
        CENTER_X_RATIO: 1.2,      // ホイールの中心X座標のオフセット比率
        RADIUS_RATIO_X: 1.64 * 1.25, // 干支ホイールの横半径比率 (0.82 * 2 * 1.25)
        RADIUS_RATIO_Y: 1.64 * 0.8,  // 干支ホイールの縦半径比率 (0.82 * 2 * 0.8)
        // 各スロットの角度微調整 (基準間隔からのオフセット)
        // Index: -1(Entrance Source), 0(Active), 1..12
        // Default: All 0
        ANGLE_ADJUSTMENTS: [2, 0, -2.5, -4.5, -1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    },
    DECORATION: {
        ARC_START_ANGLE: 101.5,     // 赤い円弧の開始角度
        ARC_END_ANGLE: 228,       // 赤い円弧の終了角度
        ARC_RADIUS_RATIO_X: 1.36 * 1.25, // 赤い円弧の横半径比率 (0.68 * 2 * 1.25)
        ARC_RADIUS_RATIO_Y: 1.36 * 0.75,  // 赤い円弧の縦半径比率 (0.68 * 2 * 0.75)
        DOT_START_ANGLE: 120,     // 装飾ドットの開始角度
        DOT_SPACING_ANGLE: 35,    // 装飾ドットの間隔
        DOT_COUNT: 4,             // 装飾ドットの個数
        NEEDLE_LENGTH_RATIO: 0.65 // 針の長さ比率
    },
    ANIMATION: {
        LERP_SPEED: 0.1,          // アニメーションの滑らかさ
        THRESHOLD: 0.05           // アニメーション終了判定の閾値
    }
};

class Viewport {
    constructor(screenW, screenH) {
        // Encapsulate sizing logic
        // Fixed 1:1 Aspect Ratio (Square)
        // Always fit within the smaller dimension of the screen, considering separate occupancy rules
        let constrainedWidth = screenW * CONFIG.SCREEN.OCCUPANCY_W;
        let constrainedHeight = screenH * CONFIG.SCREEN.OCCUPANCY_H;
        let size = min(constrainedWidth, constrainedHeight);

        this._center = { x: screenW / 2, y: screenH / 2 };
        this._unit = size / 2; // Fundamental Unit: Radius
    }

    x(ratio) { return this._center.x + ratio * this._unit; }
    y(ratio) { return this._center.y + ratio * this._unit; }

    // Returns a length scaled by the unit (Radius)
    // length(1.0) = Radius (Distance from center to edge)
    // length(2.0) = Diameter (Full Size)
    length(ratio) { return ratio * this._unit; }
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
            x: this.vp.length(CONFIG.WHEEL.RADIUS_RATIO_X),
            y: this.vp.length(CONFIG.WHEEL.RADIUS_RATIO_Y)
        };

        // 2. Decoration Geometry
        this.arcRadius = {
            x: this.vp.length(CONFIG.DECORATION.ARC_RADIUS_RATIO_X),
            y: this.vp.length(CONFIG.DECORATION.ARC_RADIUS_RATIO_Y)
        };

        // 3. Spacing & Margins
        this.margin = this.vp.length(CONFIG.SCREEN.MARGIN); // scale() was radius-based

        // 4. Text Layout Metrics
        this.text = {
            sizes: {
                header: this.vp.length(0.24),
                yearMain: this.vp.length(0.17),
                yearSub: this.vp.length(0.1),
                footer: this.vp.length(0.07),
                boxMain: this.vp.length(0.60),
                boxSub: this.vp.length(0.30)
            }
        };

        // Calculate independent anchor points for labels
        const activeSlot = CONFIG.WHEEL.ACTIVE_SLOT;
        // Use Exact Tracking for labels to match visual slot positions
        const mainEdges = this.getLabelEdges(getSlotAngle(activeSlot), this.text.sizes.boxMain);
        const subEdges = this.getLabelEdges(getSlotAngle(activeSlot + 1), this.text.sizes.boxSub);

        // Pre-calculated Text Positions (The "View Model")
        this.text.pos = {
            header: {
                x: this.vp.x(1.0 - CONFIG.SCREEN.MARGIN * 3),
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
                x: this.vp.x(-1.0 + CONFIG.SCREEN.MARGIN),
                y: this.vp.y(1.45)
            }
        };

        // 5. Outer Frame Geometry
        this.outerFrame = {
            x1: this.vp.x(-0.95),
            y1: this.vp.y(-0.9),
            x2: this.vp.x(1),
            y2: this.vp.y(1.05)
        };

        // 6. Global Render Offset
        this.renderOffset = this.vp.length(CONFIG.SCREEN.OFFSET_Y);
    }

    // Semantic helper for needle start position
    get needleStart() {
        return {
            x: this.vp.x(1.0 - CONFIG.SCREEN.MARGIN * 4),
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

class Animator {
    constructor() {
        this.displayYear = 0;
        this.targetYear = 0;

        // Animation State
        this.progress = 1.0;
        this.running = false;

        // Derived Values (Cached for rendering)
        this.needleAngle = 0;
        this.zodiacAngles = new Array(13).fill(0); // Store angles for slots 0 to 12
        this.exitOpacity = 255;
    }

    play(targetYear) {
        this.targetYear = targetYear;
        this.displayYear = targetYear - 1;
        this.progress = 0.0;
        this.running = true;
        this.exitOpacity = 255;
    }

    update() {
        if (!this.running) return;

        this.progress = lerp(this.progress, 1.0, CONFIG.ANIMATION.LERP_SPEED);

        if ((1.0 - this.progress) < CONFIG.ANIMATION.THRESHOLD) {
            this.progress = 1.0;
            this.running = false;
            this.displayYear = this.targetYear;
        }

        // Calculate derived values based on new progress
        // Exact Tracking: Needle follows the item arriving at ACTIVE_SLOT
        let activeSlot = CONFIG.WHEEL.ACTIVE_SLOT;
        let startSlotAngle = getSlotAngle(activeSlot - 1);
        let endSlotAngle = getSlotAngle(activeSlot);
        this.needleAngle = lerp(startSlotAngle, endSlotAngle, this.progress);

        // Pre-calculate Zodiac angles
        for (let i = 0; i <= 12; i++) {
            let prev = getSlotAngle(i - 1);
            let curr = getSlotAngle(i);
            this.zodiacAngles[i] = lerp(prev, curr, this.progress);
        }

        this.exitOpacity = lerp(255, 0, this.progress);
    }
}

let zodiacs = [
    "子", "丑", "寅", "卯", "辰", "巳",
    "午", "未", "申", "酉", "戌", "亥"
];

// Domain State
let currentYear = new Date().getFullYear();

// Animation State
let animator;

// Layout State
let viewport;
let layout;

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont("Noto Sans JP");
    textAlign(CENTER, CENTER);
    angleMode(DEGREES);

    animator = new Animator();

    // Trigger initial animation
    animator.play(currentYear);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

/**
 * Recalculates layout parameters based on current window size.
 */
function updateLayout() {
    viewport = new Viewport(width, height);
    layout = new Layout(viewport);
}

function draw() {
    updateLayout();
    animator.update();

    background(CONFIG.COLORS.BG);

    push();
    translate(0, layout.renderOffset);

    drawDecoration();
    drawOuterFrame();
    drawTextContent();
    drawZodiacWheel();

    pop();
}

function mousePressed() {
    if (animator.running) return;
    currentYear++;
    animator.play(currentYear);
}

function drawZodiacWheel() {
    push();
    translate(layout.wheelCenter.x, layout.wheelCenter.y);

    for (let i = 12; i >= 0; i--) {
        let data = calculateZodiacLayout(i);
        drawZodiacItem(data);
    }

    pop();
}

function calculateZodiacLayout(i) {
    let angle = animator.zodiacAngles[i];

    let zodiacIdx = (getZodiacIndex(currentYear) - (i - CONFIG.WHEEL.ACTIVE_SLOT) + 12) % 12;

    let angleDist = abs(angle - getSlotAngle(CONFIG.WHEEL.ACTIVE_SLOT));
    let hFactor = map(angleDist, 0, CONFIG.WHEEL.SPACING_ANGLE, 1.0, 0.0, true);

    let opacity;
    // Fade out the exit item
    if (i === 12) {
        opacity = animator.exitOpacity;
    }
    // Fade in the entry item
    else if (i === 0) {
        opacity = 255 - animator.exitOpacity;
    }
    // Otherwise, keep it fully visible
    else {
        opacity = 255;
    }

    return {
        x: layout.wheelRadius.x * cos(angle),
        y: layout.wheelRadius.y * sin(angle),
        boxSize: lerp(viewport.length(0.30), viewport.length(0.60), hFactor),
        textSize: lerp(viewport.length(0.24), viewport.length(0.48), hFactor),
        textColor: lerp(CONFIG.COLORS.TEXT_SUB, CONFIG.COLORS.TEXT_MAIN, hFactor),
        character: zodiacs[zodiacIdx],
        opacity: opacity
    };
}

function drawZodiacItem(data) {
    push();
    translate(data.x, data.y);

    noStroke();
    let c = color(data.textColor);
    c.setAlpha(data.opacity);
    fill(c);

    stroke(1, data.opacity);
    rectMode(CENTER);
    rect(0, 0, data.boxSize, data.boxSize);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    textSize(data.textSize);
    text(data.character, 0, 0);

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
        circle(layout.wheelCenter.x + cos(a) * layout.arcRadius.x, layout.wheelCenter.y + sin(a) * layout.arcRadius.y, viewport.length(0.06));
    }

    // Red Needle
    stroke(CONFIG.COLORS.NEEDLE);
    strokeWeight(15);
    let start = layout.needleStart;

    // Use centralized angle
    let target = layout.getWheelPosition(animator.needleAngle);

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
    rectMode(CORNERS);
    rect(layout.outerFrame.x1, layout.outerFrame.y1, layout.outerFrame.x2, layout.outerFrame.y2);
}

// Calculation helpers
function getZodiacIndex(year) {
    return ((year - 4) % 12 + 12) % 12;
}

function getSlotAngle(i) {
    // Determine base angle for slot i
    let baseAngle = CONFIG.WHEEL.HIGHLIGHT_ANGLE + (i - CONFIG.WHEEL.ACTIVE_SLOT) * CONFIG.WHEEL.SPACING_ANGLE;

    // Apply custom adjustment if available
    // Map logic index i (-1 to 12) to array index (0 to 13)
    let adjIndex = i + 1;
    let adjustment = 0;
    if (adjIndex >= 0 && adjIndex < CONFIG.WHEEL.ANGLE_ADJUSTMENTS.length) {
        adjustment = CONFIG.WHEEL.ANGLE_ADJUSTMENTS[adjIndex];
    }

    return baseAngle + adjustment;
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
    text((animator.displayYear - 1) + ":", pos.yearSub.x, pos.yearSub.y);

    // Current Year (Black)
    fill(CONFIG.COLORS.TEXT_MAIN);
    textSize(sizes.yearMain);
    text(animator.displayYear + ":", pos.yearMain.x, pos.yearMain.y);

    // 3. Footer
    textAlign(LEFT, BOTTOM);
    textSize(sizes.footer);
    fill(CONFIG.COLORS.TEXT_MAIN);
    text("今年もよろしくお願いします。", pos.footer.x, pos.footer.y);
}
