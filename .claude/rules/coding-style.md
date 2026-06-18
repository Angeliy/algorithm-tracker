---
description: 代码风格规范，基于 Biome + Ultracite 配置推断
---

# 代码风格

## 格式化
- 缩进：**Tab**（不用空格）
- 字符串引号：**双引号**（JS/TS）
- 运行 `pnpm fix` 可自动修复全部格式问题

## Import 排序
Biome assist 自动排序 import，提交前会通过 husky pre-commit 触发 `ultracite fix` 整理。

## TypeScript 规范
- 禁止参数赋值（`noParameterAssign`）
- 字面量对象必须用 `as const`（`useAsConstAssertion`）
- 不写可推断类型（`noInferrableTypes`）——让 TS 自行推断
- 禁止无用的 `else`（`noUselessElse`）——改用提前返回
- 枚举成员必须显式赋值（`useEnumInitializers`）

## JSX
- 无子元素的组件使用自闭合标签（`useSelfClosingElements`）
- Tailwind 类名通过 `cn`/`clsx`/`cva` 传入时，Biome 会自动排序

## 命名约定
- 组件文件：`kebab-case.tsx`（如 `sign-in-form.tsx`）
- 工具函数：`camelCase`
- 类型/接口：`PascalCase`
