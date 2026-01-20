hFactor という名称が、実態を理解しずらい。強調係数みたいな表現がよいか？
また、map がよくわかってないので、計算が理解しずらい
1 - (angleDist / CONFIG.WHEEL.SPACING_ANGLE) という意味？

```
const hFactor = map(angleDist, 0, CONFIG.WHEEL.SPACING_ANGLE, 1.0, 0.0, true)
```

図形位置のアジャストはやっぱり年基準で、マップとして持った方がよいか？（配列ではなく）

干支の数の定義は 12 として、描画位置としては 14 個(シフトアウト＋シフトイン＋干支の個数) あるような表現にしたほうがよいかも
今思えば、元々、AI が記述したコードもそのようになっていた

const target = layout.getWheelPositionByRatio(needleAngle)
// Vector from Start to Target
const dx = target.nx - start.nx
const dy = target.ny - start.ny
ここを layout に移動して、dx,dy を返す関数にすればよさそう。start.nx,ny は layout が知ってるはずなので。ただ、layoutと行ったり来たりするので、理解はしずらいかもなぁ。

結局 animator を layout の外におこうとすると、これ以上はシンプルにならないかなぁ

viewportの責務を拡大するのであれば、名前についても再考の余地があります。単なる『Viewport（のぞき窓）』ではなく、描画の文脈そのものを表す ViewContext や、より能動的な SketchHelper と呼ぶ方が適切かもしれません。
また、viewport.translate(nx, ny) を導入すれば、
Layout
クラスに保持されている『位置のオフセット』等も **vp.length() を介さない純粋な比率（Ratio）**で定義できるようになります。これは
Layout
クラスをデータの青写真（Blueprint）としてより純粋な状態に保つことに寄与します。」

28.2:
Viewport
から ViewContext への改名
クラスの責務が「単なるのぞき窓」から「描画のコンテキスト管理と座標変換ヘルパー」へと進化したため、実態に即した名称に変更します。

[MODIFY]
sketch.js
class Viewport → class ViewContext
インスタンス変数 viewport → view
すべての呼び出し箇所を更新。
28.3:
drawNeedle
のロジック集約
drawNeedle
内で行っているベクトルの引き算を
Layout
クラスにカプセル化し、描画関数をより宣言的にします。

[MODIFY]
sketch.js
Layout
に getNeedleVector(angle) メソッドを追加（比率ベースの {dx, dy} を返す）。
drawNeedle
をリファクタリング。

# 不採用

× viewport 機能って p5js 自体で持っていないんだろうか？ありそうな気がするんだけど
⇒ 代替はメリットなさそうなので、やめる
