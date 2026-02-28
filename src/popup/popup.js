// Popup脚本

// 全局状态
let currentTabId = null;
let currentMatchCount = 0;
let currentMatchIndex = 0;
let searchHistory = [];
let currentMatches = [];
// 默认值
let historyLimit = 20;
let maxMatches = 1000;

// DOM元素
const patternInput = document.getElementById('patternInput');
const searchBtn = document.getElementById('searchBtn');
const clearBtn = document.getElementById('clearBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const closeBtn = document.getElementById('closeBtn');
const resultCount = document.getElementById('resultCount');
const currentIndex = document.getElementById('currentIndex');
const errorMsg = document.getElementById('errorMsg');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');
const flagG = document.getElementById('flagG');
const flagI = document.getElementById('flagI');
const flagM = document.getElementById('flagM');
const flagS = document.getElementById('flagS');
const flagU = document.getElementById('flagU');
const copyResultsBtn = document.getElementById('copyResultsBtn');
const historyLimitInput = document.getElementById('historyLimitInput');
const maxMatchesInput = document.getElementById('maxMatchesInput');

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  await initialize();
  setupEventListeners();
  const input = document.getElementById('patternInput');
  if (input) {
    input.focus();
  }
});

// 初始化
async function initialize() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTabId = tab.id;

    // 加载用户设置
    await loadSettings();
    await loadSearchHistory();
    updateNavigationState();
  } catch (error) {
    console.error('初始化失败:', error);
  }
}

// 加载用户设置
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['historyLimit', 'maxMatches']);

    // 加载历史记录限制
    if (result.historyLimit) {
      historyLimit = result.historyLimit;
      historyLimitInput.value = historyLimit;
    }

    // 加载最大匹配数
    if (result.maxMatches) {
      maxMatches = result.maxMatches;
      maxMatchesInput.value = maxMatches;
    }
  } catch (error) {
    console.error('加载设置失败:', error);
  }
}

// 保存用户设置
async function saveSettings() {
  try {
    await chrome.storage.local.set({
      historyLimit: historyLimit,
      maxMatches: maxMatches
    });
  } catch (error) {
    console.error('保存设置失败:', error);
  }
}

// 设置事件监听器
function setupEventListeners() {
  // 搜索按钮
  searchBtn.addEventListener('click', () => {
    // 添加到历史记录
    const pattern = patternInput.value.trim();
    try {
      // 验证正则表达式
      validateRegex(pattern);
      addToHistory(pattern);
    } finally {
      navigateToMatch('next')
    }
  });

  // 输入框回车搜索
  patternInput.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){
      // 添加到历史记录
      const pattern = patternInput.value.trim();
      try {
        // 验证正则表达式
        validateRegex(pattern);
        addToHistory(pattern);
      } finally {

      }
      if (e.shiftKey) {
        navigateToMatch('previous');
      }else{
        navigateToMatch('next');
      }
    }
  });

  // 实时搜索（防抖）
  let debounceTimer;
  patternInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    hideError();
    performSearch();
  });

  // 标志变化
  [flagG, flagI, flagM, flagS, flagU].forEach(flag => {
    flag.addEventListener('change', () => {
      if (patternInput.value.trim()) {
        performSearch();
      }
    });
  });

  // 清除高亮按钮
  clearBtn.addEventListener('click', clearHighlights);

  // 关闭按钮
  closeBtn.addEventListener('click', () => {
    // 告诉 background.js，我需要被关闭
    clearHighlights();
    chrome.tabs.sendMessage(currentTabId, {
      type: 'CLOSE_IFRAME',
      data: {}
    });
  });

  // 导航按钮
  prevBtn.addEventListener('click', () => navigateToMatch('previous'));
  nextBtn.addEventListener('click', () => navigateToMatch('next'));

  // 清空历史
  clearHistoryBtn.addEventListener('click', clearSearchHistory);

  // 复制结果按钮
  copyResultsBtn.addEventListener('click', copyResults);

  // 历史记录限制输入
  historyLimitInput.addEventListener('change', (e) => {
    let value = parseInt(e.target.value);
    // 验证范围
    if (isNaN(value) || value < 1) value = 1;
    if (value > 100) value = 100;
    e.target.value = value;
    historyLimit = value;
    saveSettings();
    // 如果历史记录超过新限制，截断
    if (searchHistory.length > historyLimit) {
      searchHistory = searchHistory.slice(0, historyLimit);
      chrome.storage.local.set({ searchHistory });
      renderHistoryList();
    }
  });

  // 最大匹配数输入
  maxMatchesInput.addEventListener('change', (e) => {
    let value = parseInt(e.target.value);
    // 验证范围
    if (isNaN(value) || value < 1) value = 1;
    if (value > 10000) value = 10000;
    e.target.value = value;
    maxMatches = value;
    saveSettings();
    // 如果有当前搜索结果，可能需要重新搜索
    if (patternInput.value.trim()) {
      performSearch();
    }
  });

  // 帮助项点击
  document.querySelectorAll('.help-item').forEach(item => {
    item.addEventListener('click', () => {
      const pattern = item.dataset.pattern;
      if (pattern) {
        patternInput.value = pattern;
        performSearch();
      }
    });
  });

  // 快捷键支持
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      performSearch();
    }
  });
}

