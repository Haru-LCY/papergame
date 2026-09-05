# Paper2 逆转裁判

一个仿 Paper2Gal 的独立互动教学样例：玩家扮演辩护人，在“消失的上下文”案件中，通过交叉询问与提交证物，理解 AgentGit 的 `repo`、`VIEW`、`commit`、`branch`、`merge`。

## 运行

需要 Node.js 18+：

```bash
npm install
npm run dev
```

然后打开终端提示的本地地址。生产构建：

```bash
npm run build
npm run preview
```

游戏完全是前端静态逻辑，不需要账号、后端或 API key；进度只保存在当前页面内。

## 灵感与技术考察

`paper2gal.com` 官方站说明 Paper2Gal 是专有软件，源码不公开。因此本项目只借鉴“把知识拆成视觉小说章节、角色对白、选择题和证物面板”的交互形式，不复制其品牌素材或实现。

公开可参考的社区实现：

- [Nova42x/paper2galgame](https://github.com/Nova42x/paper2galgame)：React 19 + TypeScript + Vite + Gemini SDK，组件化实现视觉小说对话、文件上传和 AI 生成。
- [gitveg/paper2gal](https://github.com/gitveg/paper2gal)：Streamlit + PDF 解析 + LLM 剧本引擎，支持 UI 与 headless 模式。

本样例为了可离线试玩，使用 React + TypeScript + Vite，证物与剧情写成确定性的本地数据，不连接模型。
