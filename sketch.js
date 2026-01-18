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
    OCCUPANCY_H: 0.75 // 縦方向の画面占有率
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

  // --- Unit Mapping (The Core of the DSL) ---

  /**
   * Converts a ratio (normalized by viewport size) to pixel value.
   * This is the fundamental scaler for the entire system.
   */
  pixel(ratio) {
    return ratio * this._unit
  }

  /**
   * Returns a relative X offset from the center origin.
   * Implementation is identical to pixel() due to 1:1 square scale.
   */
  x(ratio) {
    return this.pixel(ratio)
  }

  /**
   * Returns a relative Y offset from the center origin.
   * Implementation is identical to pixel() due to 1:1 square scale.
   */
  y(ratio) {
    return this.pixel(ratio)
  }

  // --- State Application DSL ---

  // DSL: Sets p5.js textSize based on ratio
  textSize(ratio) {
    textSize(this.pixel(ratio))
  }

  /**
   * DSL: Performs a relative translate using ratio-based coordinates.
   * This abstracts away px calculation from the drawing code.
   */
  translate(nx, ny) {
    translate(this.pixel(nx), this.pixel(ny))
  }

  // DSL: Establishes (0,0) at the center of the viewport
  setup() {
    translate(this._center.x, this._center.y)
  }
}

