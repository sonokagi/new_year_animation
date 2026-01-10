/* --- CONFIGURATION --- */
const CONFIG = {
  COLORS: {
    BACK_GROUND: 255, // 背景色 (白)
    MAIN: 0, // メイン色（黒）
    SUB: 120, // サブ色（グレー）
    ACCENT: [255, 0, 0] // アクセント色（赤）
  },
  VIEWPORT: {
    OCCUPANCY_W: 0.95, // 横方向の画面占有率
    OCCUPANCY_H: 0.75, // 縦方向の画面占有率
    OFFSET_Y: -0.24 // 画面全体の上方へのオフセット量(Viewport半径に対する比率で指定)
  },
  ANIMATION: {
    SPEED: 0.1 // アニメーション速度（追従率: 0.05〜0.2程度で調整）
  }
}

class Viewport {
  constructor(screenW, screenH) {
    // Encapsulate sizing logic
    // Fixed 1:1 Aspect Ratio (Square)
    // Always fit within the smaller dimension of the screen, considering separate occupancy rules
    let constrainedWidth = screenW * CONFIG.VIEWPORT.OCCUPANCY_W
    let constrainedHeight = screenH * CONFIG.VIEWPORT.OCCUPANCY_H
    let size = min(constrainedWidth, constrainedHeight)

    this._center = { x: screenW / 2, y: screenH / 2 }
    this._unit = size / 2 // Fundamental Unit: Radius
  }

  x(ratio) {
    return this._center.x + ratio * this._unit
  }
  y(ratio) {
    return this._center.y + ratio * this._unit
  }

  // Returns a length scaled by the unit (Radius)
  // length(1.0) = Radius (Distance from center to edge)
  // length(2.0) = Diameter (Full Size)
  length(ratio) {
    return ratio * this._unit
  }

  applyOffset() {
    translate(0, this.length(CONFIG.VIEWPORT.OFFSET_Y))
  }
}

class Layout {
  constructor(vp) {
    this.vp = vp

    // --- 内部幾何学パラメータ ---
    const BASE_MARGIN = 0.02 // 基本マージン（2%）

    // 外部（ZodiacWheel等）から参照される共有パラメータの公開
    this.spacingAngle = 11 // 干支どうしの間隔（度数）
    this._activeSlot = 3 // アクティブな干支が配置の何番目に来るか（内部用）
    this.highlightAngle = 133 // アクティブな干支を表示する基準角度
    this.angleAdjustments = [2, 0, -2.5, -4.5, -1.5, 0, 0, 0, 0, 0, 0, 0, 0, 0] // 各スロットの角度微調整

    // 相対境界の定義（アクティブを0としたオフセット範囲）
    this.minOffset = 0 - this._activeSlot // 通常 -3
    this.maxOffset = 12 - this._activeSlot // 通常 9

    // 1. Wheel & Zodiac Entities
    this.wheel = {
      center: {
        x: vp.x(1.2), // ホイールの中心X座標のオフセット比率
        y: vp.y(0)
      },
      radius: {
        x: vp.length(1.64 * 1.25), // 干支ホイールの横半径比率 (0.82 * 2 * 1.25)
        y: vp.length(1.64 * 0.8) // 干支ホイールの縦半径比率 (0.82 * 2 * 0.8)
      },
      boxSize: {
        min: vp.length(0.3),
        max: vp.length(0.6)
      },
      textSize: {
        min: vp.length(0.24),
        max: vp.length(0.48)
      }
    }

    // 2. Functional Indicators & Background
    this.arc = {
      start: 101.5, // 赤い円弧の開始角度
      end: 228, // 赤い円弧の終了角度
      radius: {
        x: vp.length(1.36 * 1.25), // 赤い円弧の横半径比率 (0.68 * 2 * 1.25)
        y: vp.length(1.36 * 0.75) // 赤い円弧の縦半径比率 (0.68 * 2 * 0.75)
      }
    }

    this.dots = {
      start: 120, // 装飾ドットの開始角度
      spacing: 35, // 装飾ドットの間隔
      count: 4, // 装飾ドットの個数
      radius: vp.length(0.06)
    }

    this.needle = {
      lengthRatio: 0.65, // 針の長さ比率
      start: {
        x: vp.x(1.0 - BASE_MARGIN * 4),
        y: this.wheel.center.y
      }
    }

    // 3. Content Components
    this.header = {
      size: vp.length(0.24),
      pos: {
        x: vp.x(1.0 - BASE_MARGIN * 3),
        yHappy: vp.y(-0.2),
        yNewYear: vp.y(0)
      }
    }

    const mainEdges = this.getLabelEdges(this.getAngle(0), this.wheel.boxSize.max)
    this.yearMain = {
      size: vp.length(0.17),
      pos: {
        x: mainEdges.left - vp.length(BASE_MARGIN),
        y: mainEdges.bottom
      }
    }

    const subEdges = this.getLabelEdges(this.getAngle(1), this.wheel.boxSize.min)
    this.yearSub = {
      size: vp.length(0.1),
      pos: {
        x: subEdges.left - vp.length(BASE_MARGIN),
        y: subEdges.bottom
      }
    }

    this.footer = {
      size: vp.length(0.07),
      pos: {
        x: vp.x(-1.0 + BASE_MARGIN),
        y: vp.y(1.45)
      }
    }

    // 5. Outer Frame Geometry
    this.outerFrame = {
      x1: vp.x(-0.95),
      y1: vp.y(-0.9),
      x2: vp.x(1),
      y2: vp.y(1.05)
    }
  }

