# SICP 摘录：递归与迭代过程（教学验收样例）

## 1. 递归过程与迭代过程

考虑计算阶乘的过程。递归版本：

```scheme
(define (factorial n)
  (if (= n 1)
      1
      (* n (factorial (- n 1)))))
```

这个过程的展开形状是「先展开后收缩」：计算 `(factorial 5)` 时先展开为 `(* 5 (* 4 (* 3 (* 2 (factorial 1)))))`，再逐层收缩。
因此它的空间需求随 n 线性增长（需要保存待执行乘法的链条）。

## 2. 迭代版本

```scheme
(define (factorial n)
  (define (iter product counter)
    (if (> counter n)
        product
        (iter (* counter product) (+ counter 1))))
  (iter 1 1))
```

迭代过程的状态完全由变量描述，任何时刻只需保存固定数量的状态；其空间需求为常数。

## 3. 常见误区

- 语法上「递归定义的函数」不一定产生递归过程；尾递归调用在 Scheme 中产生迭代过程。
- 递归过程与迭代过程的区别在于「计算的展开方式」，而不在于函数是否调用自身。
- 尾递归优化并不改变语义，只改变空间行为。

## 4. 练习

给定 `(define (f n) (if (= n 0) 0 (+ 1 (f (- n 1)))))`，判断 f 是递归过程还是迭代过程，并说明理由。