// 执行搜索
async function performSearch() {
  clearHighlights();

  const pattern = patternInput.value.trim();

  try {
    // 验证正则表达式
    validateRegex(pattern);

    // 获取标志
    const flags = getFlags();


    // 检查当前标签页是否可访问
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab || activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('chrome-extension://')) {
      showError('此页面不支持搜索，请访问普通网页或者刷新后重试');
      return;
    }

    // 发送搜索请求到content script
    const response = await chrome.tabs.sendMessage(currentTabId, {
      type: 'SEARCH',
      data: {
        pattern,
        flags,
        maxMatches
      }
    });

    if (response.error) {
      showError(response.error);
      updateResultCount(0);
      updateNavigationState();
      updateCopyButtonState(false);
    } else {
      hideError();
      updateResultCount(response.count);
      currentMatchCount = response.count;
      currentMatchIndex = 0;
      currentMatches = response.matches || [];

      if (response.count > 0) {
        currentIndex.textContent = `1 / ${response.count}`;
        navigateToMatch('first');
      } else {
        currentIndex.textContent = `- / -`;
      }

      updateNavigationState();
      updateCopyButtonState(response.count > 0);
    }
  } catch (error) {
    if (error.message.includes('Could not establish connection') || error.message.includes('Receiving end does not exist')) {
      showError('无法连接到页面，请刷新页面或尝试其他页面');
    } else {
      showError(error.message);
    }
    updateCopyButtonState(false);
  }
}

// 导航到匹配项
async function navigateToMatch(direction) {
  try {
    const response = await chrome.tabs.sendMessage(currentTabId, {
      type: 'NAVIGATE',
      data: { direction }
    });

    if (response.index !== undefined) {
      currentMatchIndex = response.index + 1;
      currentIndex.textContent = `${currentMatchIndex} / ${currentMatchCount}`;
      updateNavigationState();
    }
  } catch (error) {
    console.error('导航失败:', error);
    if (error.message.includes('Could not establish connection') || error.message.includes('Receiving end does not exist')) {
      showError('页面连接已断开，请重新搜索');
    }
  }
}

// 清除高亮
async function clearHighlights() {
  try {
    await chrome.tabs.sendMessage(currentTabId, {
      type: 'CLEAR_HIGHLIGHTS'
    });

    updateResultCount(0);
    currentIndex.textContent = '- / -';
    currentMatchCount = 0;
    currentMatchIndex = 0;
    currentMatches = [];
    updateNavigationState();
    updateCopyButtonState(false);
  } catch (error) {
    console.error('清除高亮失败:', error);
    // 清除操作失败时不显示错误，因为可能页面已经关闭
  }
}