  // POSITION HELPERS
  // Absolute position for a specific angle on the wheel
  getWheelPosition(angle) {
    return {
      x: this.wheel.center.x + cos(angle) * this.wheel.radius.x,
      y: this.wheel.center.y + sin(angle) * this.wheel.radius.y
    }
  }

  // Label positioning (adapted from getTileEdges)
  getLabelEdges(angle, size) {
    const pos = this.getWheelPosition(angle)
    return {
      bottom: pos.y + size / 2,
      left: pos.x - size / 2
    }
  }

  getAngle(offset = 0) {
    return this.getSlotAngle(this._activeSlot + offset)
  }

  getSlotAngle(i) {
    const base = this.highlightAngle + (i - this._activeSlot) * this.spacingAngle
    const adjustment = this.angleAdjustments[i + 1] || 0 // i: -1 to 12 -> index: 0 to 13
    return base + adjustment
  }
}

class ZodiacWheel {
  render() {
    push()
    translate(layout.wheel.center.x, layout.wheel.center.y)

    for (let offset = layout.maxOffset; offset >= layout.minOffset; offset--) {
      // 1. Domain & Timing Logic
      const slotYear = year.current - offset
      const zodiac = Year.getZodiac(slotYear)
      const angle = animator.interpolate(layout.getAngle(offset - 1), layout.getAngle(offset))

      // 2. Interpolation Factors
      const angleDist = abs(angle - layout.getAngle(0))
      const hFactor = map(angleDist, 0, layout.spacingAngle, 1.0, 0.0, true)

      // 3. Localized Opacity Interpolation
      let opacity
      if (offset === layout.minOffset) {
        opacity = animator.interpolate(0, 255) // Fade-in
      } else if (offset === layout.maxOffset) {
        opacity = animator.interpolate(255, 0) // Fade-out
      } else {
        opacity = 255
      }

      push()
      translate(layout.wheel.radius.x * cos(angle), layout.wheel.radius.y * sin(angle))
      this._renderItem(zodiac, hFactor, opacity)
      pop()
    }

    pop()
  }

  _renderItem(character, hFactor, opacity) {
    // 1. Geometry & Interpolation
    let currentBoxSize = lerp(layout.wheel.boxSize.min, layout.wheel.boxSize.max, hFactor)
    let currentTextSize = lerp(layout.wheel.textSize.min, layout.wheel.textSize.max, hFactor)
    let baseFillColor = lerp(CONFIG.COLORS.SUB, CONFIG.COLORS.MAIN, hFactor)

    // 2. Color Definitions (Consolidated Alpha Management)
    let fillColor = color(baseFillColor)
    fillColor.setAlpha(opacity)

    let strokeColor = color(CONFIG.COLORS.MAIN)
    strokeColor.setAlpha(opacity)

    let textColor = color(CONFIG.COLORS.BACK_GROUND)
    textColor.setAlpha(opacity)

    // 3. Render Box
    fill(fillColor)
    stroke(strokeColor)
    strokeWeight(2)
    rectMode(CENTER)
    rect(0, 0, currentBoxSize, currentBoxSize)

    // 4. Render Character Text
    fill(textColor)
    noStroke()
    textAlign(CENTER, CENTER)
    textStyle(BOLD)
    textSize(currentTextSize)
    text(character, 0, 0)
  }
}

class Year {
  static ZODIACS = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
  static OFFSET_YEAR_0 = 8 // 西暦0年の干支は(8:申)である

  constructor(value) {
    this.value = value
  }

  advance() {
    this.value++
  }

  get current() {
    return this.value
  }

  get previous() {
    return this.value - 1
  }

  static getZodiac(yearValue) {
    const idx = (Year.OFFSET_YEAR_0 + yearValue) % Year.ZODIACS.length
    return Year.ZODIACS[idx]
  }
}

class Animator {
  constructor() {
    this._progress = 1.0
    this._running = false
  }

  play() {
    this._progress = 0.0
    this._running = true
  }

