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
  constructor(animator, year) {
    this._animator = animator
    this._year = year
    // --- 内部幾何学パラメータ ---
    this._margin = 0.02 // 基本マージン（2%）

    // 1. Zodiac (干支): レイアウト全体のアンカー
    this.zodiac = {
      position: {
        center: { nx: 1.2, ny: 0 }, // 干支配置の中心位置
        radius: {
          nx: 1.64 * 1.25, // 干支配置の横半径比率
          ny: 1.64 * 0.8 // 干支配置の縦半径比率
        }
      },
      angle: {
        spacing: 11, // 干支どうしの間隔（度数）
        highlight: 133, // アクティブな干支を表示する基準角度
        // 干支の配置（角度）の微調整マップ
        // キー: 相対年 (relativeYear), 値: 角度の補正度数
        adjustments: {
          0: -1.5, // 今年 (Current)
          "-1": -4.5, // 来年 (Next)
          "-2": -2.5, // 2年後
          "-3": 0, // 3年後 (表示境界)
          "-4": 2.0 // 4年後 (補間用予備)
        }
      },
      style: {
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
    }

    // 2. Indicators (指示器): 背面の赤い円弧や装飾
    this.indicators = {
      nx: this.zodiac.position.center.nx,
      ny: this.zodiac.position.center.ny
    }

    // 3. Needle (針): アクティブな干支を指す赤い針
    this.needle = {
      nx: 1.0 - this._margin * 4,
      ny: 0,
      lengthRatio: 0.65
    }

    // 4. UI Elements: レイアウト全体の基準となるオフセットや枠
    this.offset = {
      nx: 0,
      ny: -0.24
    }

    this.header = {
      nx: 1.0 - this._margin * 3,
      ny: -0.2
    }

    // 西暦ラベル（Main/Sub）の座標
    this.yearMain = this._getYearLabelPosition(0)
    this.yearSub = this._getYearLabelPosition(1)

    // 5. Timeline Configuration (Master)
    this.futureDisplayLimit = -3 // 未来方向に何年分表示するか
    this.pastDisplayLimit = 9 // 過去方向に何年分表示するか

    this.footer = {
      nx: -1.0 + this._margin,
      ny: 1.45
    }

    this.outerFrame = {
      nx: -0.95,
      ny: -0.9,
      width: 1.95,
      height: 1.95
    }
  }

  // POSITION HELPERS
  /**
   * 指定した相対年に対する西暦ラベルの配置座標を返す
   * (干支の箱の左下隅を基準とするポリシーを定義)
   */
  _getYearLabelPosition(relativeYear) {
    const angle = this.getZodiacAngle(relativeYear)
    const pos = this.getZodiacPosition(angle)
    const style = this.getZodiacStyle(angle)

    const offset = style.nBoxSize / 2
    return {
      nx: pos.nx - offset - this._margin,
      ny: pos.ny + offset
    }
  }

  /**
   * 現在のアニメーション進捗に基づいた干支の角度を取得する
   */
  _getCurrentZodiacAngle(relativeYear) {
    return this._animator.interpolate(
      this.getZodiacAngle(relativeYear - 1),
      this.getZodiacAngle(relativeYear)
    )
  }

  /**
   * 現在のアニメーション状態に基づき、メインとして表示すべき西暦（数値）を返す
   */
  getMainYearValue() {
    return this._animator._running ? this._year.current - 1 : this._year.current
  }

  /**
   * その年の干支を描画するための全状態（座標、スタイル、不透明度）を返す
   */
  getZodiacState(relativeYear) {
    const zodiac = this._year.getZodiac(relativeYear)
    const angle = this._getCurrentZodiacAngle(relativeYear)
    const pos = this.getZodiacPosition(angle)
    const style = this.getZodiacStyle(angle)
    const alpha = this._getZodiacAlpha(relativeYear)

    return { zodiac, pos, style, alpha }
  }

  /**
   * ループ境界におけるフェード処理（アルファ値）を算出する
   */
  _getZodiacAlpha(relativeYear) {
    if (relativeYear === this.futureDisplayLimit) {
      return this._animator.interpolate(0, 255) // Fade-in
    }
    if (relativeYear === this.pastDisplayLimit) {
      return this._animator.interpolate(255, 0) // Fade-out
    }
    return 255
  }

  getZodiacPosition(angle) {
    const pos = this.zodiac.position
    return {
      nx: pos.center.nx + cos(angle) * pos.radius.nx,
      ny: pos.center.ny + sin(angle) * pos.radius.ny
    }
  }

  /**
   * 指定された角度が強調位置（highlightAngle）にどれだけ「近いか」を 0.0 ~ 1.0 で返す
   */
  getProximity(angle) {
    const targetAngle = this.getZodiacAngle(0)
    const dist = abs(angle - targetAngle)

    // 強調範囲（隣の干支との間隔）より離れている場合は 0 (近さなし)
    if (dist >= this.zodiac.angle.spacing) {
      return 0
    }

    // 近さに応じて 1.0 (中心) 〜 0.0 (境界) を線形に返す
    return 1.0 - dist / this.zodiac.angle.spacing
  }

  /**
   * その角度における干支の完成されたスタイル（サイズ、色、近さ）を返す
   */
  getZodiacStyle(angle) {
    const style = this.zodiac.style
    const proximity = this.getProximity(angle)

    return {
      nBoxSize: lerp(style.normal.nBoxSize, style.highlight.nBoxSize, proximity),
      nTextSize: lerp(style.normal.nTextSize, style.highlight.nTextSize, proximity),
      color: lerp(style.normal.color, style.highlight.color, proximity)
    }
  }

  getZodiacAngle(relativeYear = 0) {
    const angle = this.zodiac.angle
    // 1. 論理的な「年」から直接座標（ベース角度）を算出
    const baseAngle = angle.highlight + relativeYear * angle.spacing

    // 2. 直接論理年ベースの補正値を解決
    const adj = angle.adjustments[relativeYear] || 0

    return baseAngle + adj
  }

  /**
   * 現在のアニメーション進捗に基づいた針の相対ベクトル（向き）を返す
   */
  getNeedleVector() {
    const angle = this._getCurrentZodiacAngle(0)
    const target = this.getZodiacPosition(angle)
    return {
      dx: (target.nx - this.needle.nx) * this.needle.lengthRatio,
      dy: (target.ny - this.needle.ny) * this.needle.lengthRatio
    }
  }
}

