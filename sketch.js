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
 * 2. Layout（静的）:
 *    幾何学的配置（座標・スタイル・色）の、時間に依存しない静的な値を提供します。
 *
 * 3. Animator（動的）:
 *    幾何学的配置の、アニメーション進捗に応じて変化する動的な値を提供します。
 *    内部で Layout の静的な値を時間軸で補間しています。
 */

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
    this._margin = 0.02 // 基本マージン（2%）

    // すべての色を [R, G, B, A] 形式の配列で管理
    this.color = {
      background: [255, 255, 255, 255], // 背景色 (白)
      main: [0, 0, 0, 255], // メイン色（黒）
      sub: [120, 120, 120, 255], // サブ色（グレー）
      accent: [255, 0, 0, 255] // アクセント色（赤）
    }

    this.zodiac = {
      futureLimit: 3, // 未来方向に何年分表示するか
      pastLimit: -9, // 過去方向に何年分表示するか
      position: {
        center: { nx: 1.2, ny: 0 }, // 干支配置の中心位置
        radius: {
          nx: 1.64 * 1.25, // 干支配置の横半径比率
          ny: 1.64 * 0.8 // 干支配置の縦半径比率
        }
      },
      angle: {
        spacing: 11, // 干支どうしの間隔（度数）
        currentYear: 133, // 今年の干支が配置される基準角度
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
        current: {
          // 今年の干支は強調表示
          nBoxSize: 0.6,
          nTextSize: 0.48,
          color: this.color.main
        },
        other: {
          // その他の干支は通常表示
          nBoxSize: 0.3,
          nTextSize: 0.24,
          color: this.color.sub
        }
      }
    }

    this.indicators = {
      nx: this.zodiac.position.center.nx,
      ny: this.zodiac.position.center.ny
    }

    this.needle = {
      nx: 1.0 - this._margin * 4,
      ny: 0,
      lengthRatio: 0.65
    }

    this.offset = {
      nx: 0,
      ny: -0.24
    }

    this.header = {
      nx: 1.0 - this._margin * 3,
      ny: -0.2
    }

    // 西暦ラベル（今年/前年）の座標
    this.currentYearLabel = this._yearLabelPosition(0)
    this.previousYearLabel = this._yearLabelPosition(-1)

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

  // 指定した相対年に対する西暦ラベルの配置座標を返す
  // (干支の箱の左下隅を基準とするポリシーを定義)
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

  _zodiacOrbit(angle) {
    const pos = this.zodiac.position
    return {
      nx: pos.center.nx + cos(angle) * pos.radius.nx,
      ny: pos.center.ny + sin(angle) * pos.radius.ny
    }
  }

  // その角度における干支の完成されたスタイル（サイズ、色、近さ）を返す
  // 近さを算出し、スタイルをモーフィング（変容）させる。
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
      nBoxSize: lerp(style.other.nBoxSize, style.current.nBoxSize, proximity),
      nTextSize: lerp(style.other.nTextSize, style.current.nTextSize, proximity),
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
    const baseAngle = angle.currentYear - relativeYear * angle.spacing

    // 2. 直接論理年ベースの補正値を解決
    const adj = angle.adjustments[relativeYear] || 0

    return baseAngle + adj
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
      nx: (target.nx - layout.needle.nx) * layout.needle.lengthRatio,
      ny: (target.ny - layout.needle.ny) * layout.needle.lengthRatio
    }
  }

  // アニメーション状態を考慮した、特定の相対年の干支の角度 [度]
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
    if (relativeYear === layout.zodiac.futureLimit) {
      alpha = this.interpolate(0, 255) // 新しい干支をフェードイン
    } else if (relativeYear === layout.zodiac.pastLimit) {
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

let targetYear
let animator
let layout
let vCanvas

function setup() {
  createCanvas(windowWidth, windowHeight)
  textFont("Noto Sans JP")
  angleMode(DEGREES)

  targetYear = new Date().getFullYear()
  animator = new Animator()
  layout = new Layout()
  vCanvas = new VirtualCanvas(width, height)

  animator.play()
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight)
  vCanvas = new VirtualCanvas(width, height)
}

function mousePressed() {
  if (animator.running) return
  targetYear++
  animator.play()
}

function draw() {
  animator.update()

  background(layout.color.background)

  vCanvas.setup()

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
    let relativeYear = layout.zodiac.pastLimit;
    relativeYear <= layout.zodiac.futureLimit;
    relativeYear++
  ) {
    const pos = animator.getZodiacPosition(relativeYear)

    push()
    vCanvas.translate(pos.nx, pos.ny)
    drawZodiac(relativeYear)
    pop()
  }
}

function drawIndicators() {
  const radius = {
    nx: 1.36 * 1.25,
    ny: 1.36 * 0.75
  }

  noFill()
  stroke(layout.color.accent)
  vCanvas.strokeWeight(0.01)
  vCanvas.arc(radius.nx * 2, radius.ny * 2, 101.5, 228)

  fill(layout.color.accent)
  noStroke()
  for (let i = 0; i < 4; i++) {
    const angle = 120 + i * 35

    push()
    vCanvas.translate(cos(angle) * radius.nx, sin(angle) * radius.ny)
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
  vCanvas.line(0, 0, vector.nx, vector.ny)
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
  const symbol = layout.zodiacSymbol(relativeYear)
  const style = animator.getZodiacStyle(relativeYear)

  fill(style.fillColor)
  stroke(style.strokeColor)
  vCanvas.strokeWeight(0.007)
  rectMode(CENTER)
  vCanvas.rect(0, 0, style.nBoxSize, style.nBoxSize)

  drawText(symbol, {
    size: style.nTextSize,
    align: [CENTER, CENTER],
    color: style.textColor,
    style: BOLD
  })
}

/**
 * テキスト描画ヘルパー。常に (0, 0) に描画する。
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
