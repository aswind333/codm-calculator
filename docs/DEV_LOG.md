# 开发日志

## 2026-11-17 — S0：代码仓库审计与开发基线

**结果：PASS（S0 审计验收；不代表产品功能验收）。** 未开始 S1，未改动需求、业务源码、依赖或配置，未初始化 Git、提交、推送或部署。

### 文档与范围

已阅读根目录 AGENTS.md，以及 PRD v0.3、PROBABILITY_SPEC v0.1、UI_DESIGN v1.0、IMPLEMENTATION_PLAN v1.0。四份文档均在 docs/ 内。

- 已核对 FR-01～07、AC-01～24、T-01～10 的要求与阶段归属；本阶段不声称实现或通过这些产品/数学验收。
- PRD §4 与数学规格 §2 的八类价格、7/10 抽权重一致；总价为 538、538、888、888、1008、1008、1448、698。规则示例、三位小数、固定权重归一化与 c/p 指标一致。
- 数学规格 §6.3 的即时重算、§3.3 的可选轮次控件，以及数学规格 §11 / UI §12.2 的旧 PRD 引用，按 AGENTS.md 和计划 §0 已明确的规则处理：设置显式保存成功才生效，轮次仅由已抽集合推导，以 PRD v0.3 为功能基准。
- 计划 S0 / §7 关于 AGENTS.md 尚未生成的文字已过时；实际文件已由用户提供，遵循现有文件，不重新生成。
- 未发现需要变更已确认需求的新增实质冲突。整份设置拒绝非法价格，与数学函数独立处理缺价异常，是不同层次的要求，应同时保留。

### 实际项目与版本

当前为 Vite React 欢迎页和计数器，入口 src/main.tsx → src/App.tsx；尚无业务数据、数学模块、设置、存储、规则页或测试。README、英文页面 lang、模板样式与素材仍是脚手架内容，后续按阶段替换。

| 项目 | 实测版本 |
|---|---|
| Node / npm | 25.9.0 / 11.12.1 |
| React / React DOM | 19.3.1 / 19.3.1 |
| Vite / React 插件 | 8.3.8 / 6.3.0 |
| TypeScript / Oxlint | 7.0.2 / 1.94.0 |
| @types/node | 24.19.2 |
| @types/react / @types/react-dom | 19.3.0 / 19.3.0 |

package-lock.json 为 lockfileVersion 3，根依赖声明与 package.json 一致，直接依赖锁定版本与已安装版本一致；npm ls 无缺失或无效依赖报告。当前 Node 满足所检查直接工具的本地 engines 声明。未执行清洁重装或联网漏洞审计。

实际脚本：dev=vite；build=tsc -b && vite build；lint=oxlint；preview=vite preview。没有独立 typecheck、test 脚本，按计划由 S1 建立。TypeScript 7 本地帮助显示 strict 默认 true；配置未显式写 strict 不代表关闭严格检查。Oxlint 启用 react/typescript/oxc 插件，未配置类型感知 lint，构建另行执行 TypeScript 检查。

### 实际执行的检查

| 命令/检查 | 结果 |
|---|---|
| git status --short --branch | 退出 128：not a git repository；根目录没有 .git |
| node --version；npm --version；npm ls --depth=0 | 通过，版本如上 |
| Node 只读脚本比对 manifest / lock / 安装版本 | 直接依赖一致 |
| tsc -p tsconfig.app.json --showConfig；tsc --help --all | 成功读取有效配置及 strict 默认值 |
| npm run lint | 通过，退出 0 |
| npm run build | 通过，退出 0；包含 tsc -b；生成 dist/ |
| npm run dev -- --host 127.0.0.1 | 沙箱首次监听 EPERM；获授权后重试成功，5173 被占用，自动使用 5174 |
| curl --fail --silent --show-error http://127.0.0.1:5174/ | 沙箱首次连接失败；获授权后成功返回入口 HTML |
| npm run typecheck / npm run test | 未运行：脚本不存在，属 S1 工作 |

未进行浏览器渲染、点击、HMR 或跨设备验证；HTTP 返回成功不等于这些检查通过。

### Git、待处理项与结构建议