class Layout {
  constructor(vp) {
    this.vp = vp

    // --- 内部幾何学パラメータ ---
    const BASE_MARGIN = 0.02 // 基本マージン（2%）

    // レイアウト全体の基準となるオフセット（全体を上下左右に微調整する）
    this.offset = {
      nx: 0,
      ny: -0.24
    }

    // --- タイムライン構成（Master） ---
    this.futureDisplayLimit = -3 // 未来方向に何年分表示するか
    this.pastDisplayLimit = 9 // 過去方向に何年分表示するか

    // --- 物理パラメータ（Detail） ---
    // 13枚のスロットを表示するが、境界の補間（次に現れる干支）のために
    // 円環上に 14個(13+1) の配置場所（スロット）を確保する
    const displayYearsCount = this.pastDisplayLimit - this.futureDisplayLimit + 1 // 13年分
    this.angleAdjustments = new Array(displayYearsCount + 1).fill(0)

    // 物理スロットごとの微調整（インデックスは論理上の年数ではなく「場所」を表す）
    this.angleAdjustments[0] = 2.0 // [予備] 未来側の補間元（画面外）
    this.angleAdjustments[1] = 0 // [表示端] 未来側の端 (-3)
    this.angleAdjustments[2] = -2.5 // [表示]
    this.angleAdjustments[3] = -4.5 // [表示]
    this.angleAdjustments[4] = -1.5 // [現在] 基準となる今年の配置
    // ※ 以降のスロットは補正なし(0)

    this.spacingAngle = 11 // 干支どうしの間隔（度数）
    this.highlightAngle = 133 // アクティブな干支を表示する基準角度

    // 1. Wheel & Zodiac Entities
    this.wheel = {
      x: vp.x(1.2), // ホイールの中心X座標のオフセット比率
      y: vp.y(0),
      radius: {
        x: vp.pixel(1.64 * 1.25), // 干支ホイールの横半径比率 (0.82 * 2 * 1.25)
        y: vp.pixel(1.64 * 0.8) // 干支ホイールの縦半径比率 (0.82 * 2 * 0.8)
      },
      boxSize: {
        min: vp.pixel(0.3),
        max: vp.pixel(0.6)
      },
      textSize: {
        min: 0.24,
        max: 0.48
      }
    }

    // 2. Functional Indicators & Background
    this.indicators = {
      x: this.wheel.x,
      y: this.wheel.y
    }

    this.needle = {
      x: vp.x(1.0 - BASE_MARGIN * 4),
      y: this.wheel.y
    }

    // 3. Content Components
    this.header = {
      x: vp.x(1.0 - BASE_MARGIN * 3),
      y: vp.y(-0.2)
    }

    const mainEdges = this.getLabelEdges(this.getAngleByRelativeYear(0), this.wheel.boxSize.max)
    this.yearMain = {
      x: mainEdges.left - vp.pixel(BASE_MARGIN),
      y: mainEdges.bottom
    }

    const subEdges = this.getLabelEdges(this.getAngleByRelativeYear(1), this.wheel.boxSize.min)
    this.yearSub = {
      x: subEdges.left - vp.pixel(BASE_MARGIN),
      y: subEdges.bottom
    }

    this.footer = {
      x: vp.x(-1.0 + BASE_MARGIN),
      y: vp.y(1.45)
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
      x: this.wheel.x + cos(angle) * this.wheel.radius.x,
      y: this.wheel.y + sin(angle) * this.wheel.radius.y
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

  getAngleByRelativeYear(relativeYear = 0) {
    // 1. 論理的な「年」から直接座標（ベース角度）を算出
    const baseAngle = this.highlightAngle + relativeYear * this.spacingAngle

    // 2. 物理的な「スロット」の補正値を解決（実装詳細のカプセル化）
    const adjustment = this.angleAdjustments[this._toSlotIndex(relativeYear)] || 0

    return baseAngle + adjustment
  }

  // 論理的な年を物理的なスロット番号に変換する
  _toSlotIndex(relativeYear) {
    // 配列内で「現在の年(0)」が配置されるインデックスを特定
    // (未来側の表示数 + 予備スロット1つ分)
    const currentYearIndex = Math.abs(this.futureDisplayLimit) + 1
    return currentYearIndex + relativeYear
  }
}

class ZodiacWheel {
  render() {
    push()
    translate(layout.wheel.x, layout.wheel.y)

    for (
      let relativeYear = layout.pastDisplayLimit;
      relativeYear >= layout.futureDisplayLimit;
      relativeYear--
    ) {
      // 1. Domain & Timing Logic
      const slotYear = year.current - relativeYear
      const zodiac = Year.getZodiac(slotYear)
      const angle = animator.interpolate(
        layout.getAngleByRelativeYear(relativeYear - 1),
        layout.getAngleByRelativeYear(relativeYear)
      )

      // 2. Interpolation Factors
      const angleDist = abs(angle - layout.getAngleByRelativeYear(0))
      const hFactor = map(angleDist, 0, layout.spacingAngle, 1.0, 0.0, true)

      // 3. Localized Opacity Interpolation
      let opacity
      if (relativeYear === layout.futureDisplayLimit) {
        opacity = animator.interpolate(0, 255) // Fade-in
      } else if (relativeYear === layout.pastDisplayLimit) {
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
    renderLabel(character, {
      size: currentTextSize,
      align: [CENTER, CENTER],
      color: textColor,
      style: BOLD
    })
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

  // 1. Viewport: Establish (0,0) at screen center
  viewport.setup()

  // 2. Layout: Apply compositional offset
  viewport.translate(layout.offset.nx, layout.offset.ny)

  drawIndicators()
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

function drawIndicators() {
  const { x, y } = layout.indicators
  const vp = viewport

  // Internalized Specification
  const spec = {
    arc: {
      start: 101.5,
      end: 228,
      radius: {
        x: vp.pixel(1.36 * 1.25),
        y: vp.pixel(1.36 * 0.75)
      }
    },
    dots: {
      start: 120,
      spacing: 35,
      count: 4,
      radius: vp.pixel(0.06)
    }
  }

  push()
  translate(x, y)

  // 1. Red Arc
  noFill()
  stroke(CONFIG.COLORS.ACCENT)
  strokeWeight(3)
  arc(0, 0, spec.arc.radius.x * 2, spec.arc.radius.y * 2, spec.arc.start, spec.arc.end)

  // 2. Decorative Dots
  fill(CONFIG.COLORS.ACCENT)
  noStroke()
  for (let i = 0; i < spec.dots.count; i++) {
    let a = spec.dots.start + i * spec.dots.spacing
    circle(cos(a) * spec.arc.radius.x, sin(a) * spec.arc.radius.y, spec.dots.radius)
  }

  pop()
}

function drawOuterFrame() {
  noFill()
  stroke(CONFIG.COLORS.MAIN)
  strokeWeight(2)
  rectMode(CORNERS)
  rect(layout.outerFrame.x1, layout.outerFrame.y1, layout.outerFrame.x2, layout.outerFrame.y2)
}

function drawNeedle() {
  const start = layout.needle
  const lengthRatio = 0.65

  // Red Needle (Indicator)
  stroke(CONFIG.COLORS.ACCENT)
  strokeWeight(15)
  strokeCap(ROUND)

  // Localized Angle Interpolation
  const needleAngle = animator.interpolate(
    layout.getAngleByRelativeYear(-1),
    layout.getAngleByRelativeYear(0)
  )
  const target = layout.getWheelPosition(needleAngle)

  // Vector from Start to Target
  const dx = target.x - start.x
  const dy = target.y - start.y

  push()
  translate(start.x, start.y)
  // Draw needle using direct specifications
  line(0, 0, dx * lengthRatio, dy * lengthRatio)
  pop()
}

function drawHeader() {
  const config = {
    size: 0.24,
    align: [RIGHT, CENTER],
    color: CONFIG.COLORS.MAIN,
    style: BOLDITALIC
  }

  push()
  translate(layout.header.x, layout.header.y)
  renderLabel("HAPPY", config)
  translate(0, viewport.pixel(0.2))
  renderLabel("NEW YEAR!", config)
  pop()
}

function drawYearLabels() {
  // Derived Display State
  let displayYear = animator._running ? year.previous : year.current

  // Previous Year (Gray)
  push()
  translate(layout.yearSub.x, layout.yearSub.y)
  renderLabel(displayYear - 1 + ":", {
    size: 0.1,
    align: [RIGHT, BOTTOM],
    color: CONFIG.COLORS.SUB,
    style: NORMAL
  })
  pop()

  // Current Year (Black)
  push()
  translate(layout.yearMain.x, layout.yearMain.y)
  renderLabel(displayYear + ":", {
    size: 0.17,
    align: [RIGHT, BOTTOM],
    color: CONFIG.COLORS.MAIN,
    style: NORMAL
  })
  pop()
}

function drawFooter() {
  push()
  translate(layout.footer.x, layout.footer.y)
  renderLabel("今年もよろしくお願いします。", {
    size: 0.07,
    align: [LEFT, BOTTOM],
    color: CONFIG.COLORS.MAIN,
    style: NORMAL
  })
  pop()
}

/**
 * 宣言的なラベル描画ヘルパー
 * (0, 0) に描画するため、配置には push/translate を使用することを推奨します。
 * @param {string} content - テキスト内容
 * @param {Object} config - 設定 {size: 比率, align: [h, v], color: 色, style: 書体}
 */
function renderLabel(content, config) {
  fill(config.color)
  noStroke()
  textStyle(config.style)
  textAlign(config.align[0], config.align[1])
  viewport.textSize(config.size)
  text(content, 0, 0)
}
