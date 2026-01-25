/* --- CONFIGURATION --- */
const CONFIG = {
  COLORS: {
    BACK_GROUND: 255, // 背景色 (白)
    MAIN: 0, // メイン色（黒）
    SUB: 120, // サブ色（グレー）
    ACCENT: [255, 0, 0] // アクセント色（赤）
  },
  VIRTUAL_CANVAS: {
    OCCUPANCY_W: 0.95, // 横方向の画面占有率
    OCCUPANCY_H: 0.75 // 縦方向の画面占有率
  },
  ANIMATION: {
    SPEED: 0.1 // アニメーション速度（追従率: 0.05〜0.2程度で調整）
  }
}

/**
 * 画面サイズに対する比率ベースの座標系を提供し、1:1のアスペクト比を維持するクラス
 */
class VirtualCanvas {
  constructor(screenW, screenH) {
    let constrainedWidth = screenW * CONFIG.VIRTUAL_CANVAS.OCCUPANCY_W
    let constrainedHeight = screenH * CONFIG.VIRTUAL_CANVAS.OCCUPANCY_H
    let size = min(constrainedWidth, constrainedHeight)

    this._center = { x: screenW / 2, y: screenH / 2 }
    this._unit = size / 2 // 基準単位 (半径)
  }

  // 比率をピクセル値に変換（システムの基盤となるスケーラー）
  pixel(ratio) {
    return ratio * this._unit
  }

  textSize(nSize) {
    textSize(this.pixel(nSize))
  }

  translate(nx, ny) {
    translate(this.pixel(nx), this.pixel(ny))
  }

  circle(nSize) {
    circle(0, 0, this.pixel(nSize))
  }

  arc(nWidth, nHeight, startAngle, stopAngle) {
    arc(0, 0, this.pixel(nWidth), this.pixel(nHeight), startAngle, stopAngle)
  }

  rect(nx1, ny1, nx2, ny2) {
    rect(this.pixel(nx1), this.pixel(ny1), this.pixel(nx2), this.pixel(ny2))
  }

  line(nx1, ny1, nx2, ny2) {
    line(this.pixel(nx1), this.pixel(ny1), this.pixel(nx2), this.pixel(ny2))
  }

  text(content, nx, ny) {
    text(content, this.pixel(nx), this.pixel(ny))
  }

  strokeWeight(nWeight) {
    let px = this.pixel(nWeight)
    // 視認性確保のため、物理的な 1px を下限とする
    strokeWeight(max(1, px))
  }

  setup() {
    translate(this._center.x, this._center.y)
  }
}

class Layout {
  constructor() {
    // --- 内部幾何学パラメータ ---
    const BASE_MARGIN = 0.02 // 基本マージン（2%）

    const WHEEL_CENTER = { nx: 1.2, ny: 0 } // ホイールの中心位置（比率）
    const WHEEL_RADIUS = {
      nx: 1.64 * 1.25, // 干支ホイールの横半径比率 (0.82 * 2 * 1.25)
      ny: 1.64 * 0.8 // 干支ホイールの縦半径比率 (0.82 * 2 * 0.8)
    }

    // レイアウト全体の基準となるオフセット（全体を上下左右に微調整する）
    this.offset = {
      nx: 0,
      ny: -0.24
    }

    // --- タイムライン構成（Master） ---
    this.futureDisplayLimit = -3 // 未来方向に何年分表示するか
    this.pastDisplayLimit = 9 // 過去方向に何年分表示するか

    // 干支の配置（角度）の微調整マップ
    // キー: 相対年 (relativeYear), 値: 角度の補正度数
    this.angleAdjustments = {
      0: -1.5, // 今年 (Current)
      "-1": -4.5, // 来年 (Next)
      "-2": -2.5, // 2年後
      "-3": 0, // 3年後 (表示境界)
      "-4": 2.0 // 4年後 (補間用予備)
    }

    this.spacingAngle = 11 // 干支どうしの間隔（度数）
    this.highlightAngle = 133 // アクティブな干支を表示する基準角度

    // 1. Wheel & Zodiac Appearance
    this.wheel = {
      nx: WHEEL_CENTER.nx,
      ny: WHEEL_CENTER.ny,

      radius: {
        nx: WHEEL_RADIUS.nx,
        ny: WHEEL_RADIUS.ny
      }
    }

    this.zodiac = {
      normal: {
        nBoxSize: 0.3,
        nTextSize: 0.24,
        color: CONFIG.COLORS.SUB
      },
      highlight: {
        nBoxSize: 0.6,
        nTextSize: 0.48,
        color: CONFIG.COLORS.MAIN
      }
    }

    // 2. Functional Indicators & Background
    this.indicators = {
      nx: WHEEL_CENTER.nx,
      ny: WHEEL_CENTER.ny
    }

    this.needle = {
      nx: 1.0 - BASE_MARGIN * 4,
      ny: 0
    }

    // 3. Content Components
    this.header = {
      nx: 1.0 - BASE_MARGIN * 3,
      ny: -0.2
    }

    const mainPos = this.getWheelPosition(this.getAngleByRelativeYear(0))
    this.yearMain = {
      nx: mainPos.nx - this.zodiac.highlight.nBoxSize / 2 - BASE_MARGIN,
      ny: mainPos.ny + this.zodiac.highlight.nBoxSize / 2
    }

    const subPos = this.getWheelPosition(this.getAngleByRelativeYear(1))
    this.yearSub = {
      nx: subPos.nx - this.zodiac.normal.nBoxSize / 2 - BASE_MARGIN,
      ny: subPos.ny + this.zodiac.normal.nBoxSize / 2
    }

    this.footer = {
      nx: -1.0 + BASE_MARGIN,
      ny: 1.45
    }

    // 5. Outer Frame Geometry
    this.outerFrame = {
      nx1: -0.95,
      ny1: -0.9,
      nx2: 1.0,
      ny2: 1.05
    }
  }