- Git 尚未初始化，因此没有可报告的分支、历史、远程或可靠的未提交差异。建议用户确认后执行本地初始化；首个 commit 另行确认。不影响 S0 审计通过。
- .gitignore 已覆盖 node_modules、dist、dist-ssr、日志、*.local 和常见编辑器文件；尚未覆盖一般 .env / .env.* 文件。当前未发现此类文件，建议后续补充忽略规则（保留无秘密示例文件）。
- 未固定 Node/npm 版本（无 engines / packageManager / 版本文件）；建议后续记录并统一已验证环境，避免不同机器漂移。本阶段不升级依赖。
- 沿用现有工程，按阶段增设 src/domain、src/data、src/features/{calculator,settings,rules}、src/storage、src/styles，测试就近放置；本次不创建空目录。
- S1 再引入 Vitest、独立类型检查脚本和默认配置/校验；后续按计划引入组件及端到端测试。无新增依赖建议。

### 变更与复现

人工新增仅本 DEV_LOG.md；构建及开发启动生成 dist/ 与 node_modules 内缓存。既有源码、四份需求文档、AGENTS.md、package.json 和锁文件未主动编辑。

复现：在项目根目录运行 npm run lint、npm run build、npm run dev -- --host 127.0.0.1；打开终端报告的地址（本次为 http://127.0.0.1:5174/），应看到模板欢迎页，可手动点击 Count 验证计数。端口占用时以实际启动输出为准。

无已知 S0 阻塞。等待用户验收并明确指定下一阶段。

## 2026-11-17 — S1：类型、默认配置、数据校验与测试基础

**结果：PASS。** 覆盖 AC-01～04 的默认配置与独立副本部分、T-01/T-06 的数据部分；概率计算、累计费用接口、显示格式与 UI 验收留到后续阶段。

- 已重新读取 AGENTS.md 及四份项目文档，遵循 S1 范围，未修改需求文档或现有 UI。
- 按用户授权初始化本地 Git（沙箱写入 .git 被拒后经授权重试成功）；当前 master 无提交、无远程。所有项目文件为未跟踪状态，不代表本阶段全部新建。未暂存、提交或推送。
- 修改 .gitignore：增加 .env / .env.*，既有 node_modules / dist 忽略保留；git check-ignore -v 验证根目录及子目录环境文件均被排除。
- 新增 src/domain/types.ts：DrawTypeId、PrizeCount、Prize、DrawConfig、只读模板类型及稳定 ID 约定。奖品 ID 使用“类型:prize_等级”，改显示名不改变身份；数组按等级及轮次排序。已抽状态不混入配置，后续按类型独立管理。
- 新增 src/data/defaults.ts：八类默认配置唯一数据源；按数学规格 §2 录入。模板对象、奖品对象及数组均冻结。createDefaultConfig / createDefaultConfigs 返回深复制的可编辑数据，可供恢复默认使用，但无存储或应用状态副作用。
- 新增 src/domain/validation.ts：接受 unknown，检查完整8类、唯一类型、奖品数量及 ID/顺序、名称/单位非空、有限非负权重、100% 总和（1e-6 百分点容差）、有限非负整数价格。不转换字符串、不静默补0、不归一化、不修改输入；返回带字段路径的中文错误。纯数据层无 React、DOM、存储或网络依赖。
- 新增 defaults.test.ts / validation.test.ts：共55例，覆盖逐项价格及权重、总价、77个独立奖品 ID、运行时冻结、副本独立、恢复默认、容差两侧、零权重/零价格、NaN/Infinity/空值、稀疏数组、缺项/重复/跨类型 ID、整份配置错误和无副作用。
- 修改 package.json / package-lock.json：仅新增直接开发依赖 Vitest 4.1.12（Node 默认测试环境，无 DOM 测试依赖），增加 typecheck=tsc -b、test=vitest run、test:watch=vitest；沿用 Oxlint 和原有构建。npm 安装因沙箱网络失败后获授权重试成功，安装报告0漏洞。

默认费用逐项断言通过；总价依次 538 / 538 / 888 / 888 / 1008 / 1008 / 1448 / 698。七抽仅7项，十抽每类10项；所有类型权重合计100%。特别断言包含传说武器第8抽130、载具+武器第8抽150、神话角色首抽5及七抽完整价格数组。

实测：npm run lint PASS；npm run typecheck PASS；npm run test PASS（2个文件，55个测试）；npm run build PASS。git check-ignore PASS；git status 确认无提交；git remote -v 输出为空。没有执行 S2 的 T-02～T-10 概率引擎测试，也没有实现 S3 及后续界面。

