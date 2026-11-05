---
title: 导数概念
created: 2026-11-05
updated: 2026-11-05
type: concept
tags: [ch02, definition, exam-focus]
sources: [raw/articles/source-notes.md]
confidence: high
---

# 导数概念

导数描述函数在某一点处的瞬时变化率，是差商的极限，几何上对应切线斜率。

## 定义

$$f'(x_0) = \lim_{\Delta x \to 0} \frac{f(x_0 + \Delta x) - f(x_0)}{\Delta x}$$

## 几何意义

$f'(x_0)$ 是曲线 $y = f(x)$ 在点 $(x_0, f(x_0))$ 处切线的斜率。

## 可导与连续

可导必连续，连续不一定可导（如 $y = |x|$ 在 $x = 0$ 处）。

## 相关概念

- [[limit-concept]] — 导数定义为极限
- [[derivative-rules]] — 由定义推导求导法则
- [[continuity-concept]] — 可导与连续的关系
