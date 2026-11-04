# 过拟合与泛化

在机器学习中，过拟合（overfitting）指模型过度记忆训练数据、在验证数据上表现变差。

## 观察指标

- 训练误差持续下降
- 验证误差先降后升，二者出现明显间隙

## 正则化

$$
L_{\text{reg}}(\theta) = L(\theta) + \lambda \|\theta\|_2^2
$$

代码示例：

```python
def gap(train_loss, valid_loss):
    return valid_loss - train_loss
```

结论：应依据验证集选择模型复杂度，而不是只看训练误差。