复现：项目根目录运行 npm run test 查看断言结果；运行 npm run typecheck、npm run lint、npm run build 检查质量。npm run test:watch 可用于后续开发（本阶段未单独启动 watch）。页面仍为原有欢迎页，S1 无页面操作验收。

无已知阻塞。首次 commit 须另获用户确认；停止等待 S1 审核，不进入 S2。

## 2026-11-17 — S2：纯数学计算引擎与严格测试

**结果：PASS。** 完成 FR-02～04 的数学部分、AC-05～12 的核心计算与格式部分及数学规格 T-01～T-10；不代表对应 UI 已实现。

开工复查 AGENTS.md、四份项目文档、S1 类型/默认配置/校验/测试；S1 原有55例实测通过。Git 仍为 master 无提交、无远程，未暂存、提交、推送或部署。

### 文件与接口

新增 src/domain/calculations.ts：

- getNextRound(drawnCount, prizeCount)：验证7/10数量及已抽数量，返回 ready/complete/invalid 与下一轮（无下一轮为 null）。
- calculateRemainingProbabilities(config: unknown, drawnIds: unknown)：接受 ID 数组或 Set，复用 S1 非价格校验；拒绝未知/重复/跨类型/稀疏已抽 ID。按原奖品顺序返回未抽奖品 ID 与未舍入的概率，以及轮次、剩余权重、已抽数量、零权重已抽警告。状态为 ready、complete、invalid、zero-weight 或 numeric-error。
- calculateCosts(roundCosts: unknown, drawnCount, prizeCount)：返回 paid / next / after / total，各自携带状态与数值。缺价只影响依赖该价格的字段；空价不补0；额外轮次无效；全部抽完无 next/after；溢出返回 numeric-error。
- calculateEquivalentCost(probability, nextCost)：单轮 c/p；0概率返回 unreachable，0费用合法，缺价/数值溢出返回明确状态。这不是实际保底或真实期望总费用。
- calculateDraw(config, drawnIds)：组合概率、费用和每件奖品等效成本，完全无副作用；非法非价格配置或非法已抽集合时阻止计算。价格错误不阻断合法概率，这是数学规格 §4～6 所要求的降级行为；S1 保存校验仍拒绝非法整份配置。

新增 src/domain/format.ts：formatProbability 返回三位小数百分比字符串及 roundedToZero 辅助标志；formatAmount 按等效成本三位/实际卡片整数显示并提供异常文案。使用固定 locale 的 Intl 格式化，正数半值向上；计算层不调用格式化函数。极端小数下溢不伪装零概率，溢出不输出 Infinity。

新增 src/domain/calculations.test.ts：42例（含参数化展开），原有55例保留。未修改 S1 类型、默认数据、校验及测试，未增依赖，未改需求或 UI。开发日志仅追加本记录。

### 验收证据

- T-01：七/十抽首抽一等奖0.080%、二等奖1.250%、概率归一化。
- T-02：十抽剔除六/七等奖，第3抽剩余83.5；一等奖0.096%/10437.500，二等奖1.497%/668.000，十等奖34.731%；此前8、本轮10、完成后18。
- T-03：剔除29%/28%时二等奖分别1.761%/1.736%。
- T-04：七抽剔除60%，前三概率0.200%/3.125%/16.675%；二等奖224.000；此前3、本轮7、完成后10。
- T-05：剔除顺序相反时完整结果相等。
- T-06：八类总价、传说武器/载具+武器第8抽130/150、神话角色首抽5、七抽第3抽18及累计10/28均正确。
- T-07：二等奖首抽等效成本240.000/400.000。
- T-08：正权重末件100.000%，七/十抽末轮350，累计348/538至698/888；全抽完无下一轮。
- T-09：非法权重/ID/结构、缺价、零价、零权重、零剩余权重、零权重末件均通过。
- T-10：三位小数、半值四舍五入、整数费用、不用显示值反算等效成本均通过。
- 穷举：七类十抽各1024种子集，七抽128种，共7296种。每个子集核查剔除顺序反转相等、剩余集合准确、轮次、费用、概率范围、概率和误差 <=1e-10、有限输出及末轮/完成状态。枚举只存在于测试代码。
- 额外检查：输入不变、价格/改名不影响概率、稀疏数组、非有限数、缺价局部合计、溢出/下溢、极小正概率提示、大数格式化。复查修正了单孔稀疏已抽数组可能跳过 some 校验的问题，并补入回归断言。

