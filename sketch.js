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

// Layout Variables
let wheelRadius;
let wheelX, wheelY;

function setup() {
    createCanvas(windowWidth, windowHeight);
    textFont("Noto Sans JP");
    textAlign(CENTER, CENTER);
    rectMode(CENTER);
    angleMode(DEGREES); // Switch to Degrees for simplicity
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    background(255);

    // 1. Establish Layout Frame
    let frameH = height * 0.9;
    let frameW = frameH * 0.85;
    if (frameW > width * 0.95) {
        frameW = width * 0.95;
        frameH = frameW / 0.85;
    }

    let centerX = width / 2;
    let centerY = height / 2;

    // 2. Wheel Config
    wheelRadius = frameH * 0.7;
    wheelX = centerX + frameW * 0.6;
    wheelY = centerY;
    let frameMargin = frameW * 0.02;
    let textMargin = frameMargin;

    // 3. Animation Logic (Sliding Window Reset)
    scrollOffset = lerp(scrollOffset, targetScroll, 0.1);

    // When the slide is nearly complete, reset and shift activeIndex
    if (isAnimating && abs(scrollOffset - targetScroll) < 0.05) {
        scrollOffset = 0;
        targetScroll = 0;
        activeIndex = (activeIndex + 1) % 12;
        isAnimating = false;
    }

    // 4. Draw Wheel (13 Slots Sliding Window)
    push();
    translate(wheelX, wheelY);

    let spacing = 12.5;
    // Slot 4 is the "Active" slot (where the needle points, 137.5 degrees)
    // startAngle is the angle of Slot 0. 
    // Slot 4 at 137.5 means startAngle + 4 * 12.5 = 137.5 => startAngle = 87.5
    let startAngle = 87.5;

    for (let i = 12; i >= 0; i--) {
        // Angle slides by scrollOffset
        let angle = startAngle + i * spacing + scrollOffset;

        // Map the slot to a zodiac index relative to the current activeIndex
        // Initially (scroll=0, slot=4), we want zodiacs[activeIndex]
        let zodiacIdx = (activeIndex - (i - 4) + 12) % 12;

        let highlighted = false;
        if (!isAnimating && i === 4) highlighted = true;
        if (isAnimating) {
            // When sliding targetScroll = 12.5, Slot 3 moves into Slot 4's position.
            if (abs(angle - 137.5) < spacing / 2) highlighted = true;
        }

        push();
        rotate(angle);
        translate(wheelRadius, 0);
        rotate(-angle); // Counter-rotate to keep upright

        noStroke();

        // Size Logic
        let boxSize = highlighted ? frameW * 0.30 : frameW * 0.15;
        let textSizeVal = highlighted ? frameW * 0.24 : frameW * 0.12;

        // Shape
        if (highlighted) {
            fill(0); // Black
        } else {
            fill(120); // Grey
        }
        stroke(1);
        rect(0, 0, boxSize, boxSize);

        // Text
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textStyle(BOLD);
        textSize(textSizeVal);
        text(zodiacs[zodiacIdx], 0, 0);

        pop();
    }
    pop();

    // 5. Draw Static Arc Line and Dots
    noFill();
    stroke(255, 0, 0);
    strokeWeight(3);
    // arc(x, y, w, h, start, stop)
    arc(wheelX, wheelY, wheelRadius * 2, wheelRadius * 2, 110, 250);

    // Draw dots on the arc
    fill(255, 0, 0);
    noStroke();
    for (let a = 110; a <= 250; a += 35) {
        let dx = wheelX + cos(a) * wheelRadius;
        let dy = wheelY + sin(a) * wheelRadius;
        circle(dx, dy, frameW * 0.03);
    }

    // 6. Draw Red Clock Hand (8 o'clock needle)
    stroke(255, 0, 0);
    strokeWeight(15); // Thick needle
    let needleStartX = centerX + frameW * 0.5 - frameMargin;
    line(needleStartX, wheelY, wheelX + cos(137.5) * wheelRadius * 0.8, wheelY + sin(137.5) * wheelRadius * 0.8);

    // 7. Draw Outer Frame
    noFill();
    stroke(0);
    strokeWeight(2);
    rect(centerX, centerY, frameW, frameH);

    // 8. Draw Static Text (Year Labels)
    let angleHighlight = 137.5;
    let angleAbove = 150.0;
    let sizeHighlight = frameW * 0.30;
    let sizeNormal = frameW * 0.15;

    // Shared Layout Metrics
    // frameMargin is now defined globally
    textMargin = frameMargin; // Margin from tiles

    // HAPPY NEW YEAR
    textAlign(RIGHT, CENTER);
    fill(0);
    noStroke();
    textSize(frameW * 0.12);
    textStyle(BOLDITALIC);

    let headerX = centerX + frameW * 0.5 - frameMargin;

    text("HAPPY", headerX, centerY - frameH * 0.1);
    text("NEW YEAR!", headerX, centerY);

    // Coordinate Calculation helper
    let getTileEdges = (angle, size) => {
        return {
            bottom: wheelY + sin(angle) * wheelRadius + size / 2,
            left: wheelX + cos(angle) * wheelRadius - size / 2
        };
    };

    let posCurr = getTileEdges(angleHighlight, sizeHighlight);
    let posPrev = getTileEdges(angleAbove, sizeNormal);

    textAlign(RIGHT, BOTTOM);
    textStyle(NORMAL);

    // Previous Year (Small, Gray)
    fill(120);
    textSize(frameW * 0.05);
    text((currentYear - 1) + ":", posPrev.left - textMargin, posPrev.bottom);

    // Current Year (Large, Black)
    fill(0);
    textSize(frameW * 0.1);
    text(currentYear + ":", posCurr.left - textMargin, posCurr.bottom);

    // Footer
    textAlign(LEFT, BOTTOM);
    textSize(frameW * 0.035);
    fill(50);
    text("今年もよろしくお願いします。", centerX - frameW * 0.5 + frameMargin, centerY + frameH * 0.5 - frameMargin);


    // DEBUG INFO (Uncomment to view)
    /*
    fill(255, 0, 0);
    textAlign(LEFT, TOP);
    textSize(12);
    text("FPS: " + nf(frameRate(), 0, 1), 10, 10);
    text("Radius: " + wheelRadius, 10, 25);
    text("WheelX: " + wheelX, 10, 40);
    text("Rotation: " + nf(currentRotation, 0, 1), 10, 55);
    */
}

function mousePressed() {
    if (isAnimating) return; // Prevent double clicks during transition
    currentYear++;
    targetScroll = 12.5; // Slide Slot 3 into Slot 4's position
    isAnimating = true;
}

