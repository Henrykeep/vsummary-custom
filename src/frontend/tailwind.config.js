import themeColors from './packages/workspace-ui/tailwind.colors.js';
import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./packages/workspace-ui/src/**/*.{js,jsx}",
    "./node_modules/@alpha03123/vsummary-workspace-ui/dist/**/*.js",
  ],
  theme: {
    extend: {
      ...themeColors,
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"SF Pro Display"', '"Segoe UI Variable Text"', '"Segoe UI"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei UI"', '"Microsoft YaHei"', '"Noto Sans SC"', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', '"Segoe UI Variable Display"', '"Segoe UI Variable Text"', '"Segoe UI"', '"PingFang SC"', '"Hiragino Sans GB"', '"Microsoft YaHei UI"', '"Microsoft YaHei"', '"Noto Sans SC"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1.25rem',   // 20px
        '3xl': '1.5rem',    // 24px
        '4xl': '1.75rem',   // 28px
        '5xl': '2rem',      // 32px
      }
    },
  },
  plugins: [
    // 面板宽度是拖拽出来的（workspaceLayout.js panelMinWidth 320），视口媒体查询
    // 完全测不到它。工具页头部需要 ~460px，容器查询是唯一能按「面板宽度」降级的方案。
    containerQueries,
  ],
}