最终实测：npm run test PASS（3个文件、97例，含S1回归）；npm run lint PASS；npm run typecheck PASS；npm run build PASS。核心模块无 React/DOM/存储/网络依赖。页面仍为原有模板，未做 S3 界面及浏览器交互验收。

复现：项目根目录运行上述四条 npm 命令；仅查看 S2 可运行 npm run test -- src/domain/calculations.test.ts。无已知阻塞或新增实质规格冲突；停止等待用户审核，不进入 S3。

## 2026-11-17 — S3：概率计算主页面

**结果：PASS（实现及自动化检查达到 S3 要求；真实浏览器视觉/点击验收待用户执行）。** 对应 FR-01～04、AC-05～13、AC-15～16 的本阶段主页面部分。未开发设置、规则页、持久化或后续预测功能。

### 实现与文件

- 新增 src/features/calculator/CalculatorPage.tsx：十抽/七抽模式、八类选择、默认传说武器；以 typeId 为键的 React 会话状态，返回类型恢复已抽记录；清空仅当前类型；记住最近选择的十抽类型。
- 新增 src/features/calculator/CalculatorView.tsx：调用 S2 calculateDraw；DrawSummary 展示轮次和四项费用，PrizeGrid 展示可点击原生按钮网格，PrizeMark 提供本地皇冠/奖章/星形 SVG，ProbabilityResults 展示完整剩余奖品表及固定说明。已抽按钮包含 aria-pressed、勾号、文字与淡化效果；保留撤销操作。
- 修改 src/App.tsx / src/App.css / src/index.css：替换欢迎页，建立简体中文主页面、浅灰/粉紫/淡蓝配色、宽屏双栏及窄屏上下布局；原生控件、焦点样式、跳转主内容链接与减少动态效果支持。设置和规则按钮禁用并标注“暂未开放”。
- 新增 src/styles/tokens.css：集中主题色、圆角、阴影。修改 index.html 的 lang 和页面标题，移除模板 favicon 引用；旧素材文件未删除，但已无运行时引用。
- 新增 src/features/calculator/CalculatorPage.test.tsx：11例组件交互/异常测试，文件级 jsdom 环境，数学测试仍使用原来的 Node 环境。
- 修改 package.json / package-lock.json：新增开发依赖 @testing-library/react 16.3.3、@testing-library/user-event 14.6.12、jsdom 29.1.1，分别用于组件查询、用户操作与 DOM 环境；没有新增运行时依赖。安装首次受沙箱网络限制，授权重试成功，npm 报告0漏洞。
- docs/DEV_LOG.md 追加阶段记录。未修改 S1/S2 模块或四份需求文档。

### 引擎复用与特殊状态

每次勾选/撤销及类型切换，将对应默认配置和已抽 ID 交给 calculateDraw；概率和费用显示调用 formatProbability / formatAmount，不在 React 内实现公式。完成时隐藏下一抽费用与概率表；零剩余权重、非法配置、数值范围错误有清晰提示；缺价仍展示概率；极小正概率有辅助说明。已抽状态不写入 localStorage，刷新会重置，页面明确说明。

### 实测结果

- 开始时 S1/S2 基线：97例通过。
- 组件新增11例：初始默认/未开放入口；国服六七等奖案例及撤销；模式切换/类型隔离/当前类型清空；七抽/十抽末件与全部完成；键盘 Enter/空格；八类输出逐行与 S2 一致；零剩余权重、非法配置、缺价、数值范围异常。
- 首轮108例通过，lint通过；typecheck发现测试查询使用不支持的 exact 参数，移除该多余参数后重跑全部质量检查。
- 最终 npm run test PASS（4文件108例，包含97例 S1/S2 回归）；npm run lint PASS；npm run typecheck PASS；npm run build PASS；npm ls --depth=0 PASS。
- 国服案例：传说武器选六/七等奖 → 第3抽、此前8、本轮10、完成本轮后18、总价888；一等奖0.096%，二等奖1.497%及668.000使命卡片，均由算法得到。
- npm run dev -- --host 127.0.0.1：沙箱监听失败，授权重试在5175成功（5173/5174已占用）；curl成功读取入口 HTML。
- 内置浏览器不可用，cua.listBrowsers 返回空列表，未完成实际截图、视觉/触屏/跨浏览器验证。jsdom 交互测试不能替代布局验收。按本地预览流程尝试结束本阶段启动的开发服务器，不操作其他既有服务器。

