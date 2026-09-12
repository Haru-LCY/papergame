# Paper2 逆转裁判

一个仿 Paper2Gal 的独立互动教学样例：玩家扮演辩护人，在“消失的上下文”案件中，通过交叉询问、提交论文证物和比较竞争性假设，真正理解论文的主张、方法与实验。

在线试玩：[https://haru-lcy.github.io/papergame/](https://haru-lcy.github.io/papergame/)

GitHub Pages 版本包含两个无需 API key 的内置案件。公开构建不会收集、嵌入或发送 API key；自定义 arXiv 案件生成仍需运行下面的 Node 服务，或另行部署保存 `DEEPSEEK_API_KEY` 的服务端代理。

## 运行

需要 Node.js 18+：

```bash
npm install
npm run dev
```

然后打开终端提示的本地地址。生产构建：

```bash
npm run build
npm run start
```

开发时 `npm run dev` 会同时挂载论文 API；生产构建后用 `npm run start` 启动同一个 Node 服务。预览静态页面仍可以使用 `npm run preview`，但要使用 arXiv 导入功能请使用前两个命令之一。

## 从 arXiv 生成新案件

选案页的 `NEW CASE / ARXIV` 输入框接受 `https://arxiv.org/abs/...`、`/pdf/...` 或 `export.arxiv.org` 链接。服务端会：

1. 校验域名与论文编号，只访问 arXiv 官方地址；
2. 读取公开元数据和 e-print TeX 源码（源码不可用时退回摘要）；
3. 使用 DeepSeek JSON Output 生成摘要、关键线索、三项选择题、正确答案和五段庭审对白；
4. 把生成的案件临时放进当前页面，和两篇内置案件一样可以完整游玩。

内置的两篇真实论文案件无需配置 key，打开页面即可试玩。只有导入自定义 arXiv 论文并生成剧情时，才需要在标题页配置玩家自己的 DeepSeek key。它只保存在当前浏览器的 localStorage，并在生成案件时通过本地服务端请求发送给 DeepSeek；不会进入前端 bundle、接口响应或 Git。开发机仍可以把单独的 `key.md` 放在项目外（本项目默认检查 `../key.md`，作为服务端回退），也支持 `DEEPSEEK_API_KEY` / `DEEPSEEK_KEY_FILE`：

```bash
DEEPSEEK_API_KEY=sk-... npm run start
```

论文正文会被截断到适合模型上下文的长度，生成结果经过服务端校验后才交给前端；任何错误都会保留内置案件，不会影响离线试玩。

## 灵感与技术考察

`paper2gal.com` 官方站说明 Paper2Gal 是专有软件，源码不公开。因此本项目只借鉴“把知识拆成视觉小说章节、角色对白、选择题和证物面板”的交互形式，不复制其品牌素材或实现。

公开可参考的社区实现：

- [Nova42x/paper2galgame](https://github.com/Nova42x/paper2galgame)：React 19 + TypeScript + Vite + Gemini SDK，组件化实现视觉小说对话、文件上传和 AI 生成。
- [gitveg/paper2gal](https://github.com/gitveg/paper2gal)：Streamlit + PDF 解析 + LLM 剧本引擎，支持 UI 与 headless 模式。

本样例使用 React + TypeScript + Vite，内置案件是确定性的本地数据，同时通过一个 Node API 路由连接 arXiv 和 DeepSeek 生成新案件。API 代码位于 [server/paper-api.mjs](./server/paper-api.mjs)，前端请求封装位于 [src/api.ts](./src/api.ts)。

首页提供轻量注册、登录和本机游玩历史记录。账号数据只保存在当前浏览器的 localStorage，适合试玩身份标记，不是生产级账户系统；若要跨设备同步、密码哈希和真正的管理员权限，需要把 API 与数据库部署到服务端。

DeepSeek key 现在只由服务端读取 `DEEPSEEK_API_KEY`（或项目外的 `key.md`），浏览器不会再提交或保存 key。GitHub Pages 是静态托管，不能安全运行这个代理；要开放自定义论文功能，请把 `server.mjs` 部署到 Render、Railway、Fly.io 等服务，并将前端 API 地址配置为你的服务域名。

## 真实论文案件

进入游戏后可以选择两篇真实论文，论文摘要会成为庭审中的第一件证物：

- [Attention Is All You Need](https://arxiv.org/abs/1706.03762)：测试用户能否说出 Transformer 以 attention 为核心、移除 recurrence 与 convolution。
- [Efficient Streaming Language Models with Attention Sinks](https://arxiv.org/abs/2309.17453)：测试用户能否理解 attention sink 与 sliding window KV 的组合策略。

两条案件都共享同一条论文学习链：先确认论文主张，再用具体证物交叉询问；系统会自动记录主张与证物的关系，玩家随后比较竞争性假设，最后形成可复核的结论。论文材料位于 [src/papers.ts](./src/papers.ts)，因此后续可以继续添加其它论文而不改动庭审组件。

右侧的“论文证物”栏只包含论文摘要、方法和实验结果（`00`、`P1`、`P2`、`P3`）。所有得分动作都必须回到这些论文来源，不会把外部工具概念伪装成证物。

### 交叉询问与精确证物

论文案件现在有一条更接近逆转裁判的交叉询问规则：玩家先按 `OBJECTION!` 指出证言矛盾，再从 `P1 / P2 / P3` 中提交一张具体论文证物，最后才能选择答案；只背概念、不提交数据会被异议打回。内置案件的证物直接引用论文中的可核对事实，例如 Transformer 的 `28.4 BLEU`、`41.8 BLEU / 3.5 days`，以及 StreamingLLM 的 `4M tokens`、`22.2× speedup`。这些数值对应 [Attention Is All You Need](https://arxiv.org/abs/1706.03762) 和 [Efficient Streaming Language Models with Attention Sinks](https://arxiv.org/abs/2309.17453) 的摘要与表格。

动态生成的案件也必须返回三张带有 `value` 和 `source` 的证据卡；如果论文没有报告具体数字，会明确显示“未在摘要中报告”，不会让模型凭空补数字。

### 证据驱动的论文庭审

庭审中的每个操作都直接作用于论文理解：

- 玩家提交证物并作出正确反驳后，系统会自动记录论文主张与证物关系，不再要求填写学习笔记。
- 调查假设提供基于论文的竞争性解释（例如“只保留 sliding window”与“attention sink + 最近窗口”），只有有证物支持的假设才能通过调查。
- 最终合议会并排比较当前理解与调查结果，玩家只能把经过论文证物审查的解释纳入结论。
- 结案页会输出一份学习报告，回显确认的主张、使用的证物、玩家解释和调查假设，并分别给出证据精度、论文忠实度和推理完整度。

### 本轮用户模拟

已按首次用户路径分别试玩两篇论文：选择案件 → 阅读 30 秒引导与摘要 → 故意选错一次 → 根据右侧论文卷宗纠正 → 自动记录证据关系 → 调查假设 → 合议结论 → 4/4 结案。庭审顶部持续显示当前目标和下一步操作；选案页包含论文类型、年份、作者、摘要和 arXiv 原文链接，移动端也验证了选案与 4 张论文证物卡没有横向溢出。

## 逆转裁判素材参考

这个样例仓库已经初始化为独立 Git 仓库，并将用户指定的参考项目克隆到了 `reference/NLP-game-project-publicver/`（该目录被 `.gitignore` 忽略，不会把 644 MB 的参考仓库历史提交进本样例）。庭审背景与三张角色头像复制到 `public/assets/` 后，用在庭审场景的背景和角色节点上；参考项目的音乐、视频与 Python 运行时代码没有被引入。

参考项目：[fzw-yinianzhijian/NLP-game-project-publicver](https://github.com/fzw-yinianzhijian/NLP-game-project-publicver)。其仓库声明为 MIT，但其中的角色、游戏画面与 Capcom 音乐仍可能包含第三方权利，详细说明见 [ATTRIBUTION.md](./ATTRIBUTION.md)。
