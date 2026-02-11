/**
 * --- 年賀状干支アニメーション：設計思想 ---
 *
 * 本プロジェクトは「Simplicity First（単純さ優先）」と「関心の分離」を軸に、
 * 以下の3層構造で構築されています：
 *
 * 1. Virtualization (VirtualCanvas):
 *    物理的な画面レイアウトを「-1.0 〜 1.0」の比率座標に変換します。
 *    これにより、デバイスの解像度に関わらず、数学的に直感的な配置が可能になります。
 *
 * 2. Logic & SSOT (Layout):
 *    幾何学的計算（どこに何があるか）を全てこのクラスに集約します。
 *    描画命令は一切持たず、ピュアな「真実の計算元」として機能します。
 *
 * 3. Animation State (Animator):
 *    「目的地に向かう時間（0.0 〜 1.0）」の進捗のみを管理します。
 *    Layout はこの進捗を受け取り、時間軸上の座標を計算し、描画関数へ渡します。
 */

/* --- CONFIGURATION --- */
const CONFIG = {
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
 * 職責：座標・スケーリングの専門家。比率を受け取りピクセルを返す。色の知識は持たない。
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

/**
 * 全ての幾何学的配置と表示スタイルを計算し、一元管理するクラス (Single Source of Truth)
 * 職責：配置の専門家。描画命令（fill, stroke等）は呼んではならない。
 * 座標計算とスタイルのモーフィング（変容）の方針のみを解決する。
 */
class Layout {
  constructor() {
    // --- 内部幾何学パラメータ ---
    this._margin = 0.02 // 基本マージン（2%）

    // 1. Colors: すべての色を [R, G, B, A] 形式の配列で管理
    this.color = {
      background: [255, 255, 255, 255], // 背景色 (白)
      main: [0, 0, 0, 255], // メイン色（黒）
      sub: [120, 120, 120, 255], // サブ色（グレー）
      accent: [255, 0, 0, 255] // アクセント色（赤）
    }

    // 2. Zodiac (干支): レイアウト全体のアンカー
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
          1: -4.5, // 来年 (Next)
          2: -2.5, // 2年後
          3: 0, // 3年後 (表示境界)
          4: 2.0 // 4年後 (補間用予備)
        }
      },
      style: {
        normal: {
          nBoxSize: 0.3,
          nTextSize: 0.24,
          color: this.color.sub
        },
        highlight: {
          nBoxSize: 0.6,
          nTextSize: 0.48,
          color: this.color.main
        }
      }
    }

    // 3. Indicators (指示器): 背面の赤い円弧や装飾
    this.indicators = {
      nx: this.zodiac.position.center.nx,
      ny: this.zodiac.position.center.ny
    }

    // 4. Needle (針): アクティブな干支を指す赤い針
    this.needle = {
      nx: 1.0 - this._margin * 4,
      ny: 0,
      lengthRatio: 0.65
    }

    // 5. UI Elements: レイアウト全体の基準となるオフセットや枠
    this.offset = {
      nx: 0,
      ny: -0.24
    }

    this.header = {
      nx: 1.0 - this._margin * 3,
      ny: -0.2
    }

    // 西暦ラベル（Current/Previous）の座標
    this.currentYearLabel = this._yearLabelPosition(0)
    this.previousYearLabel = this._yearLabelPosition(-1)

    // 6. Timeline Configuration (Master)
    this.futureDisplayLimit = 3 // 未来方向に何年分表示するか
    this.pastDisplayLimit = -9 // 過去方向に何年分表示するか

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
  _yearLabelPosition(relativeYear) {
    const angle = this._zodiacBaseAngle(relativeYear)
    const pos = this._zodiacOrbit(angle)
    const style = this._morphedZodiacStyle(angle)

    const offset = style.nBoxSize / 2
    return {
      nx: pos.nx - offset - this._margin,
      ny: pos.ny + offset
    }
  }

  /**
   * その年の干支を描画するための記号を返す
   */
  zodiacSymbol(relativeYear) {
    const symbols = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
    const offset = 8 // 西暦0年の干支は(8:申)である

    const absoluteYear = targetYear + relativeYear
    const idx = (offset + absoluteYear) % symbols.length
    return symbols[idx]
  }

  _zodiacOrbit(angle) {
    const pos = this.zodiac.position
    return {
      nx: pos.center.nx + cos(angle) * pos.radius.nx,
      ny: pos.center.ny + sin(angle) * pos.radius.ny
    }
  }

  /**
   * その角度における干支の完成されたスタイル（サイズ、色、近さ）を返す
   * 近さを算出し、スタイルをモーフィング（変容）させる。
   */
  _morphedZodiacStyle(angle) {
    // 基準位置からの距離に基づき、変形の度合い（1.0〜0.0）を算出
    const dist = abs(angle - this._zodiacBaseAngle(0))
    let proximity = 1.0 - dist / this.zodiac.angle.spacing

    // 強調範囲（spacing）より離れている場合は 0
    if (dist >= this.zodiac.angle.spacing) {
      proximity = 0
    }

    // 近さに応じてスタイルをモーフィング
    const style = this.zodiac.style
    return {
      nBoxSize: lerp(style.normal.nBoxSize, style.highlight.nBoxSize, proximity),
      nTextSize: lerp(style.normal.nTextSize, style.highlight.nTextSize, proximity),
      // 色のモーフィング。結果として [R, G, B, 255] 形式を維持する。
      color: [
        lerp(this.color.sub[0], this.color.main[0], proximity),
        lerp(this.color.sub[1], this.color.main[1], proximity),
        lerp(this.color.sub[2], this.color.main[2], proximity),
        255
      ]
    }
  }

  _zodiacBaseAngle(relativeYear = 0) {
    const angle = this.zodiac.angle
    // 1. 論理的な「年」から直接座標（ベース角度）を算出
    // 未来(relativeYear > 0)を反時計回り(角度減少)方向に配置する
    const baseAngle = angle.highlight - relativeYear * angle.spacing

    // 2. 直接論理年ベースの補正値を解決
    const adj = angle.adjustments[relativeYear] || 0

    return baseAngle + adj
  }
}