### 用户复现与停止点

在项目根目录运行 npm run dev -- --host 127.0.0.1，打开终端实际 Local 地址；初始传说武器勾选六/七等奖核对上面的案例；切换七抽点七等奖应显示3.125%/224.000；切回十抽确认记录保留；逐一标记至最后一件/全部抽完，再撤销或清空。可用 Tab、Enter、空格操作卡片。浏览器刷新应恢复未抽状态。

无已知代码阻塞。真实浏览器人工验收待用户执行；S4设置/持久化、S5规则与完整导航、S6全面视觉及多设备适配仍未实施。Git仍无提交、无远程；未暂存、提交、推送或部署。停止等待用户审核，不进入 S4。

## 2026-11-17 — S4：设置、显式保存及本地持久化

**结果：PASS（实现与自动化检查；真实浏览器/设备布局验收待用户执行）。** 对应 FR-05-A/B/C、AC-17～20。已复查 AGENTS.md、四份文档及 S1～S3，基线108例通过；未进入 S5。

### 文件与架构

新增：
- src/features/settings/SettingsPage.tsx：SettingsPage 管理整份草稿、保存反馈、取消/恢复及两个标签；PriceEditor 提供桌面8行表、手机逐类表单和完整总表入口；ProbabilityEditor 提供按类型7/10卡片、名称及权重编辑、实时合计；Field 提供标签、错误描述与 aria-invalid。
- src/features/settings/draft.ts：独立字符串草稿与数值配置转换，空字符串、空白或非法数字不会变为0；转换后复用 S1 validateConfigs/validateConfig。
- src/features/settings/settings.css：统一设置页样式，首列固定、表格局部横向滚动、手机逐轮输入、共享草稿及醒目保存操作区。
- src/storage/storage.ts：无 React/DOM 依赖的可替换 getItem/setItem 适配器、读入校验及写入结果。配置键 codmcalc.settings.v1，已抽键 codmcalc.drawn.v1；内容均带 version:1。读取损坏/版本不兼容/非法结构安全回退并警告，不在读取时自动覆盖损坏存储。已抽记录校验类型、奖品成员、重复及跨类型ID。
- src/storage/browserStorage.ts：唯一直接访问 window.localStorage 的适配器，延迟访问，属性访问的 SecurityError 也由存储层捕获。
- src/components/PrizeMark.tsx：从 S3 原样抽出皇冠/奖章/星形标识供设置复用。
- SettingsPage.test.tsx、storage.test.ts、browserStorage.test.ts：本阶段33例测试。

修改：
- src/App.tsx：维护已保存有效配置、页面及脏标志；挂载时从本地加载；保存严格按“校验→序列化→写入成功→更新正式状态”，失败不更新。站内离开原生确认，beforeunload 尽可能提醒；计算页保持挂载，设置页离开时销毁草稿。启用设置入口，规则页仍标记未开放。
- src/features/calculator/CalculatorPage.tsx：接受正式配置及存储适配器，保持类型状态；已抽记录通过独立键恢复/写入，失败提示仅在会话生效。设置保存不清空已有稳定ID。
- src/features/calculator/CalculatorView.tsx：复用抽出的 PrizeMark，更新持久化说明；仍完全使用 S2 引擎。
- src/features/calculator/CalculatorPage.test.tsx：原有断言保留，注入隔离存储适配器，避免环境中的非浏览器 localStorage 干扰。
- docs/DEV_LOG.md：追加本记录。无删除文件、无新依赖；S1/S2数学与默认数据、四份需求文档、依赖清单均未修改。

### 交互与异常规则

整份8类字符串草稿属于设置页，价格/概率标签和类型切换不丢失；主计算只读取 App 的正式配置。任何恢复仅更改草稿：单行价格只恢复价格；当前概率只恢复权重（不覆盖名称）；全部恢复先确认。取消恢复最近保存值。保存成功短暂反馈；失败保留草稿及旧正式配置，可重试。合法0与空输入明确区分；价格有限非负整数、权重有限非负且总计100（1e-6容差）等规则全部复用现有校验。所有8类校验成功才允许保存。