// 复制所有匹配结果
async function copyResults() {
  if (currentMatches.length === 0) {
    showError('没有可复制的匹配结果');
    return;
  }

  try {
    // 生成复制文本
    const copyText = currentMatches.map((match, index) => {
      return `${index + 1}. ${match.text}`;
    }).join('\n');

    // 复制到剪贴板
    await navigator.clipboard.writeText(copyText);

    // 显示成功提示
    const originalText = copyResultsBtn.innerHTML;
    copyResultsBtn.innerHTML = '✓ 已复制';
    copyResultsBtn.style.backgroundColor = '#4caf50';

    setTimeout(() => {
      copyResultsBtn.innerHTML = originalText;
      copyResultsBtn.style.backgroundColor = '';
    }, 2000);

  } catch (error) {
    console.error('复制失败:', error);
    showError('复制失败，请重试');
  }
}

// 获取标志
function getFlags() {
  const flags = [];
  if (flagG.checked) flags.push('g');
  if (flagI.checked) flags.push('i');
  if (flagM.checked) flags.push('m');
  if (flagS.checked) flags.push('s');
  if (flagU.checked) flags.push('u');
  return flags.join('');
}

// 验证正则表达式
function validateRegex(pattern) {
  if (!pattern) {
    throw new Error('请输入正则表达式');
  }

  try {
    new RegExp(pattern);
    return true;
  } catch (error) {
    throw new Error(`无效的正则表达式: ${error.message}`);
  }
}

// 添加到历史记录
async function addToHistory(pattern) {
  // 移除重复项
  searchHistory = searchHistory.filter(item => item !== pattern);

  // 添加到开头
  searchHistory.unshift(pattern);

  // 限制数量
  if (searchHistory.length > historyLimit) {
    searchHistory = searchHistory.slice(0, historyLimit);
  }

  // 保存到storage
  await chrome.storage.local.set({ searchHistory });

  // 更新UI
  renderHistoryList();
}

// 加载搜索历史
async function loadSearchHistory() {
  try {
    const result = await chrome.storage.local.get(['searchHistory']);
    searchHistory = result.searchHistory || [];
    renderHistoryList();
  } catch (error) {
    console.error('加载搜索历史失败:', error);
  }
}

// 清空搜索历史
async function clearSearchHistory() {
  searchHistory = [];
  await chrome.storage.local.remove('searchHistory');
  renderHistoryList();
}

// 渲染历史记录列表
function renderHistoryList() {
  if (searchHistory.length === 0) {
    historyList.innerHTML = '<div class="empty-history">暂无搜索记录</div>';
    return;
  }

  historyList.innerHTML = searchHistory.map((pattern, index) => `
    <div class="history-item" data-pattern="${escapeHtml(pattern)}">
      <span class="history-pattern">${escapeHtml(pattern)}</span>
      <span class="delete-btn" data-index="${index}">✕</span>
    </div>
  `).join('');

  // 绑定历史项点击事件
  historyList.querySelectorAll('.history-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-btn')) {
        // 删除单个历史项
        const index = parseInt(e.target.dataset.index);
        searchHistory.splice(index, 1);
        chrome.storage.local.set({ searchHistory });
        renderHistoryList();
      } else {
        // 使用历史项进行搜索
        const pattern = item.dataset.pattern;
        patternInput.value = pattern;
        performSearch();
      }
    });
  });
}

// 更新结果数量显示
function updateResultCount(count) {
  resultCount.textContent = `匹配结果: ${count}`;
}

// 更新导航按钮状态
function updateNavigationState() {
  const hasResults = currentMatchCount > 0;
  prevBtn.disabled = !hasResults;
  nextBtn.disabled = !hasResults;
}

// 更新复制按钮状态
function updateCopyButtonState(enabled) {
  copyResultsBtn.disabled = !enabled;
  if (enabled) {
    copyResultsBtn.style.opacity = '1';
  } else {
    copyResultsBtn.style.opacity = '0.5';
  }
}

// 显示错误信息
function showError(message) {
  errorMsg.textContent = message;
  errorMsg.classList.remove('hidden');
}

// 隐藏错误信息
function hideError() {
  errorMsg.classList.add('hidden');
}

// HTML转义
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 从content script接收消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'MATCH_COUNT_UPDATED') {
    currentMatchCount = message.count;
    updateResultCount(message.count);
    updateNavigationState();
  }
});
