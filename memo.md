図形位置のアジャストはやっぱり年基準で、マップとして持った方がよいか？（配列ではなく）

干支の数の定義は 12 として、描画位置としては 14 個(シフトアウト＋シフトイン＋干支の個数) あるような表現にしたほうがよいかも
今思えば、元々、AI が記述したコードもそのようになっていた

const target = layout.getWheelPositionByRatio(needleAngle)
// Vector from Start to Target
const dx = target.nx - start.nx
const dy = target.ny - start.ny
ここを layout に移動して、dx,dy を返す関数にすればよさそう。start.nx,ny は layout が知ってるはずなので。ただ、layoutと行ったり来たりするので、理解はしずらいかもなぁ。

結局 animator を layout の外におこうとすると、これ以上はシンプルにならないかなぁ

class ZodiacWheel の以下計算に getWheelPosition をつかえないか？
viewport.translate(layout.wheel.nx, layout.wheel.ny)
const nx = layout.wheel.radius.nx _ cos(angle)
const ny = layout.wheel.radius.ny _ sin(angle)

year が relativeYear で getZodiac を返すようなI/Fにしたら良いかも
const slotYear = year.current - relativeYear
const zodiac = Year.getZodiac(slotYear)

textSize(ratio) は textSize(nSize) が良さそう
constrainedWidth は virtualWidth

# 不採用

× viewport 機能って p5js 自体で持っていないんだろうか？ありそうな気がするんだけど
⇒ 代替はメリットなさそうなので、やめる