已抽记录独立持久化，不与配置草稿互相覆盖；保存权重后若已抽记录变为不可能状态或剩余权重为0，复用 S2/S3 的警告/错误，不伪造100%。本地清理/无痕/存储不可用限制有说明。没有新公式、货币换算、后端、数据库、完整规则页或预测功能。

### 实测

- 最终 npm run test：PASS，7个文件、141例全部通过（原108例+新增33例）。
- npm run lint / npm run typecheck / npm run build：全部PASS。
- 覆盖用户15项场景：价格与概率未保存隔离；保存生效；重挂载模拟刷新恢复；类型隔离；跨标签/类型草稿保留；取消；单项默认仅草稿；全部默认确认及保存；非法概率/价格/空名称禁存；模拟额度写入失败旧配置不变及重试；损坏JSON/版本/配置/已抽记录回退；七/十抽手机表单和总表同份数据；站内离开及beforeunload；单位/名称及稳定ID；保存零权重后保留状态并显示错误。
- 额外测试浏览器适配器真实转发读写以及 localStorage 属性访问本身抛错。数学穷举和国服案例随原测试一起通过。
- 首轮发现 Node测试环境 localStorage.clear 不可用及输入标签被内嵌错误文字改变：分别改为隔离适配器、固定 aria-label，完整回归通过，未降低校验或删除断言。
- 浏览器通道检查返回空列表，未启动额外预览服务器，未验证真实浏览器关闭提醒、手机键盘、截图和视觉布局。jsdom验证双表单数据与交互，不代表真实屏幕尺寸验收。
- Git仍为master无提交，git remote -v为空；未暂存、commit、push或部署。

### 人工验收

运行 npm run dev -- --host 127.0.0.1，打开终端实际 Local 地址（既有服务占用端口时以输出为准）。先在传说武器标记六/七等奖；设置中将该类型第3抽改为20，不保存选择返回→取消可继续编辑，放弃则计算仍10；再编辑并保存，返回应为20、二等奖等效成本1336.000，已抽记录仍在。刷新确认配置和记录恢复。概率修改需配平到100%，保存前不得生效；切换标签/类型核对草稿保留。验证取消、单行恢复、全部默认确认且需再保存；尝试空价/负价/小数价/99%阻止保存。手机宽度验证逐类表单、完整总表入口及保存操作区。

无已知代码阻塞；真实浏览器布局、原生弹窗及设备输入仍待人工验收。S5完整规则、S6全面视觉/跨浏览器回归未实施。停止等待 S4 审核。

## 2026-11-17 — S4 返修：布局与展示细节

**结果：PASS（实现与自动化检查；真实浏览器视觉验收待用户执行）。** 本次仅按用户最新指示优化 UI；主计算页固定说明及设置按钮下方提示的迁移，以本次明确指示为准，未修改需求文档，未进入 S5。

- 修改 src/features/settings/SettingsPage.tsx：价格可见标签缩为“第N抽”、单位缩为“单位”；输入框保留含转盘名称的完整 aria-label。增加表格列定义，没有修改草稿、校验、保存或恢复默认流程。
- 修改 src/features/settings/settings.css：价格表最小宽度从1560px降为1040px；类型/单位列158px、合计76px、恢复94px，其余10列均分；缩小列间留白、输入内边距及恢复按钮字号。保留44px输入高度、手机逐类编辑和完整表格局部滚动。约1440px视口的现有页面内容宽度可容纳总表。
- 修改 src/App.tsx / src/App.css：三个导航按钮并排等高44px；齿轮增至26px，移除按钮下方独立提示，改为设置按钮 title。规则入口仅承载迁移的等效成本说明及返回按钮，没有教程、示例、FAQ或新规则交互。复用现有未保存确认，前往规则页同样受保护；计算页面保持挂载，保留已抽状态。
- 修改 src/features/calculator/CalculatorView.tsx：移除结果下方大说明框，原文迁入上述静态规则页面。App.css 将结果行上下内边距12px减为8px，说明行底部空白20px减为12px，数字字号、三位小数及单位保持不变。
- 修改 CalculatorPage.test.tsx / SettingsPage.test.tsx：验证说明仅在规则页展示、返回保留已抽记录、可见价格标签简洁且无障碍名称完整；新增规则导航下的继续编辑/放弃草稿回归。未修改数学测试或降低数据校验。
- docs/DEV_LOG.md 追加本记录；没有新建/删除文件、新依赖、数学/默认数据/存储模块修改。

