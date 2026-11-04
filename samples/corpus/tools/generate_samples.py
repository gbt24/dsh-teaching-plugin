#!/usr/bin/env python3
"""生成 T02 可分发语料样例（仓库内提交，可重复生成）。

用法（仓库根目录）：
    /Users/gbt24/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 \
        samples/corpus/tools/generate_samples.py

依赖：Pillow、python-docx、python-pptx，以及宿主 cupsfilter（`/usr/sbin/cupsfilter`）。
所有输出都写在 samples/corpus/**，单文件 < 300KB，不含任何用户真实资料。
"""
from __future__ import annotations

import base64
import io
import json
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import parse_xml
from docx.shared import Inches, Pt
from pptx import Presentation
from pptx.util import Inches as PptInches

ROOT = Path(__file__).resolve().parents[1]  # samples/corpus
ROOT.mkdir(parents=True, exist_ok=True)
for sub in ('markdown/assets', 'text', 'pdf', 'image', 'docx', 'pptx', 'code', 'notebook', 'html', 'anomalies'):
    (ROOT / sub).mkdir(parents=True, exist_ok=True)

FONT_CANDIDATES = [
    '/System/Library/Fonts/Helvetica.ttc',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for path in FONT_CANDIDATES:
        try:
            return ImageFont.truetype(path, size)
        except Exception:  # noqa: BLE001 - 宿主字体缺失时退回默认字体
            continue
    return ImageFont.load_default()


def make_plot() -> bytes:
    """生成一张可视化示意图（PNG 字节）。"""
    img = Image.new('RGB', (480, 300), 'white')
    draw = ImageDraw.Draw(img)
    title = load_font(18)
    small = load_font(14)
    draw.text((16, 12), 'Figure: f(x) = x^2 and tangent at x=1', fill='black', font=title)
    # 坐标轴
    draw.line([(40, 260), (450, 260)], fill='black', width=2)
    draw.line([(40, 60), (40, 260)], fill='black', width=2)
    # 曲线 y = x^2（缩放）
    pts = []
    for px in range(0, 400, 4):
        x = (px - 200) / 80.0
        y = x * x
        py = 240 - y * 30
        if 60 <= py <= 258:
            pts.append((240 + px - 200, py))
    if len(pts) > 1:
        draw.line(pts, fill='steelblue', width=3)
    # 切线 y = 2x - 1
    draw.line([(120, 250), (360, 80)], fill='crimson', width=2)
    draw.text((60, 210), 'tangent slope = 2', fill='crimson', font=small)
    draw.text((300, 235), 'x', fill='black', font=small)
    buf = io.BytesIO()
    img.save(buf, format='PNG')
    return buf.getvalue()


PLOT_PNG = make_plot()
(ROOT / 'markdown/assets/derivative-plot.png').write_bytes(PLOT_PNG)
(ROOT / 'image/derivative-plot.png').write_bytes(PLOT_PNG)


# ---------------------------------------------------------------- Markdown
DERIVATIVES_MD = """# 导数与变化率

导数描述函数在一点处的瞬时变化率，是微积分的核心概念之一。英文术语为 derivative。

## 直观定义

当自变量的增量趋近于零时，差商的极限就是导数：

$$
f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}
$$

如果该极限存在，则称函数在 $x$ 处可导（differentiable）。

## 计算示例

对 $f(x) = x^2$ 求导，由幂函数法则得到 $f'(x) = 2x$。
在 $x = 1$ 处，切线斜率为 2。

![三次函数示意图](assets/derivative-plot.png)

## 常用求导法则

- 幂函数：$(x^n)' = n x^{n-1}$
- 和法则：两个可导函数之和的导数等于导数之和
- 链式法则：复合函数求导需要乘以内层函数的导数

## 数值求导代码

```python
def numeric_derivative(f, x, h=1e-6):
    \"\"\"中心差分近似一阶导数.\"\"\"
    return (f(x + h) - f(x - h)) / (2 * h)

print(numeric_derivative(lambda t: t * t, 1.0))  # 约等于 2
```

## 概念对照

| 中文 | English | 含义 |
| --- | --- | --- |
| 导数 | derivative | 瞬时变化率 |
| 可导 | differentiable | 差商极限存在 |
| 切线 | tangent line | 局部线性近似 |

> 注意：可导必连续，但连续不一定可导；反例是 $f(x) = |x|$ 在 0 处。

### 易错点

学生常把"导数为零"直接当成"极值点"，实际还需要检查两侧符号是否变化。
"""
(ROOT / 'markdown/derivatives.md').write_text(DERIVATIVES_MD, encoding='utf-8')

OVERFITTING_MD = """# 过拟合与泛化

在机器学习中，过拟合（overfitting）指模型过度记忆训练数据、在验证数据上表现变差。

## 观察指标

- 训练误差持续下降
- 验证误差先降后升，二者出现明显间隙

## 正则化

$$
L_{\\text{reg}}(\\theta) = L(\\theta) + \\lambda \\|\\theta\\|_2^2
$$

代码示例：

```python
def gap(train_loss, valid_loss):
    return valid_loss - train_loss
```

结论：应依据验证集选择模型复杂度，而不是只看训练误差。
"""
(ROOT / 'markdown/overfitting.md').write_text(OVERFITTING_MD, encoding='utf-8')

MISSING_IMAGE_MD = """# 缺失插图样例

这段正文仍应可读，但下图引用的文件在仓库里并不存在：

![不存在的图](assets/not-here.png)

继续的正文内容用于验证抽取不会因为单张图缺失而失败。
"""
(ROOT / 'anomalies/missing-image.md').write_text(MISSING_IMAGE_MD, encoding='utf-8')


# ---------------------------------------------------------------- 纯文本
NOTES_TXT = """Limits and continuity notes
===========================

A function is continuous at a point when the left-hand limit, right-hand
limit and the function value all agree.

Epsilon-delta definition:
  for every epsilon > 0 there exists delta > 0 such that
  |x - a| < delta implies |f(x) - f(a)| < epsilon.

中文备注：极限存在要求左右极限相等；连续还要求函数值等于极限值。

Example:
  f(x) = (x^2 - 1) / (x - 1) is undefined at x = 1, but the limit is 2.
  f(x) = |x| at x = 0 is continuous yet not differentiable.

Key terms: limit, continuity, epsilon-delta, removable discontinuity.
"""
(ROOT / 'text/limits-notes.txt').write_text(NOTES_TXT, encoding='utf-8')


# ---------------------------------------------------------------- 文字 PDF（cupsfilter）
PDF_TXT = """Derivative Rules - A Very Short Handout

The derivative of a function measures its instantaneous rate of change.
For a power function the rule is simple: d/dx x^n = n x^(n-1).

Examples:
  f(x) = x^2      =>  f'(x) = 2x
  f(x) = 3x + 1   =>  f'(x) = 3

The chain rule composes derivatives:
  d/dx f(g(x)) = f'(g(x)) * g'(x)

A function that is differentiable at a point is also continuous there,
but continuity does not imply differentiability. The absolute value |x|
is the standard counterexample at x = 0.

Practice: compute the derivative of x^3 + 2x at x = 1 (answer: 5).
"""
text_tmp = ROOT / 'pdf/.derivative-source.txt'
text_tmp.write_text(PDF_TXT, encoding='utf-8')
try:
    result = subprocess.run(
        ['/usr/sbin/cupsfilter', str(text_tmp)],
        capture_output=True, check=True,
    )
    (ROOT / 'pdf/derivative-rules.pdf').write_bytes(result.stdout)
finally:
    text_tmp.unlink(missing_ok=True)


# ---------------------------------------------------------------- 扫描页 PDF + 图片
def make_scan_image() -> Image.Image:
    img = Image.new('RGB', (900, 620), 'white')
    draw = ImageDraw.Draw(img)
    big = load_font(34)
    small = load_font(24)
    draw.text((50, 40), 'Scanned Calculus Notes', fill='black', font=big)
    draw.text((50, 130), 'Limit definition: f\'(a) = lim h->0 (f(a+h)-f(a))/h', fill='black', font=small)
    draw.text((50, 200), 'Example: f(x) = x^2 => f\'(x) = 2x', fill='black', font=small)
    draw.text((50, 270), 'The tangent line at x = 1 has slope 2.', fill='black', font=small)
    draw.text((50, 340), 'Chain rule: (f(g(x)))\' = f\'(g(x)) g\'(x)', fill='black', font=small)
    # 轻微噪声线，模拟扫描质量
    for y in range(430, 600, 6):
        draw.line([(50, y), (850, y)], fill=(230, 230, 230), width=1)
    return img


scan = make_scan_image()
scan.save(ROOT / 'image/scanned-notes.png')
scan.save(ROOT / 'pdf/scanned-notes.pdf')


# ---------------------------------------------------------------- Word (.docx)
def build_docx() -> None:
    doc = Document()
    doc.add_heading('导数讲义：从定义到应用', level=1)
    doc.add_paragraph('本讲义用于知识库导入测试。第一段介绍导数的直观含义与英文术语 derivative。')
    doc.add_heading('一、定义', level=2)
    p = doc.add_paragraph()
    p.add_run('导数是差商的极限。公式：')
    math_xml = (
        '<m:oMath xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">'
        '<m:r><m:t>f′(x)=lim_(h→0) (f(x+h)−f(x))/h</m:t></m:r>'
        '</m:oMath>'
    )
    p._p.append(parse_xml(math_xml))
    doc.add_paragraph('若极限存在，则函数在该点可导（differentiable）。')

    doc.add_heading('二、求导法则', level=2)
    doc.add_paragraph('幂函数法则：d/dx x^n = n x^(n-1)。', style='List Bullet')
    doc.add_paragraph('链式法则：复合函数需要乘以内层导数。', style='List Bullet')
    doc.add_paragraph('学生常见错误：把导数为零直接当作极值点。', style='List Bullet')

    table = doc.add_table(rows=3, cols=3)
    table.style = 'Table Grid'
    header = ['中文', 'English', '含义']
    for i, text in enumerate(header):
        table.cell(0, i).text = text
    rows = [
        ('导数', 'derivative', '瞬时变化率'),
        ('可导', 'differentiable', '差商极限存在'),
    ]
    for r, row in enumerate(rows, start=1):
        for c, text in enumerate(row):
            table.cell(r, c).text = text

    doc.add_heading('三、图示', level=2)
    doc.add_paragraph('图 1 给出抛物线及其在 x=1 处的切线。')
    pic_para = doc.add_paragraph()
    pic_para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = pic_para.add_run()
    run.add_picture(io.BytesIO(PLOT_PNG), width=Inches(3.2))
    caption = doc.add_paragraph('图 1：f(x) = x^2 与 x=1 处切线（slope = 2）')
    caption.runs[0].italic = True
    doc.add_paragraph('结尾：练习请计算 x^3 + 2x 在 x=1 处的导数。')
    for paragraph in doc.paragraphs:
        for run in paragraph.runs:
            run.font.name = 'Helvetica'
            run.font.size = Pt(11)
    doc.save(ROOT / 'docx/derivative-lecture.docx')


build_docx()


# ---------------------------------------------------------------- PowerPoint (.pptx)
def build_pptx() -> None:
    prs = Presentation()
    # 幻灯片 1：标题 + 要点
    slide = prs.slides.add_slide(prs.slide_layouts[1])
    slide.shapes.title.text = '导数 Derivative'
    body = slide.placeholders[1].text_frame
    body.text = '瞬时变化率：瞬时速度、切线斜率'
    body.add_paragraph().text = '公式 f\'(x) = lim h->0 (f(x+h)-f(x))/h'
    body.add_paragraph().text = '可导必连续，连续不一定可导'

    # 幻灯片 2：表格 + 图片
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    slide.shapes.title.text = '对照表与图示'
    rows, cols = 2, 2
    table_shape = slide.shapes.add_table(rows, cols, PptInches(1), PptInches(2), PptInches(4), PptInches(1.5))
    table = table_shape.table
    table.cell(0, 0).text = '术语'
    table.cell(0, 1).text = 'Term'
    table.cell(1, 0).text = '导数'
    table.cell(1, 1).text = 'derivative'
    slide.shapes.add_picture(io.BytesIO(PLOT_PNG), PptInches(5.2), PptInches(2), width=PptInches(4))
    slide.notes_slide.notes_text_frame.text = '备注：强调切线的几何意义。'

    # 幻灯片 3：公式页
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    box = slide.shapes.add_textbox(PptInches(1), PptInches(1.5), PptInches(8), PptInches(3))
    tf = box.text_frame
    tf.text = '链式法则 Chain rule'
    tf.add_paragraph().text = '(f(g(x)))\' = f\'(g(x)) * g\'(x)'
    tf.add_paragraph().text = '练习：求 sin(2x) 的导数。'
    prs.save(ROOT / 'pptx/derivative-slides.pptx')


build_pptx()


# ---------------------------------------------------------------- 代码
(ROOT / 'code/derivative.py').write_text('''"""数值导数示例（用于知识库代码检索测试）。"""

from __future__ import annotations


def numeric_derivative(f, x: float, h: float = 1e-6) -> float:
    """中心差分：数值近似 f'(x)。"""
    return (f(x + h) - f(x - h)) / (2 * h)


def chain_rule_demo(f, g, x: float) -> float:
    """链式法则的数值演示。"""
    return numeric_derivative(f, g(x)) * numeric_derivative(g, x)


if __name__ == "__main__":
    print(numeric_derivative(lambda t: t * t, 1.0))  # 约等于 2.0
    print(chain_rule_demo(lambda u: u * u, lambda t: 2 * t + 1, 0.5))
''', encoding='utf-8')

(ROOT / 'code/derivative.scm').write_text(''';;; Scheme 版数值导数（SICP 风格）
(define (cube x) (* x x x))

(define (deriv f dx)
  (lambda (x)
    (/ (- (f (+ x dx)) (f (- x dx)))
       (* 2 dx))))

(define d-cube (deriv cube 0.00001))
;; (d-cube 2) => 约 12.0
''', encoding='utf-8')


# ---------------------------------------------------------------- Notebook
def build_notebook() -> None:
    image_b64 = base64.b64encode(PLOT_PNG).decode('ascii')
    notebook = {
        'cells': [
            {
                'cell_type': 'markdown',
                'metadata': {},
                'source': [
                    '# Notebook：导数实验\n',
                    '\n',
                    '公式：$f\'(x) = \\\\lim_{h\\\\to 0} \\\\frac{f(x+h)-f(x)}{h}$',
                ],
            },
            {
                'cell_type': 'code',
                'execution_count': 1,
                'metadata': {},
                'outputs': [
                    {
                        'name': 'stdout',
                        'output_type': 'stream',
                        'text': ['数值导数结果: 2.0000000001\n'],
                    },
                ],
                'source': [
                    'def numeric_derivative(f, x, h=1e-6):\n',
                    '    return (f(x + h) - f(x - h)) / (2 * h)\n',
                    '\n',
                    'print("数值导数结果:", numeric_derivative(lambda t: t * t, 1.0))\n',
                ],
            },
            {
                'cell_type': 'markdown',
                'metadata': {},
                'source': ['## 图示\n', '\n', '下图展示抛物线与切线：'],
            },
            {
                'cell_type': 'code',
                'execution_count': 2,
                'metadata': {},
                'outputs': [
                    {
                        'data': {'image/png': image_b64, 'text/plain': ['<Figure size 480x300>']},
                        'metadata': {},
                        'output_type': 'display_data',
                    },
                ],
                'source': ['plot_tangent()'],
            },
        ],
        'metadata': {
            'kernelspec': {'display_name': 'Python 3', 'language': 'python', 'name': 'python3'},
            'language_info': {'name': 'python', 'version': '3.12'},
        },
        'nbformat': 4,
        'nbformat_minor': 5,
    }
    (ROOT / 'notebook/derivative-lab.ipynb').write_text(
        json.dumps(notebook, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


build_notebook()


# ---------------------------------------------------------------- HTML
HTML = """<!doctype html>
<html lang="zh">
<head><meta charset="utf-8"><title>极限与连续 - HTML 讲义</title></head>
<body>
  <h1>极限与连续</h1>
  <p>极限描述函数值趋近的过程；英文术语为 <strong>limit</strong>。连续要求左极限、右极限与函数值一致。</p>
  <h2>定义</h2>
  <script type="math/tex">\\forall \\epsilon > 0, \\exists \\delta > 0: |x-a| < \\delta \\Rightarrow |f(x)-f(a)| < \\epsilon</script>
  <p>上面的公式是 epsilon-delta 定义。</p>
  <h2>示例代码</h2>
  <pre><code class="language-python">def is_continuous(f, a):
    return limit_left(f, a) == limit_right(f, a) == f(a)
</code></pre>
  <h2>图示</h2>
  <img src="../image/derivative-plot.png" alt="抛物线示意图" title="抛物线">
  <h2>对照表</h2>
  <table>
    <tr><th>中文</th><th>English</th></tr>
    <tr><td>极限</td><td>limit</td></tr>
    <tr><td>连续</td><td>continuous</td></tr>
  </table>
  <p>外部图片（不下载）：<img src="https://example.invalid/figure.png" alt="外链图"></p>
</body>
</html>
"""
(ROOT / 'html/limits.html').write_text(HTML, encoding='utf-8')


# ---------------------------------------------------------------- 异常样例
(ROOT / 'anomalies/unknown.xyz').write_text(
    'This file has an extension the corpus does not support.\n第二行：未知扩展名。\n',
    encoding='utf-8')

long_lines = []
for i in range(1500):
    long_lines.append(
        f'第{i:04d}行：导数的定义是差商的极限。Derivative is the limit of the difference quotient. '
        '这一行用于验证超长文本截断与问题清单。\n'
    )
(ROOT / 'anomalies/long-text.txt').write_text(''.join(long_lines), encoding='utf-8')

valid_pdf = (ROOT / 'pdf/derivative-rules.pdf').read_bytes()
corrupt_comment = '\n%%% 人为损坏的 PDF，用于异常样例\n'.encode('utf-8')
(ROOT / 'pdf/corrupt.pdf').write_bytes(b'%PDF-1.4\n' + valid_pdf[:200] + corrupt_comment)

print('samples generated under', ROOT)
for path in sorted(ROOT.rglob('*')):
    if path.is_file() and path.name != 'generate_samples.py':
        print(f'{path.relative_to(ROOT)}  {path.stat().st_size} bytes')