/**
 * アニメーションの進捗状態を管理するクラス
 * 職責：時間の専門家。ただひとつの進捗（progress）を Ease-Out で更新し続ける。
 * 何が動くか（干支か針か）といった具体的な描画内容には関知しない。
 */
class Animator {
  constructor() {
    this._progress = 1.0
    this.running = false
  }

  play() {
    this._progress = 0.0
    this.running = true
  }

  update() {
    if (!this.running) return

    // 目的地(1.0)に向かって、毎フレーム残りの距離の一定割合(SPEED)を詰める
    // これにより、到着直前にゆっくりになる滑らかな動き（Ease-Out）になる
    this._progress = lerp(this._progress, 1.0, CONFIG.ANIMATION.SPEED)

    // 目的地に十分近づいたら（誤差 5% 以内）完了とみなす
    // これは lerp が目的地に論理的に到達しないための内部的な終了処理
    const THRESHOLD = 0.05
    if (1.0 - this._progress < THRESHOLD) {
      this._progress = 1.0
      this.running = false
    }
  }

  interpolate(a, b) {
    return lerp(a, b, this._progress)
  }

  /**
   * 現在のアニメーション進捗に基づいた針の相対ベクトル（向き）を算出する
   */
  getNeedleVector() {
    // 針は今年の干支の位置を指す
    const target = this.getZodiacPosition(0)

    return {
      dx: (target.nx - layout.needle.nx) * layout.needle.lengthRatio,
      dy: (target.ny - layout.needle.ny) * layout.needle.lengthRatio
    }
  }

  /**
   * アニメーション状態を考慮した、特定の相対年の干支の角度 [度]
   */
  _zodiacAngle(relativeYear) {
    return this.interpolate(
      layout._zodiacBaseAngle(relativeYear + 1),
      layout._zodiacBaseAngle(relativeYear)
    )
  }

  /**
   * 特定の相対年に対する、現在のアニメーション進捗に基づいた座標を算出する
   */
  getZodiacPosition(relativeYear) {
    const angle = this._zodiacAngle(relativeYear)
    return layout._zodiacOrbit(angle)
  }

  /**
   * その年の干支を描画するための完成されたスタイルを返す
   */
  getZodiacStyle(relativeYear) {
    const angle = this._zodiacAngle(relativeYear)
    const style = layout._morphedZodiacStyle(angle)

    // フェード処理
    let alpha
    if (relativeYear === layout.futureDisplayLimit) {
      alpha = this.interpolate(0, 255) // 新しい干支をフェードイン
    } else if (relativeYear === layout.pastDisplayLimit) {
      alpha = this.interpolate(255, 0) // 古い干支をフェードアウト
    } else {
      alpha = 255 // その他の干支は通常表示
    }

    return {
      nBoxSize: style.nBoxSize,
      nTextSize: style.nTextSize,
      fillColor: [style.color[0], style.color[1], style.color[2], alpha],
      strokeColor: [layout.color.main[0], layout.color.main[1], layout.color.main[2], alpha],
      textColor: [
        layout.color.background[0],
        layout.color.background[1],
        layout.color.background[2],
        alpha
      ]
    }
  }