实际检查：npm run test PASS（7文件、142例，含既有数学穷举、国服案例和S4保存回归）；npm run lint PASS；npm run typecheck PASS；npm run build PASS。浏览器通道库存仍为空，未执行截图、1440px及手机真浏览器布局验证；jsdom交互测试不替代视觉验收。

人工验收：运行 npm run dev -- --host 127.0.0.1，打开终端实际 Local 地址。在约1440px窗口确认顶部三入口对齐、齿轮放大、无下方提示；进入设置确认8行价格表及第1～10抽短标签完整可读、无需横向滚动。缩至手机宽度确认逐类价格编辑及完整总表入口仍可用。主计算页检查结果表更紧凑且无底部说明框；点击规则说明查看原文并返回，已抽记录应不变。编辑未保存价格后点击规则说明，分别取消/确认，核对草稿保留/丢弃及正式配置不变。

无已知代码阻塞；真实屏幕视觉效果待用户验收。未提交、推送或部署，停止于 S4 返修，不进入 S5。

## 2026-11-17 — S5：规则说明页面与导航完整性

结果：PASS（功能及自动化；真实浏览器窄屏视觉待人工验收）。对应 FR-06/07、AC-14/21；先复查 AGENTS 与四份文档、现有代码及142例测试基线。

新增 src/features/rules/RulesPage.tsx：RulesPage 组织三步教程、概率规则、性价比、FAQ及非官方声明；ProbabilityExample 仅使用独立内置默认配置和 S2 calculateRemainingProbabilities，展示权重流程及十抽1.497%/七抽3.125%；性价比复用 calculateEquivalentCost/formatAmount 得到200.000卡；FaqItem 使用原生按钮、aria-expanded/controls、关联答案区域，支持键盘开关。无未经核实的官方来源链接或服务器声明。

新增 rules.css：900px居中限宽、主题令牌、白色卡片，600px以下步骤和权重流程单列，文本自动换行；无新增动画。新增 RulesPage.test.tsx：自定义配置不污染案例、七/十案例数值、性价比和声明、三个页面导航及保留类型/已抽状态、六个FAQ鼠标及Enter/空格展开收起。原有设置离开确认测试继续覆盖取消与放弃。

修改 src/App.tsx：仅将原最小静态规则内容替换为 RulesPage，保留原导航、未保存确认、正式配置和计算页挂载方式。修改本开发日志。未修改数学、保存/存储模块、主页面或设置样式，无新依赖、无删除文件。

文档差异：旧 S5/FR-07/AC-14 的设置下方箭头提示，以及旧FR-03要求主结果区固定说明，按用户已验收返修保持现状，不恢复；说明集中于规则页。需求文档不改动。

实际执行：npm run test PASS（8文件144例，包含原142例）；npm run lint PASS；npm run typecheck PASS；npm run build PASS。浏览器工具库存为空，未执行真实375/430px、触屏、跨浏览器布局检查，jsdom不验证CSS几何。窄屏阅读效果列为人工验收项。

人工验收：npm run dev -- --host 127.0.0.1 后打开终端实际Local地址；先选择神话角色并标记六等奖，进入规则页切换案例核对1.497%/3.125%及200.000卡，逐项展开FAQ（含Tab、Enter、空格）；返回确认类型和已抽状态保留。设置编辑未保存再进规则，分别取消/确认验证原提醒。375/430px宽度核对阅读顺序、公式换行、按钮可见及无横向溢出。

无已知代码阻塞。真实浏览器视觉待验收；不执行S6/S7，无commit/push/部署。完成S5后停止等待确认。

## 2026-11-17 — S6：兼容性、响应式及无障碍回归

状态：PASS（实现及自动化验收；真实设备和日常浏览器人工验收另列）。对应 AC-15、17、22～24。读取 AGENTS、四份文档相关章节及现有 S3～S5 组件，保留最新人工验收布局。Git仍为未提交初始仓库，未暂存、提交、推送或部署。

