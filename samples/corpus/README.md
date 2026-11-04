# T02 可分发语料样例

本目录是 T02（知识库）用于自动测试与证据的**可分发小型样例**，不含任何用户真实资料或凭据。总大小约 512KB，单文件均 < 300KB。

## 生成方式

样例由脚本生成，可重复执行（需要宿主 Python + Pillow/python-docx/python-pptx + `/usr/sbin/cupsfilter`）：

```bash
/Users/gbt24/.dsh/dsh-runtimes/dsh-primary-runtime/dependencies/python/bin/python3 \
  samples/corpus/tools/generate_samples.py
```

生成脚本使用的工具链（本机实测）：Python 3.12.14、Pillow 12.3.0、python-docx、python-pptx、cupsfilter（macOS 自带）。文字 PDF 由 `cupsfilter` 从文本转换，扫描 PDF/图片由 Pillow 绘制后保存为 PNG/PDF。

## 文件清单

| 文件 | 格式 | 内容与用途 |
| --- | --- | --- |
| `markdown/derivatives.md` | Markdown | 中文导数讲义：标题层级、`$$` 块级公式、内联公式、Python 围栏代码、表格、列表、本地图片引用 |
| `markdown/overfitting.md` | Markdown | 中文机器学习讲义（变化检测测试用） |
| `markdown/assets/derivative-plot.png` | 图片 | 上述 Markdown 引用的本地图片（抛物线+切线） |
| `text/limits-notes.txt` | 纯文本 | 极限/连续笔记，含行定位、公式样式行、中英混排 |
| `pdf/derivative-rules.pdf` | 文字型 PDF | 由 `cupsfilter` 生成，验证文本抽取、页码与 bbox 定位 |
| `pdf/scanned-notes.pdf` | 扫描型 PDF | 图片页 PDF，验证扫描检测 + 宿主 OCR + 公式低置信度待核对 |
| `pdf/corrupt.pdf` | 损坏 PDF | 人为截断/拼接，验证解析失败可报告且不中止批量导入 |
| `image/scanned-notes.png` | 图片 | 扫描页图片，验证原图资产 + OCR + 低置信度问题 |
| `image/derivative-plot.png` | 图片 | 小型示意图（可作为图片导入样例） |
| `docx/derivative-lecture.docx` | Word | 标题层级、段落、OMML 公式、表格、内嵌图片、项目符号 |
| `pptx/derivative-slides.pptx` | PowerPoint | 3 张幻灯片：标题/正文、表格、图片、公式文本、演讲者备注 |
| `code/derivative.py` | 代码 | Python：语言识别、行号定位、代码检索 |
| `code/derivative.scm` | 代码 | Scheme：语言识别（SICP 风格样例） |
| `notebook/derivative-lab.ipynb` | Notebook | Markdown 单元格（含块级公式）、代码单元格、文本输出、图像输出 |
| `html/limits.html` | HTML | 标题/段落/TeX 公式/`<pre>` 代码/表格/本地图片/外链图片（不下载） |
| `anomalies/unknown.xyz` | 未知扩展名 | 验证「不支持的格式」明确失败 |
| `anomalies/missing-image.md` | Markdown | 引用不存在的图片，验证缺图问题进入待核对而正文可读 |
| `anomalies/long-text.txt` | 纯文本 | 238KB 重复文本，验证超长截断与 `truncated` 问题 |

## 说明

- 样例只用于测试解析/检索/定位/异常语义；不是教学素材质量或真实课程验收的替代。
- PDF 内容由生成脚本内嵌，无外部版权素材；图片由 Pillow 绘制。
- 真实学生资料留在用户选择的本地位置；仓库只保存这些可分发样例。
