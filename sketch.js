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
        DOT_COUNT: 4              // 装飾ドットの個数
    },
    NEEDLE: {
        LENGTH_RATIO: 0.65        // 針の長さ比率
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
        const mainEdges = this.getLabelEdges(this.getSlotAngle(activeSlot), this.text.sizes.boxMain);
        const subEdges = this.getLabelEdges(this.getSlotAngle(activeSlot + 1), this.text.sizes.boxSub);

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

        // 7. Component Sizes (Centralized Sizing from Viewport)
        this.zodiacSizes = {
            boxMin: this.vp.length(0.30),
            boxMax: this.vp.length(0.60),
            textMin: this.vp.length(0.24),
            textMax: this.vp.length(0.48)
        };
        this.decorationSizes = {
            dotRadius: this.vp.length(0.06)
        };

        // 8. Decoration Positions
        this.needleStart = {
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

    getSlotAngle(i) {
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
}


class ZodiacWheel {
    constructor() {
        this.zodiacs = [
            "子", "丑", "寅", "卯", "辰", "巳",
            "午", "未", "申", "酉", "戌", "亥"
        ];
    }

    render(currentYear) {
        push();
        translate(layout.wheelCenter.x, layout.wheelCenter.y);

        for (let i = 12; i >= 0; i--) {
            // Localized Angle Interpolation
            let angle = lerp(layout.getSlotAngle(i - 1), layout.getSlotAngle(i), animator.progress);
            let zodiacIdx = (this._getZodiacIndex(currentYear) - (i - CONFIG.WHEEL.ACTIVE_SLOT) + 12) % 12;

            let angleDist = abs(angle - layout.getSlotAngle(CONFIG.WHEEL.ACTIVE_SLOT));
            let hFactor = map(angleDist, 0, CONFIG.WHEEL.SPACING_ANGLE, 1.0, 0.0, true);

            // Localized Opacity Interpolation
            let opacity;
            if (i === 0) {
                // Fade-in: Entering slot
                opacity = lerp(0, 255, animator.progress);
            } else if (i === 12) {
                // Fade-out: Exiting slot
                opacity = lerp(255, 0, animator.progress);
            } else {
                // Regular display
                opacity = 255;
            }

            push();
            translate(layout.wheelRadius.x * cos(angle), layout.wheelRadius.y * sin(angle));
            this._renderItem(this.zodiacs[zodiacIdx], hFactor, opacity);
            pop();
        }

        pop();
    }

    _renderItem(character, hFactor, opacity) {
        let currentBoxSize = lerp(layout.zodiacSizes.boxMin, layout.zodiacSizes.boxMax, hFactor);
        let currentTextSize = lerp(layout.zodiacSizes.textMin, layout.zodiacSizes.textMax, hFactor);
        let currentTextColor = lerp(CONFIG.COLORS.TEXT_SUB, CONFIG.COLORS.TEXT_MAIN, hFactor);

        noStroke();
        let c = color(currentTextColor);
        c.setAlpha(opacity);
        fill(c);

        stroke(1, opacity);
        rectMode(CENTER);
        rect(0, 0, currentBoxSize, currentBoxSize);

        fill(255, opacity); // Ensure text is also affected by opacity
        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(currentTextSize);
        text(character, 0, 0);
    }

    _getZodiacIndex(year) {
        return ((year - 4) % 12 + 12) % 12;
    }
}

class Animator {
    constructor() {
        this.displayYear = 0;
        this.targetYear = 0;

        // Animation State
        this.progress = 1.0;
        this.running = false;
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
    }
}

// Domain State
let currentYear = new Date().getFullYear();

// Animation State
let animator;

// Layout State
let viewport;
let layout;

// Wheel State
let wheel;

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont("Noto Sans JP");
    angleMode(DEGREES);

    animator = new Animator();
    wheel = new ZodiacWheel();

    // Initial Layout Calculation
    updateLayout();

    // Trigger initial animation
    animator.play(currentYear);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    updateLayout();
}

/**
 * Recalculates layout parameters based on current window size.
 */
function updateLayout() {
    viewport = new Viewport(width, height);
    layout = new Layout(viewport);
}

function draw() {
    animator.update();

    background(CONFIG.COLORS.BG);

    push();
    translate(0, layout.renderOffset);

    drawDecoration();
    drawNeedle();
    drawOuterFrame();
    drawTextContent();
    wheel.render(currentYear);

    pop();
}

function mousePressed() {
    if (animator.running) return;
    currentYear++;
    animator.play(currentYear);
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
        circle(layout.wheelCenter.x + cos(a) * layout.arcRadius.x, layout.wheelCenter.y + sin(a) * layout.arcRadius.y, layout.decorationSizes.dotRadius);
    }
}

function drawNeedle() {
    // Red Needle
    stroke(CONFIG.COLORS.NEEDLE);
    strokeWeight(15);
    let start = layout.needleStart;

    // Localized Angle Interpolation
    let activeSlot = CONFIG.WHEEL.ACTIVE_SLOT;
    let startSlotAngle = layout.getSlotAngle(activeSlot - 1);
    let endSlotAngle = layout.getSlotAngle(activeSlot);
    let needleAngle = lerp(startSlotAngle, endSlotAngle, animator.progress);

    let target = layout.getWheelPosition(needleAngle);

    // Vector from Start to Target
    let dx = target.x - start.x;
    let dy = target.y - start.y;

    // Draw needle using a fixed ratio for easy manual adjustment
    let ratio = CONFIG.NEEDLE.LENGTH_RATIO;
    line(start.x, start.y, start.x + dx * ratio, start.y + dy * ratio);
}

function drawOuterFrame() {
    noFill();
    stroke(0);
    strokeWeight(2);
    rectMode(CORNERS);
    rect(layout.outerFrame.x1, layout.outerFrame.y1, layout.outerFrame.x2, layout.outerFrame.y2);
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
