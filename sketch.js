/* --- CONFIGURATION --- */
const CONFIG = {
    COLORS: {
        BG: 255,
        TEXT_MAIN: 0,
        TEXT_SUB: 120,
        ACCENT: [255, 0, 0],
        NEEDLE: [255, 0, 0]
    },
    ANGLES: {
        SPACING: 12.5,
        ACTIVE_SLOT: 4,
        HIGHLIGHT: 137.5,
        ABOVE: 150.0,
        ARC_START: 110,
        ARC_END: 250
    },
    LAYOUT: {
        SCREEN_OCCUPANCY: 0.95,     // Use up to 95% of screen dimensions
        WHEEL_RADIUS_RATIO: 0.7,
        WHEEL_X_RATIO: 1.2,
        MARGIN: 0.02,
        NEEDLE_LENGTH_RATIO: 0.8
    },
    ANIMATION: {
        LERP_SPEED: 0.1,
        THRESHOLD: 0.05
    }
};

/* --- VIEWPORT CLASS --- */
class Viewport {
    constructor(centerX, centerY, frameW, frameH) {
        this.center = { x: centerX, y: centerY };
        this.halfW = frameW / 2;
        this.halfH = frameH / 2;
        this.frameW = frameW;
        this.frameH = frameH;
    }

    toX(lx) { return this.center.x + lx * this.halfW; }
    toY(ly) { return this.center.y + ly * this.halfH; }
    toSize(ls) { return ls * this.halfW; }
}

let zodiacs = [
    "子", "丑", "寅", "卯", "辰", "巳",
    "午", "未", "申", "酉", "戌", "亥"
];

let currentYear = 2025;
let activeIndex = 5;

// Animation Variables
let scrollOffset = 0;
let targetScroll = 0;
let isAnimating = false;

// Layout State
let viewport;

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont("Noto Sans JP");
    textAlign(CENTER, CENTER);
    rectMode(CENTER);
    angleMode(DEGREES);
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
    let frameSize = min(width, height) * CONFIG.LAYOUT.SCREEN_OCCUPANCY;

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
        activeIndex = (activeIndex + 1) % 12;
        isAnimating = false;
    }
}

function draw() {
    updateLayout();
    updateAnimation();

    background(CONFIG.COLORS.BG);

    drawZodiacWheel();
    drawDecoration();
    drawOuterFrame();
    drawTextContent();
}

function mousePressed() {
    if (isAnimating) return;
    currentYear++;
    targetScroll = CONFIG.ANGLES.SPACING;
    isAnimating = true;
}

