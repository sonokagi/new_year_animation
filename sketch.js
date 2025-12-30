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
        FRAME_H_RATIO: 0.9,
        FRAME_W_RATIO: 0.85,
        WHEEL_RADIUS_RATIO: 0.7,
        WHEEL_X_RATIO: 0.6,
        MARGIN: 0.02,
        NEEDLE_LENGTH_RATIO: 0.8
    },
    ANIMATION: {
        LERP_SPEED: 0.1,
        THRESHOLD: 0.05
    }
};

let zodiacs = [
    "子", "丑", "寅", "卯", "辰", "巳",
    "午", "未", "申", "酉", "戌", "亥"
];

let currentYear = 2025;
let activeIndex = 5; // Start with Snake (巳)

// Animation Variables
let scrollOffset = 0;
let targetScroll = 0;
let isAnimating = false;

// Layout Variables (Global but will be updated by updateLayout)
let wheelRadius, wheelX, wheelY;
let layout = {};

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

    let frameH = height * CONFIG.LAYOUT.FRAME_H_RATIO;
    let frameW = frameH * CONFIG.LAYOUT.FRAME_W_RATIO;
    if (frameW > width * 0.95) {
        frameW = width * 0.95;
        frameH = frameW / CONFIG.LAYOUT.FRAME_W_RATIO;
    }

    // Sync old globals for backward compatibility during refactoring
    wheelRadius = frameH * CONFIG.LAYOUT.WHEEL_RADIUS_RATIO;
    wheelX = centerX + frameW * CONFIG.LAYOUT.WHEEL_X_RATIO;
    wheelY = centerY;

    layout = {
        centerX, centerY,
        frameW, frameH,
        wheelX, wheelY,
        wheelRadius,
        margin: frameW * CONFIG.LAYOUT.MARGIN
    };
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
    push();
    translate(layout.wheelX, layout.wheelY);

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
        translate(layout.wheelRadius, 0);
        rotate(-angle);

        noStroke();
        let boxSize = highlighted ? layout.frameW * 0.30 : layout.frameW * 0.15;
        let textSizeVal = highlighted ? layout.frameW * 0.24 : layout.frameW * 0.12;

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
    // Red Arc
    noFill();
    stroke(CONFIG.COLORS.ACCENT);
    strokeWeight(3);
    arc(layout.wheelX, layout.wheelY, layout.wheelRadius * 2, layout.wheelRadius * 2, CONFIG.ANGLES.ARC_START, CONFIG.ANGLES.ARC_END);

    // Red Dots on Arc
    fill(CONFIG.COLORS.ACCENT);
    noStroke();
    for (let a = CONFIG.ANGLES.ARC_START; a <= CONFIG.ANGLES.ARC_END; a += 35) {
        circle(layout.wheelX + cos(a) * layout.wheelRadius, layout.wheelY + sin(a) * layout.wheelRadius, layout.frameW * 0.03);
    }

    // Red Needle
    stroke(CONFIG.COLORS.NEEDLE);
    strokeWeight(15);
    let needleStartX = layout.centerX + layout.frameW * 0.5 - layout.margin;
    line(needleStartX, layout.wheelY,
        layout.wheelX + cos(CONFIG.ANGLES.HIGHLIGHT) * layout.wheelRadius * CONFIG.LAYOUT.NEEDLE_LENGTH_RATIO,
        layout.wheelY + sin(CONFIG.ANGLES.HIGHLIGHT) * layout.wheelRadius * CONFIG.LAYOUT.NEEDLE_LENGTH_RATIO);
}

function drawOuterFrame() {
    noFill();
    stroke(0);
    strokeWeight(2);
    rect(layout.centerX, layout.centerY, layout.frameW, layout.frameH);
}

// Coordinate Calculation helper
function getTileEdges(angle, size) {
    return {
        bottom: layout.wheelY + sin(angle) * layout.wheelRadius + size / 2,
        left: layout.wheelX + cos(angle) * layout.wheelRadius - size / 2
    };
}

function drawTextContent() {
    // 1. HAPPY NEW YEAR!
    textAlign(RIGHT, CENTER);
    fill(CONFIG.COLORS.TEXT_MAIN);
    noStroke();
    textSize(layout.frameW * 0.12);
    textStyle(BOLDITALIC);
    let headerX = layout.centerX + layout.frameW * 0.5 - layout.margin;
    text("HAPPY", headerX, layout.centerY - layout.frameH * 0.1);
    text("NEW YEAR!", headerX, layout.centerY);

    // 2. Year Labels (Aligned to tiles)
    textAlign(RIGHT, BOTTOM);
    textStyle(NORMAL);

    let posCurr = getTileEdges(CONFIG.ANGLES.HIGHLIGHT, layout.frameW * 0.30);
    let posPrev = getTileEdges(CONFIG.ANGLES.ABOVE, layout.frameW * 0.15);

    // Previous Year (Gray)
    fill(CONFIG.COLORS.TEXT_SUB);
    textSize(layout.frameW * 0.05);
    text((currentYear - 1) + ":", posPrev.left - layout.margin, posPrev.bottom);

    // Current Year (Black)
    fill(CONFIG.COLORS.TEXT_MAIN);
    textSize(layout.frameW * 0.1);
    text(currentYear + ":", posCurr.left - layout.margin, posCurr.bottom);

    // 3. Footer
    textAlign(LEFT, BOTTOM);
    textSize(layout.frameW * 0.035);
    fill(50);
    text("今年もよろしくお願いします。", layout.centerX - layout.frameW * 0.5 + layout.margin, layout.centerY + layout.frameH * 0.5 - layout.margin);
}

function mousePressed() {
    if (isAnimating) return;
    currentYear++;
    targetScroll = CONFIG.ANGLES.SPACING;
    isAnimating = true;
}

