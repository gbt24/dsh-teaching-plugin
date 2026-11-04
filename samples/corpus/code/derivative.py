"""数值导数示例（用于知识库代码检索测试）。"""

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