  /**
   * 現在のアニメーション状態に基づき、表示すべき西暦（数値）を返す
   */
  getDisplayedYear() {
    return this.running ? targetYear - 1 : targetYear
  }
}

// Domain State
let targetYear

// Animation State
let animator

// Layout State
let vCanvas
let layout

function setup() {
  createCanvas(windowWidth, windowHeight)
  textFont("Noto Sans JP")
  angleMode(DEGREES)

  targetYear = new Date().getFullYear()
  animator = new Animator()
  layout = new Layout()
  vCanvas = new VirtualCanvas(width, height)

  // Trigger initial animation
  animator.play()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  vCanvas = new VirtualCanvas(width, height)
}

function draw() {
  animator.update()

  background(layout.color.background)

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

  push()
  vCanvas.translate(layout.currentYearLabel.nx, layout.currentYearLabel.ny)
  drawCurrentYearLabel()
  pop()

  push()
  vCanvas.translate(layout.previousYearLabel.nx, layout.previousYearLabel.ny)
  drawPreviousYearLabel()
  pop()

  push()
  vCanvas.translate(layout.footer.nx, layout.footer.ny)
  drawFooter()
  pop()

  for (
    let relativeYear = layout.pastDisplayLimit;
    relativeYear <= layout.futureDisplayLimit;
    relativeYear++
  ) {
    const pos = animator.getZodiacPosition(relativeYear)

    push()
    vCanvas.translate(pos.nx, pos.ny)
    drawZodiac(relativeYear)
    pop()
  }
}

function mousePressed() {
  if (animator.running) return
  targetYear++
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
  stroke(layout.color.accent)
  vCanvas.strokeWeight(0.01)
  // Main Arc: 101.5 to 228 degrees
  vCanvas.arc(radius.x * 2, radius.y * 2, 101.5, 228)

  // 2. Decorative Dots
  fill(layout.color.accent)
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
  stroke(layout.color.main)
  vCanvas.strokeWeight(0.007)
  rectMode(CORNER)
  vCanvas.rect(0, 0, layout.outerFrame.width, layout.outerFrame.height)
}

function drawNeedle() {
  const vector = animator.getNeedleVector()

  push()
  stroke(layout.color.accent)
  vCanvas.strokeWeight(0.05)
  strokeCap(ROUND)
  vCanvas.line(0, 0, vector.dx, vector.dy)
  pop()
}

function drawHeader() {
  const config = {
    size: 0.24,
    align: [RIGHT, CENTER],
    color: layout.color.main,
    style: BOLDITALIC
  }

  drawText("HAPPY", config)
  vCanvas.translate(0, 0.2)
  drawText("NEW YEAR!", config)
}

function drawCurrentYearLabel() {
  const currentYear = animator.getDisplayedYear()

  drawText(currentYear + ":", {
    size: 0.17,
    align: [RIGHT, BOTTOM],
    color: layout.color.main,
    style: NORMAL
  })
}

function drawPreviousYearLabel() {
  const previousYear = animator.getDisplayedYear() - 1

  drawText(previousYear + ":", {
    size: 0.1,
    align: [RIGHT, BOTTOM],
    color: layout.color.sub,
    style: NORMAL
  })
}

function drawFooter() {
  drawText("今年もよろしくお願いします。", {
    size: 0.07,
    align: [LEFT, BOTTOM],
    color: layout.color.main,
    style: NORMAL
  })
}

function drawZodiac(relativeYear) {
  const zodiac = layout.zodiacSymbol(relativeYear)
  const style = animator.getZodiacStyle(relativeYear)

  fill(style.fillColor)
  stroke(style.strokeColor)
  vCanvas.strokeWeight(0.007)
  rectMode(CENTER)
  vCanvas.rect(0, 0, style.nBoxSize, style.nBoxSize)

  drawText(zodiac, {
    size: style.nTextSize,
    align: [CENTER, CENTER],
    color: style.textColor,
    style: BOLD
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