function drawZodiacWheel() {
    let wheelX = viewport.toX(CONFIG.LAYOUT.WHEEL_X_RATIO);
    let wheelY = viewport.toY(0);
    let wheelRadius = viewport.frameH * CONFIG.LAYOUT.WHEEL_RADIUS_RATIO;

    push();
    translate(wheelX, wheelY);

    let startAngle = CONFIG.ANGLES.HIGHLIGHT - (CONFIG.ANGLES.ACTIVE_SLOT * CONFIG.ANGLES.SPACING);

    for (let i = 12; i >= 0; i--) {
        let angle = startAngle + i * CONFIG.ANGLES.SPACING + scrollOffset;
        let zodiacIdx = (activeIndex - (i - CONFIG.ANGLES.ACTIVE_SLOT) + 12) % 12;

        let highlighted = false;
        if (!isAnimating && i === CONFIG.ANGLES.ACTIVE_SLOT) highlighted = true;
        if (isAnimating) {
            if (abs(angle - CONFIG.ANGLES.HIGHLIGHT) < CONFIG.ANGLES.SPACING / 2) highlighted = true;
        }

        push();
        rotate(angle);
        translate(wheelRadius, 0);
        rotate(-angle);

        noStroke();
        let boxSize = highlighted ? viewport.toSize(0.60) : viewport.toSize(0.30);
        let textSizeVal = highlighted ? viewport.toSize(0.48) : viewport.toSize(0.24);

        if (highlighted) {
            fill(CONFIG.COLORS.TEXT_MAIN);
        } else {
            fill(CONFIG.COLORS.TEXT_SUB);
        }
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
    let wheelX = viewport.toX(CONFIG.LAYOUT.WHEEL_X_RATIO);
    let wheelY = viewport.toY(0);
    let wheelRadius = viewport.frameH * CONFIG.LAYOUT.WHEEL_RADIUS_RATIO;
    let lMargin = CONFIG.LAYOUT.MARGIN * 2;

    // Red Arc
    noFill();
    stroke(CONFIG.COLORS.ACCENT);
    strokeWeight(3);
    arc(wheelX, wheelY, wheelRadius * 2, wheelRadius * 2, CONFIG.ANGLES.ARC_START, CONFIG.ANGLES.ARC_END);

    // Red Dots on Arc
    fill(CONFIG.COLORS.ACCENT);
    noStroke();
    for (let a = CONFIG.ANGLES.ARC_START; a <= CONFIG.ANGLES.ARC_END; a += 35) {
        circle(wheelX + cos(a) * wheelRadius, wheelY + sin(a) * wheelRadius, viewport.toSize(0.06));
    }

    // Red Needle
    stroke(CONFIG.COLORS.NEEDLE);
    strokeWeight(15);
    let needleStartX = viewport.toX(1.0 - lMargin);
    line(needleStartX, wheelY,
        wheelX + cos(CONFIG.ANGLES.HIGHLIGHT) * wheelRadius * CONFIG.LAYOUT.NEEDLE_LENGTH_RATIO,
        wheelY + sin(CONFIG.ANGLES.HIGHLIGHT) * wheelRadius * CONFIG.LAYOUT.NEEDLE_LENGTH_RATIO);
}

function drawOuterFrame() {
    noFill();
    stroke(0);
    strokeWeight(2);
    rect(viewport.toX(0), viewport.toY(0), viewport.frameW, viewport.frameH);
}

// Coordinate Calculation helper
function getTileEdges(angle, size) {
    let wheelX = viewport.toX(CONFIG.LAYOUT.WHEEL_X_RATIO);
    let wheelY = viewport.toY(0);
    let wheelRadius = viewport.frameH * CONFIG.LAYOUT.WHEEL_RADIUS_RATIO;

    return {
        bottom: wheelY + sin(angle) * wheelRadius + size / 2,
        left: wheelX + cos(angle) * wheelRadius - size / 2
    };
}

function drawTextContent() {
    let lMargin = CONFIG.LAYOUT.MARGIN * 2;
    let frameMarginPxl = viewport.toSize(lMargin);

    // 1. HAPPY NEW YEAR!
    textAlign(RIGHT, CENTER);
    fill(CONFIG.COLORS.TEXT_MAIN);
    noStroke();
    textSize(viewport.toSize(0.24));
    textStyle(BOLDITALIC);

    let headerX = viewport.toX(1.0 - lMargin);
    text("HAPPY", headerX, viewport.toY(-0.2));
    text("NEW YEAR!", headerX, viewport.toY(0));

    // 2. Year Labels (Aligned to tiles)
    textAlign(RIGHT, BOTTOM);
    textStyle(NORMAL);

    let posCurr = getTileEdges(CONFIG.ANGLES.HIGHLIGHT, viewport.toSize(0.60));
    let posPrev = getTileEdges(CONFIG.ANGLES.ABOVE, viewport.toSize(0.30));

    // Previous Year (Gray)
    fill(CONFIG.COLORS.TEXT_SUB);
    textSize(viewport.toSize(0.1));
    text((currentYear - 1) + ":", posPrev.left - frameMarginPxl, posPrev.bottom);

    // Current Year (Black)
    fill(CONFIG.COLORS.TEXT_MAIN);
    textSize(viewport.toSize(0.2));
    text(currentYear + ":", posCurr.left - frameMarginPxl, posCurr.bottom);

    // 3. Footer
    textAlign(LEFT, BOTTOM);
    textSize(viewport.toSize(0.07));
    fill(50);
    text("今年もよろしくお願いします。", viewport.toX(-1.0 + lMargin), viewport.toY(1.0 - lMargin));
}