class ZodiacGroup {
  draw() {
    for (
      let relativeYear = layout.pastDisplayLimit;
      relativeYear >= layout.futureDisplayLimit;
      relativeYear--
    ) {
      const state = layout.getZodiacState(relativeYear)

      push()
      vCanvas.translate(state.pos.nx, state.pos.ny)
      this._drawZodiac(state)
      pop()
    }
  }

  _drawZodiac(state) {
    const { zodiac, style, alpha } = state

    fill(colorWithAlpha(style.color, alpha))
    stroke(colorWithAlpha(CONFIG.COLORS.MAIN, alpha))
    vCanvas.strokeWeight(0.007)
    rectMode(CENTER)
    vCanvas.rect(0, 0, style.nBoxSize, style.nBoxSize)

    drawText(zodiac, {
      size: style.nTextSize,
      align: [CENTER, CENTER],
      color: colorWithAlpha(CONFIG.COLORS.BACK_GROUND, alpha),
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
  layout = new Layout(animator, year)
}

function draw() {
  animator.update()

  background(CONFIG.COLORS.BACK_GROUND)

  // 1. VirtualCanvas: Establish (0,0) at screen center
  vCanvas.setup()

  // 2. Layout: Apply compositional offset
  vCanvas.translate(layout.offset.nx, layout.offset.ny)

  push()
  vCanvas.translate(layout.indicators.nx, layout.indicators.ny)
  drawIndicators()
  pop()

  push()
  vCanvas.translate(layout.outerFrame.nx, layout.outerFrame.ny)
  drawOuterFrame()
  pop()

  push()
  vCanvas.translate(layout.needle.nx, layout.needle.ny)
  drawNeedle()
  pop()

  push()
  vCanvas.translate(layout.header.nx, layout.header.ny)
  drawHeader()
  pop()

  drawYearLabels()

  push()
  vCanvas.translate(layout.footer.nx, layout.footer.ny)
  drawFooter()
  pop()

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
}

function drawOuterFrame() {
  noFill()
  stroke(CONFIG.COLORS.MAIN)
  vCanvas.strokeWeight(0.007)
  rectMode(CORNER)
  vCanvas.rect(0, 0, layout.outerFrame.width, layout.outerFrame.height)
}

function drawNeedle() {
  const vector = layout.getNeedleVector()

  push()
  stroke(CONFIG.COLORS.ACCENT)
  vCanvas.strokeWeight(0.05)
  strokeCap(ROUND)
  vCanvas.line(0, 0, vector.dx, vector.dy)
  pop()
}

function drawHeader() {
  const config = {
    size: 0.24,
    align: [RIGHT, CENTER],
    color: CONFIG.COLORS.MAIN,
    style: BOLDITALIC
  }

  drawText("HAPPY", config)
  vCanvas.translate(0, 0.2)
  drawText("NEW YEAR!", config)
}

function drawYearLabels() {
  const displayYearMain = layout.getMainYearValue()
  const displayYearSub = displayYearMain - 1

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
  drawText("今年もよろしくお願いします。", {
    size: 0.07,
    align: [LEFT, BOTTOM],
    color: CONFIG.COLORS.MAIN,
    style: NORMAL
  })
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
