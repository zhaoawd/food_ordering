# R1 候选修复回归

本组检查对应固定 R1 基线 `9fc9c4b92553273424f3653235698c84fb05103a` 的局部修复。

```sh
npm ci --ignore-scripts
npm run test:eval-r1
npm run test:eval-r1-browser
npx tsc --noEmit
npx eslint 'app/(tabs)/index.tsx' tests/*.cjs
CI=1 EXPO_OFFLINE=1 EXPO_PUBLIC_AUTOPHONE_VERIFICATION=1 npx expo export --platform ios --output-dir dist/eval-r1-ios
```

浏览器依赖 Playwright 对应的 Chromium；首次使用可执行 `npx playwright install chromium`。
测试服务器仅监听 `127.0.0.1:18766`，不复用现有服务器。

- 源码契约检查从冻结设计包读取 8 项期望值，用 TypeScript AST 核对样式声明。
- 浏览器运行真实首页组件和 React Native Web；替换原生文件 IO、观测组件、图标、图片、安全区和路由。使用源码中的 baselineFixture。
- 浏览器验证修正区域尺寸、不重叠、按钮不被导航遮挡、推荐切换、徽标读屏文案、购物袋计数和路由请求。
- 截图仅为隔离组件诊断产物，未渲染真实图片和图标，不作为全页视觉或 iOS Actual。
- iOS export 验证 JavaScript 与资源打包，不生成已签名 IPA，也不证明设备运行通过。

历史需求和设计包保持不变。本组通过仅表明所列修复及隔离回归完成；完整正确对照仍需全范围视觉、设备行为和独立清单证据。