  update() {
    if (!this._running) return

    // 目的地(1.0)に向かって、毎フレーム残りの距離の一定割合(SPEED)を詰める
    // これにより、到着直前にゆっくりになる滑らかな動き（Ease-Out）になる
    this._progress = lerp(this._progress, 1.0, CONFIG.ANIMATION.SPEED)

    // 目的地に十分近づいたら（誤差 5% 以内）完了とみなす
    // これは lerp が目的地に論理的に到達しないための内部的な終了処理
    const THRESHOLD = 0.05
    if (1.0 - this._progress < THRESHOLD) {
      this._progress = 1.0
      this._running = false
    }
  }

  interpolate(a, b) {
    return lerp(a, b, this._progress)
  }
}

// Domain State
let year

// Animation State
let animator

// Layout State
let viewport
let layout

// Wheel State
let wheel

function setup() {
  createCanvas(windowWidth, windowHeight)
  textFont("Noto Sans JP")
  angleMode(DEGREES)

  year = new Year(new Date().getFullYear())
  animator = new Animator()
  wheel = new ZodiacWheel()

  // Initial Layout Calculation
  updateLayout()

  // Trigger initial animation
  animator.play()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  updateLayout()
}

/**
 * Recalculates layout parameters based on current window size.
 */
function updateLayout() {
  viewport = new Viewport(width, height)
  layout = new Layout(viewport)
}

function draw() {
  animator.update()

  background(CONFIG.COLORS.BACK_GROUND)

  viewport.applyOffset()

  drawArc()
  drawDots()
  drawOuterFrame()
  drawNeedle()
  drawHeader()
  drawYearLabels()
  drawFooter()
  wheel.render()
}

function mousePressed() {
  if (animator._running) return
  year.advance()
  animator.play()
}

function drawArc() {
  // Red Arc (Background)
  noFill()
  stroke(CONFIG.COLORS.ACCENT)
  strokeWeight(3)
  arc(
    layout.wheel.center.x,
    layout.wheel.center.y,
    layout.arc.radius.x * 2,
    layout.arc.radius.y * 2,
    layout.arc.start,
    layout.arc.end
  )
}

function drawDots() {
  // Decorative Dots on Arc
  fill(CONFIG.COLORS.ACCENT)
  noStroke()
  for (let i = 0; i < layout.dots.count; i++) {
    let a = layout.dots.start + i * layout.dots.spacing
    circle(
      layout.wheel.center.x + cos(a) * layout.arc.radius.x,
      layout.wheel.center.y + sin(a) * layout.arc.radius.y,
      layout.dots.radius
    )
  }
}

function drawOuterFrame() {
  noFill()
  stroke(CONFIG.COLORS.MAIN)
  strokeWeight(2)
  rectMode(CORNERS)
  rect(layout.outerFrame.x1, layout.outerFrame.y1, layout.outerFrame.x2, layout.outerFrame.y2)
}

function drawNeedle() {
  // Red Needle (Indicator)
  stroke(CONFIG.COLORS.ACCENT)
  strokeWeight(15)

  let start = layout.needle.start

  // Localized Angle Interpolation
  let needleAngle = animator.interpolate(layout.getAngle(-1), layout.getAngle(0))
  let target = layout.getWheelPosition(needleAngle)

  // Vector from Start to Target
  let dx = target.x - start.x
  let dy = target.y - start.y

  // Draw needle using a fixed ratio for easy manual adjustment
  let ratio = layout.needle.lengthRatio
  line(start.x, start.y, start.x + dx * ratio, start.y + dy * ratio)
}

function drawHeader() {
  textAlign(RIGHT, CENTER)
  fill(CONFIG.COLORS.MAIN)
  noStroke()
  textSize(layout.header.size)
  textStyle(BOLDITALIC)
  text("HAPPY", layout.header.pos.x, layout.header.pos.yHappy)
  text("NEW YEAR!", layout.header.pos.x, layout.header.pos.yNewYear)
}

function drawYearLabels() {
  // Derived Display State
  let displayYear = animator._running ? year.previous : year.current

  textAlign(RIGHT, BOTTOM)
  textStyle(NORMAL)
  // Previous Year (Gray)
  fill(CONFIG.COLORS.SUB)
  textSize(layout.yearSub.size)
  text(displayYear - 1 + ":", layout.yearSub.pos.x, layout.yearSub.pos.y)
  // Current Year (Black)
  fill(CONFIG.COLORS.MAIN)
  textSize(layout.yearMain.size)
  text(displayYear + ":", layout.yearMain.pos.x, layout.yearMain.pos.y)
}

function drawFooter() {
  textAlign(LEFT, BOTTOM)
  textSize(layout.footer.size)
  fill(CONFIG.COLORS.MAIN)
  text("今年もよろしくお願いします。", layout.footer.pos.x, layout.footer.pos.y)
}
