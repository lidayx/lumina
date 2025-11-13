// 窗口尺寸常量
export const BASE_HEIGHT = 80; // 基础高度（只有输入框）
export const RESULT_ITEM_HEIGHT = 56; // 每个结果项的高度
export const MAX_VISIBLE_ITEMS = 8; // 最大可见结果数
export const NO_RESULT_HEIGHT = 60; // 无结果提示的高度
export const BASE_WIDTH = 700; // 主窗口宽度

// 延迟时间常量
export const WINDOW_HIDE_DELAY = 50; // 隐藏窗口的延迟（毫秒）
export const HOVER_IGNORE_DELAY = 200; // 悬停忽略延迟（毫秒）
export const RESIZE_DEBOUNCE_DELAY = 16; // 窗口大小调整防抖延迟（毫秒）
export const FIRST_LAUNCH_TIMEOUT = 30000; // 首次启动超时（毫秒）
export const PREVIEW_SETTING_CHECK_INTERVAL = 2000; // 预览设置检查间隔（毫秒）
export const SEARCH_DEBOUNCE_DELAY_NORMAL = 300; // 普通搜索防抖延迟（毫秒）
export const SEARCH_DEBOUNCE_DELAY_COMPLETION = 150; // 补全搜索防抖延迟（毫秒）

// 关键词常量
export const SETTINGS_KEYWORDS = ['设置', 'settings', 'setting', '配置', 'preferences'];
export const CLIPBOARD_KEYWORDS = /^(?:clip|clipboard|剪贴板|cb)(?:\s+(.+))?$/i;
export const FILE_SEARCH_PATTERN = /^file\s+(.+)$/i;
export const COMMAND_MODE_PATTERN = /^>\s*(.*)$/;

// 优先级分数常量
export const PRIORITY_SCORES = {
  FEATURE_HELP: 2600,
  FEATURE_FORMAT: 2500,
  FEATURE_COMPLETE: 2700,
  COMMAND_HELP: 2500,
  COMMAND_EXAMPLE: 2400,
  COMMAND: 2000,
  COMMAND_NO_MATCH: 1000,
  SETTINGS: 2000,
  CLIPBOARD: 1900,
  ENCODE: 2000,
  ENCODE_ERROR: 1000,
  STRING: 2000,
  STRING_ERROR: 1000,
  TIME: 2000,
  TIME_ERROR: 1000,
  TODO: 2000,
  TODO_ERROR: 1000,
  RANDOM: 2000,
  RANDOM_ERROR: 1000,
  TRANSLATE: 2000,
  TRANSLATE_ERROR: 1000,
  VARNAME: 2000,
  VARNAME_ERROR: 1000,
  CALC: 1800,
  TIME_DIFFERENCE: 1900,
  TIME_CALCULATION: 1900,
  BROWSER: 1500,
  APP: 800,
  FILE: 600,
  BOOKMARK: 400,
  WEB: 50,
} as const;

