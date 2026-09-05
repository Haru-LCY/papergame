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

## 逆转裁判素材参考

这个样例仓库已经初始化为独立 Git 仓库，并将用户指定的参考项目克隆到了 `reference/NLP-game-project-publicver/`（该目录被 `.gitignore` 忽略，不会把 644 MB 的参考仓库历史提交进本样例）。庭审背景与三张角色头像复制到 `public/assets/` 后，用在庭审场景的背景和角色节点上；参考项目的音乐、视频与 Python 运行时代码没有被引入。

参考项目：[fzw-yinianzhijian/NLP-game-project-publicver](https://github.com/fzw-yinianzhijian/NLP-game-project-publicver)。其仓库声明为 MIT，但其中的角色、游戏画面与 Capcom 音乐仍可能包含第三方权利，详细说明见 [ATTRIBUTION.md](./ATTRIBUTION.md)。