  // POSITION HELPERS
  getWheelPosition(angle) {
    return {
      nx: this.wheel.nx + cos(angle) * this.wheel.radius.nx,
      ny: this.wheel.ny + sin(angle) * this.wheel.radius.ny
    }
  }

  /**
   * 指定された角度が強調位置（highlightAngle）にどれだけ「近いか」を 0.0 ~ 1.0 で返す
   */
  getProximity(angle) {
    const targetAngle = this.getAngleByRelativeYear(0)
    const dist = abs(angle - targetAngle)

    // 強調範囲（隣の干支との間隔）より離れている場合は 0 (近さなし)
    if (dist >= this.spacingAngle) {
      return 0
    }

    // 近さに応じて 1.0 (中心) 〜 0.0 (境界) を線形に返す
    return 1.0 - dist / this.spacingAngle
  }

  /**
   * その角度における干支の完成されたスタイル（サイズ、色、近さ）を返す
   */
  getZodiacStyle(angle) {
    const proximity = this.getProximity(angle)
    const { normal, highlight } = this.zodiac

    return {
      nBoxSize: lerp(normal.nBoxSize, highlight.nBoxSize, proximity),
      nTextSize: lerp(normal.nTextSize, highlight.nTextSize, proximity),
      color: lerp(normal.color, highlight.color, proximity)
    }
  }

  getAngleByRelativeYear(relativeYear = 0) {
    // 1. 論理的な「年」から直接座標（ベース角度）を算出
    const baseAngle = this.highlightAngle + relativeYear * this.spacingAngle

    // 2. 直接論理年ベースの補正値を解決
    const adjustment = this.angleAdjustments[relativeYear] || 0

    return baseAngle + adjustment
  }
}

class ZodiacGroup {
  draw() {
    for (
      let relativeYear = layout.pastDisplayLimit;
      relativeYear >= layout.futureDisplayLimit;
      relativeYear--
    ) {
      // --- 1. State: 描画データの準備 (Pure Calculation) ---
      const zodiac = year.getZodiac(relativeYear)

      // 角度とスタイルの計算
      const angle = animator.interpolate(
        layout.getAngleByRelativeYear(relativeYear - 1),
        layout.getAngleByRelativeYear(relativeYear)
      )
      const style = layout.getZodiacStyle(angle)
      const pos = layout.getWheelPosition(angle)

      // 不透明度の決定
      const opacity = this._calculateOpacity(relativeYear)

      // --- 2. Render: 描画の実行 (Side Effects) ---
      push()
      vCanvas.translate(pos.nx, pos.ny)
      this._drawZodiac(zodiac, style, opacity)
      pop()
    }
  }

  /**
   * ループ境界におけるフェード処理（不透明度）を算出する
   */
  _calculateOpacity(relativeYear) {
    if (relativeYear === layout.futureDisplayLimit) {
      return animator.interpolate(0, 255) // Fade-in
    }
    if (relativeYear === layout.pastDisplayLimit) {
      return animator.interpolate(255, 0) // Fade-out
    }
    return 255
  }

