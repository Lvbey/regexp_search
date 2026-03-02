// Background Script - 后台脚本

// 插件安装时的事件
chrome.runtime.onInstalled.addListener((details) => {
  console.log(chrome.i18n.getMessage('backgroundPluginInstalled'));

  if (details.reason === 'install') {
    // 首次安装，显示欢迎信息
    chrome.storage.local.set({
      searchHistory: [],
      userSettings: {
        autoSearch: false,
        caseSensitive: false
      }
    });
  } else if (details.reason === 'update') {
    // 更新版本
    console.log(chrome.i18n.getMessage('backgroundPluginUpdated', [chrome.runtime.getManifest().version]));
  }
});

// 监听extension图标点击事件（如果需要）
chrome.action.onClicked.addListener((tab) => {
  // 这个事件在popup存在时不会触发
  // 可以用于打开侧边栏或执行其他操作
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  switch (message.type) {
    case 'SAVE_HISTORY':
      saveSearchHistory(message.data).then(() => {
        sendResponse({ success: true });
      });
      return true;

    case 'GET_HISTORY':
      getSearchHistory().then(history => {
        sendResponse({ history });
      });
      return true;
    case 'CLOSE_IFRAME':
      chrome.tabs.sendMessage(sender.tab.id, { action: "CLOSE_POPUP" });
  }

});

// 保存搜索历史
async function saveSearchHistory(pattern) {
  const result = await chrome.storage.local.get(['searchHistory']);
  let history = result.searchHistory || [];

  // 移除重复项
  history = history.filter(item => item !== pattern);

  // 添加到开头
  history.unshift(pattern);

  // 限制数量（最多保存20条）
  const HISTORY_MAX = 20;
  if (history.length > HISTORY_MAX) {
    history = history.slice(0, HISTORY_MAX);
  }

  await chrome.storage.local.set({ searchHistory: history });
}

// 获取搜索历史
async function getSearchHistory() {
  const result = await chrome.storage.local.get(['searchHistory']);
  return result.searchHistory || [];
}

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // 当页面加载完成或URL变化时，清除高亮
  if (changeInfo.status === 'complete') {
    chrome.tabs.sendMessage(tabId, {
      type: 'CLEAR_HIGHLIGHTS'
    }).catch(() => {
      // 忽略错误（可能是内容脚本未注入）
    });
  }
});

// 监听标签页激活
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  // 可以在这里执行一些激活标签页时的操作
});

chrome.action.onClicked.addListener((tab) => {
    // 向当前活跃页面的 content script 发送消息
    chrome.tabs.sendMessage(tab.id, { action: "toggle_popup" }).catch((err) => {
        console.log(chrome.i18n.getMessage('backgroundScriptInjectFailed'));
        chrome.notifications.create({
          type: 'basic',
          iconUrl: '/icons/icon32.png',
          title: chrome.i18n.getMessage('backgroundOperationRestricted'),
          message: chrome.i18n.getMessage('backgroundCannotAccessPage'),
          priority: 2
        });
    });
});


console.log(chrome.i18n.getMessage('backgroundScriptLoaded'));