修改文件及理由：
- src/styles/tokens.css、src/App.css：将奖章/星形颜色集中为令牌，白色引用surface。修复WebKit原生select忽略最小高度的问题：appearance:none及本地内嵌箭头，保持原生选择语义。未调整已验收的导航高度、26px齿轮、1040px价格表宽度或8px结果行内边距。
- src/index.css、index.html：safe-area与viewport-fit；44px控件最小目标；手机select 16px；按钮反馈、350ms概率数值强调；减少动态效果全局停用。箭头为data SVG，不请求远程资源。
- src/features/settings/settings.css：手机输入16px防自动缩放、输入scroll-margin避让固定操作区、safe-area sticky偏移；768～1023px概率卡片三列，手机两列、桌面五列；保存操作间距收紧。桌面价格表及手机逐类表单共用草稿行为不变。
- src/features/settings/SettingsPage.tsx：设置标签页增加方向键/Home/End与roving tabindex，未修改保存校验及草稿规则。
- src/features/calculator/CalculatorView.tsx：显示概率增加按文本变化重启动画的span，准确值立即呈现；未改S2调用或计算。
- src/features/rules/rules.css：FAQ短暂透明度过渡，支持减少动画；原信息结构、案例和公式不变。
- 新增 playwright.config.ts、e2e/regression.spec.ts：生产静态预览、隔离上下文、Chromium/WebKit/Firefox、五视口、A～G路径、失败trace、截图及HTML报告。
- package.json/package-lock.json：仅新增开发依赖@playwright/test 1.65.1（安装审计0漏洞）；test限定src避免Vitest误收E2E；新增test:e2e。tsconfig.node.json将E2E脚本纳入类型检查。
- .gitignore排除测试报告/截图；README.md加入本地运行步骤及设备边界；本日志记录结果。无删除文件，无需求文档、默认数据、数学引擎或存储模块改动。

实际结果：
- npm run test：8文件144例PASS，数学穷举及S4/S5回归保留。
- npm run lint、npm run typecheck、npm run build：PASS。
- npm run test:e2e：最终27/27 PASS，Chromium9、WebKit9、Firefox9，12.4秒。生产构建由脚本执行。
- A/B十抽第3抽8/10卡、0.096%/1.497%/668.000及七抽3.125%/7卡；C/D价格概率草稿隔离、保存/刷新/恢复；E规则导航保留状态；F终局/非法概率禁存/零价/零权重/无NaN与Infinity；G五视口三页、手机七抽编辑保存、完整总表、键盘标签及FAQ、减少动画均覆盖。
- 首轮24项通过；加强触控尺寸断言后发现WebKit五视口select小于44px，修复后全部通过，未降低断言。最终所有抽查页面可见button/select/input高度至少44px；1280/1440价格表无需横向滚动，窄屏完整表格仅局部滚动。三页整页scrollWidth未超过视口。
- 共66张截图，查看了375px Chromium计算页、WebKit设置/规则页、1440px Chromium价格表、768px Firefox概率卡片等代表截图；未见文字重叠或核心控件裁切。截图等待FAQ不透明并禁用动画截取稳定态，不是已批准基准图像的像素差分。
- 常用文本颜色与白/浅灰/浅紫背景的计算对比度均超过4.5:1（muted最低约4.54:1）；已有焦点、aria-pressed、错误和保存文字反馈保留。未宣称完整WCAG认证。
- 源码及浏览器请求检查无外部字体/CDN/运行时接口请求；已加载页面离线仍可计算与切换规则。没有离线刷新/PWA保证。生产JS252.21kB（gzip79.51kB），CSS12.45kB（gzip3.47kB），无大图或新增运行时依赖。每次计算最多10件奖品，没有明显需要大规模重构的计算负担。
- Playwright托管预览仅监听127.0.0.1:4179且测试结束自动关闭；浏览器缓存为测试工具，不使用个人浏览器数据。

人工验收：npm run dev -- --host 127.0.0.1，打开实际Local地址；在375/430/768/1280/1440px完成A～G流程，尤其手机输入时保存按钮、软键盘遮挡、安全区域和旋转屏幕；用Tab/方向键/Enter/空格检查控件，打开系统减少动态效果。npm run test:e2e复现；npx playwright show-report查看结果，test-results查看截图。

未验证：真实iPhone/Android、实际macOS Chrome/Safari应用、真实软键盘和屏幕阅读器。Playwright WebKit不是Safari应用，模拟宽度不等同真实手机。本阶段无已知自动化阻塞；上述人工项及用户验收为后续S7前依赖。未执行S7或部署，停止等待审核。