  _drawZodiac(character, style, opacity) {
    // 1. Color Definitions (Consolidated Alpha Management)
    const fillColor = colorWithAlpha(style.color, opacity)
    const strokeColor = colorWithAlpha(CONFIG.COLORS.MAIN, opacity)
    const textColor = colorWithAlpha(CONFIG.COLORS.BACK_GROUND, opacity)

    // 2. Render Box
    fill(fillColor)
    stroke(strokeColor)
    vCanvas.strokeWeight(0.007)
    rectMode(CENTER)
    vCanvas.rect(0, 0, style.nBoxSize, style.nBoxSize)

    // 3. Render Character Text
    drawText(character, {
      size: style.nTextSize,
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

  getZodiac(relativeYear) {
    const targetYear = this.value - relativeYear
    const idx = (Year.OFFSET_YEAR_0 + targetYear) % Year.ZODIACS.length
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
let vCanvas
let layout
let zodiacs

function setup() {
  createCanvas(windowWidth, windowHeight)
  textFont("Noto Sans JP")
  angleMode(DEGREES)

  year = new Year(new Date().getFullYear())
  animator = new Animator()
  zodiacs = new ZodiacGroup()

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
  vCanvas = new VirtualCanvas(width, height)
  layout = new Layout()
}

function draw() {
  animator.update()

  background(CONFIG.COLORS.BACK_GROUND)

  // 1. VirtualCanvas: Establish (0,0) at screen center
  vCanvas.setup()

  // 2. Layout: Apply compositional offset
  vCanvas.translate(layout.offset.nx, layout.offset.ny)

  drawIndicators()
  drawOuterFrame()
  drawNeedle()
  drawHeader()
  drawYearLabels()
  drawFooter()
  zodiacs.draw()
}

function mousePressed() {
  if (animator._running) return
  year.advance()
  animator.play()
}

function drawIndicators() {
  // Shared Geometry
  const radius = {
    x: 1.36 * 1.25,
    y: 1.36 * 0.75
  }

  push()
  vCanvas.translate(layout.indicators.nx, layout.indicators.ny)

  // 1. Red Arc
  noFill()
  stroke(CONFIG.COLORS.ACCENT)
  vCanvas.strokeWeight(0.01)
  // Main Arc: 101.5 to 228 degrees
  vCanvas.arc(radius.x * 2, radius.y * 2, 101.5, 228)

  // 2. Decorative Dots
  fill(CONFIG.COLORS.ACCENT)
  noStroke()
  for (let i = 0; i < 4; i++) {
    // Start at 120deg, spaced by 35deg
    const degree = 120 + i * 35

    push()
    vCanvas.translate(cos(degree) * radius.x, sin(degree) * radius.y)
    vCanvas.circle(0.06)
    pop()
  }

  pop()
}

function drawOuterFrame() {
  noFill()
  stroke(CONFIG.COLORS.MAIN)
  vCanvas.strokeWeight(0.007)
  rectMode(CORNERS)
  vCanvas.rect(
    layout.outerFrame.nx1,
    layout.outerFrame.ny1,
    layout.outerFrame.nx2,
    layout.outerFrame.ny2
  )
}

function drawNeedle() {
  const start = layout.needle
  const lengthRatio = 0.65

  // Localized Angle Interpolation
  const needleAngle = animator.interpolate(
    layout.getAngleByRelativeYear(-1),
    layout.getAngleByRelativeYear(0)
  )

  const target = layout.getWheelPosition(needleAngle)

  // Vector from Start to Target
  const dx = target.nx - start.nx
  const dy = target.ny - start.ny

  push()
  stroke(CONFIG.COLORS.ACCENT)
  vCanvas.strokeWeight(0.05)
  strokeCap(ROUND)
  vCanvas.translate(start.nx, start.ny)
  vCanvas.line(0, 0, dx * lengthRatio, dy * lengthRatio)
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
  vCanvas.translate(layout.header.nx, layout.header.ny)
  drawText("HAPPY", config)
  vCanvas.translate(0, 0.2)
  drawText("NEW YEAR!", config)
  pop()
}

function drawYearLabels() {
  // Derived Display State
  const displayYearMain = animator._running ? year.current - 1 : year.current
  const displayYearSub = animator._running ? year.current - 2 : year.current - 1

  // Previous Year (Gray)
  push()
  vCanvas.translate(layout.yearSub.nx, layout.yearSub.ny)
  drawText(displayYearSub + ":", {
    size: 0.1,
    align: [RIGHT, BOTTOM],
    color: CONFIG.COLORS.SUB,
    style: NORMAL
  })
  pop()

  // Current Year (Black)
  push()
  vCanvas.translate(layout.yearMain.nx, layout.yearMain.ny)
  drawText(displayYearMain + ":", {
    size: 0.17,
    align: [RIGHT, BOTTOM],
    color: CONFIG.COLORS.MAIN,
    style: NORMAL
  })
  pop()
}

function drawFooter() {
  push()
  vCanvas.translate(layout.footer.nx, layout.footer.ny)
  drawText("今年もよろしくお願いします。", {
    size: 0.07,
    align: [LEFT, BOTTOM],
    color: CONFIG.COLORS.MAIN,
    style: NORMAL
  })
  pop()
}

/**
 * 独自のテキスト描画ヘルパー
 * (0, 0) に描画するため、配置には push/translate を使用することを推奨します。
 * @param {string} content - テキスト内容
 * @param {Object} config - 設定 {size: 比率, align: [h, v], color: 色, style: 書体}
 */
function drawText(content, config) {
  fill(config.color)
  noStroke()
  textStyle(config.style)
  textAlign(config.align[0], config.align[1])
  vCanvas.textSize(config.size)
  vCanvas.text(content, 0, 0)
}

// --- Global Helpers ---

/**
 * Returns a p5.Color object with the specified opacity applied.
 */
function colorWithAlpha(baseColor, opacity) {
  const c = color(baseColor)
  c.setAlpha(opacity)
  return c
}
