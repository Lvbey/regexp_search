// Content Script - 页面脚本

// 全局状态
let matches = [];
let currentIndex = 0;
let originalTextNodes = new Map();
let scrollbarMarkersContainer = null;
let scrollMarkerElements = [];
let currentOpacity = 1;

const CONTAINER_ID = "regexp-search-popup-container-id-93d38b5e-4d9a-4b7c-b822-f160b3b8e922";

// 消息监听
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "toggle_popup") {
      const existingContainer = document.getElementById(CONTAINER_ID);
      if (existingContainer) {
          existingContainer.remove(); // 再次点击图标时关闭
      } else {
          createPopup(); // 创建并显示
      }
  }

  switch (message.type) {
    case 'SEARCH':
      handleSearch(message.data).then(sendResponse);
      return true; // 保持消息通道开启

    case 'NAVIGATE':
      handleNavigate(message.data).then(sendResponse);
      return true;

    case 'CLEAR_HIGHLIGHTS':
      clearHighlights();
      sendResponse({ success: true });
      return true;
    case 'CLOSE_IFRAME':
      const existingContainer = document.getElementById(CONTAINER_ID);
      if (existingContainer) existingContainer.remove();
      return true;

    case 'ADJUST_HEIGHT':
      handleAdjustHeight(message.data);
      sendResponse({ success: true });
      return true;

    case 'SET_OPACITY':
      handleSetOpacity(message.data);
      sendResponse({ success: true });
      return true;
  }
});



function createPopup() {
    const container = document.createElement('div');
    container.id = CONTAINER_ID;

    // 加载保存的透明度设置
    loadOpacity();

    // 创建拖动把手（覆盖在顶部）
    const dragHandle = document.createElement('div');
    dragHandle.className = 'popup-drag-handle';

    const iframe = document.createElement('iframe');
    // 获取你在 manifest 中暴露的 HTML 路径
    iframe.src = chrome.runtime.getURL('src/popup/popup.html');
    iframe.allow="clipboard-read; clipboard-write";

    // 设置容器样式，固定在网页右上角，并确保在最顶层
    Object.assign(container.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        width: '500px',
        height: 'auto',
        maxHeight: '80vh',
        minHeight: '65px',
        zIndex: '2147483647', // 网页允许的最大 z-index
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
        backgroundColor: 'white',
        transition: 'height 0.3s ease-out'
    });

    // 设置拖动把手样式
    Object.assign(dragHandle.style, {
        position: 'absolute',
        top: '0',
        left: '0',
        right: '0',
        height: '10px',
        cursor: 'move',
        zIndex: '1',
        backgroundColor: '#4285f4'

    });

    Object.assign(iframe.style, {
        width: '100%',
        height: '65px',
        minHeight: '65px',
        border: 'none',
        display: 'block',
        marginTop: '0px'
    });

    container.appendChild(dragHandle);
    container.appendChild(iframe);
    document.body.appendChild(container);

    // 添加拖动功能
    setupDraggable(container);
}

// 设置容器可拖动
function setupDraggable(container) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    // 鼠标按下
    container.addEventListener('mousedown', (e) => {
        // 只允许在顶部30px区域或iframe外部拖动
        const rect = container.getBoundingClientRect();
        const isDragHandle = e.clientY - rect.top < 30;

        if (isDragHandle || e.target === container) {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = rect.left;
            startTop = rect.top;

            // 禁用iframe的鼠标事件，防止拖动中断
            const iframe = container.querySelector('iframe');
            if (iframe) {
                iframe.style.pointerEvents = 'none';
            }

            e.preventDefault();
        }
    });

    // 鼠标移动
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        let newLeft = startLeft + dx;
        let newTop = startTop + dy;

        // 限制在窗口内
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        const containerWidth = container.offsetWidth;

        newLeft = Math.max(0, Math.min(newLeft, windowWidth - containerWidth));
        newTop = Math.max(0, Math.min(newTop, windowHeight - 50));

        container.style.left = newLeft + 'px';
        container.style.top = newTop + 'px';
        container.style.right = 'auto';
    });

    // 鼠标释放
    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;

            // 恢复iframe的鼠标事件
            const iframe = container.querySelector('iframe');
            if (iframe) {
                iframe.style.pointerEvents = 'auto';
            }
        }
    });
}

// 处理高度调整
function handleAdjustHeight(data) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const { height } = data;

    // 确保高度在合理范围内
    const minHeight = 65;
    const maxHeight = window.innerHeight * 0.8;
    const adjustedHeight = Math.max(minHeight, Math.min(height, maxHeight));

    // 更新容器高度
    container.style.height = adjustedHeight + 'px';

    // 更新iframe高度
    const iframe = container.querySelector('iframe');
    if (iframe) {
        // iframe高度减去拖动把手的高度
        iframe.style.height = (adjustedHeight) + 'px';
    }
}

// 处理透明度设置
function handleSetOpacity(data) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    const { opacity } = data;
    currentOpacity = opacity;

    // 应用透明度到容器
    container.style.opacity = opacity;
}

// 加载透明度设置
async function loadOpacity() {
    try {
        const result = await chrome.storage.local.get(['opacity']);
        if (result.opacity !== undefined) {
            currentOpacity = result.opacity / 100;
            // 在容器创建后应用透明度
            setTimeout(() => {
                const container = document.getElementById(CONTAINER_ID);
                if (container) {
                    container.style.opacity = currentOpacity;
                }
            }, 0);
        }
    } catch (error) {
        console.error(chrome.i18n.getMessage('consoleLoadOpacityFailed'), error);
    }
}

// 处理搜索
async function handleSearch(data) {
  try {
    const { pattern, flags, maxMatches = 1000 } = data;

    // 清除之前的高亮
    clearHighlights();

    // 构建正则表达式
    const regex = new RegExp(pattern, flags);

    // 在DOM中搜索（带最大匹配数限制）
    matches = searchInDOM(regex, document.body, maxMatches);

    // 高亮匹配结果
    if (matches.length > 0) {
      highlightMatches(matches);
      currentIndex = 0;
      updateCurrentHighlight();
      createScrollbarMarkers();
    }

    return {
      success: true,
      count: matches.length,
      matches: matches.map(m => ({
        text: m.text,
        index: m.index,
        length: m.length
      }))
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// 处理导航
async function handleNavigate(data) {
  if (matches.length === 0) {
    return { index: -1 };
  }

  const { direction } = data;

  updateCurrentHighlight(false);

  if (direction === 'first') {
    currentIndex = 0;
  } else if (direction === 'last') {
    currentIndex = matches.length - 1;
  } else if (direction === 'next') {
    currentIndex = (currentIndex + 1) % matches.length;
  } else if (direction === 'previous') {
    currentIndex = (currentIndex - 1 + matches.length) % matches.length;
  }

  updateCurrentHighlight(true);
  updateScrollbarMarker();
  scrollToCurrentMatch();

  return {
    index: currentIndex,
    text: matches[currentIndex].text
  };
}

// 在DOM中搜索
function searchInDOM(regex, root = document.body, maxMatches = 1000) {
  const matches = [];

  // 使用TreeWalker遍历文本节点
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const skipParents = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED'];
        const parentTag = node.parentElement?.tagName;

        // 跳过空白节点和特定父元素内的节点
        if (!node.textContent.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        if (skipParents.includes(parentTag)) {
          return NodeFilter.FILTER_REJECT;
        }

        // 跳过已高亮的节点
        if (node.parentElement?.classList.contains('regexp-highlight')) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  // 收集所有文本节点
  const textNodes = [];
  let node;
  while ((node = walker.nextNode())) {
    textNodes.push(node);
  }

  // 匹配文本
  textNodes.forEach((node, nodeIndex) => {
    // 检查是否已达最大匹配数
    if (matches.length >= maxMatches) {
      return;
    }

    const text = node.textContent;
    let match;
    const nodeRegex = new RegExp(regex.source, regex.flags);
    const global = regex.flags.includes('g');

    // 重置正则表达式的lastIndex
    nodeRegex.lastIndex = 0;

    while ((match = nodeRegex.exec(text)) !== null) {
      // 检查是否已达最大匹配数
      if (matches.length >= maxMatches) {
        break;
      }

      // 防止零宽度匹配导致的无限循环
      if (match[0].length === 0) {
        nodeRegex.lastIndex++;
        continue;
      }

      matches.push({
        text: match[0],
        index: match.index,
        length: match[0].length,
        node: node,
        nodeIndex: nodeIndex
      });

      if (!global) break;
    }
  });

  return matches;
}

// 高亮匹配结果
function highlightMatches(allMatches) {
  // 按节点倒序处理，避免索引问题
  const matchesByNode = {};
  allMatches.forEach((match, idx) => {
    const nodeKey = match.nodeIndex;
    if (!matchesByNode[nodeKey]) {
      matchesByNode[nodeKey] = [];
    }
    matchesByNode[nodeKey].push({ ...match, globalIndex: idx });
  });

  // 对每个节点的匹配进行排序（从后往前）
  Object.keys(matchesByNode).forEach(nodeKey => {
    const nodeMatches = matchesByNode[nodeKey].sort((a, b) => b.index - a.index);
    const node = nodeMatches[0].node;
    const parentNode = node.parentNode;
    const fullText = node.textContent;

    // 替换为高亮元素
    let lastIndex = fullText.length;
    const fragment = document.createDocumentFragment();

    nodeMatches.forEach(match => {
      const beforeText = fullText.substring(match.index + match.length, lastIndex);
      if (beforeText) {
        fragment.insertBefore(document.createTextNode(beforeText), fragment.firstChild);
      }

      const highlightSpan = document.createElement('span');
      highlightSpan.className = 'regexp-highlight';
      highlightSpan.dataset.globalIndex = match.globalIndex;
      highlightSpan.textContent = match.text;

      // 保存原始文本
      originalTextNodes.set(match.globalIndex, match.text);

      fragment.insertBefore(highlightSpan, fragment.firstChild);
      lastIndex = match.index;
    });

    // 添加前面的文本
    const remainingText = fullText.substring(0, lastIndex);
    if (remainingText) {
      fragment.insertBefore(document.createTextNode(remainingText), fragment.firstChild);
    }

    // 替换原节点
    parentNode.replaceChild(fragment, node);
  });
}

// 更新当前高亮
function updateCurrentHighlight(show = true) {
  // 移除所有current类
  document.querySelectorAll('.regexp-highlight.current').forEach(el => {
    el.classList.remove('current');
  });

  // 添加current类到当前匹配
  if (show && matches.length > 0) {
    const highlight = document.querySelector(`.regexp-highlight[data-global-index="${currentIndex}"]`);
    if (highlight) {
      highlight.classList.add('current');
    }
  }
}

// 滚动到当前匹配
function scrollToCurrentMatch() {
  const highlight = document.querySelector(`.regexp-highlight[data-global-index="${currentIndex}"]`);
  if (highlight) {
    highlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

// 创建滚动条标记
function createScrollbarMarkers() {
  if (matches.length === 0) return;

  // 移除旧的标记
  removeScrollbarMarkers();

  // 创建容器
  scrollbarMarkersContainer = document.createElement('div');
  scrollbarMarkersContainer.className = 'regexp-scrollbar-markers';
  document.body.appendChild(scrollbarMarkersContainer);

  // 获取页面高度
  const pageHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;

  // 为每个匹配创建标记
  matches.forEach((match, index) => {
    const highlight = document.querySelector(`.regexp-highlight[data-global-index="${index}"]`);
    if (highlight) {
      const marker = document.createElement('div');
      marker.className = 'regexp-scroll-marker';
      marker.dataset.index = index;

      // 计算标记位置
      const rect = highlight.getBoundingClientRect();
      const scrollTop = window.scrollY;
      const relativeTop = rect.top + scrollTop;
      const percentage = (relativeTop / pageHeight) * 100;

      // 计算标记高度（至少2px）
      const markerHeight = Math.max(2, (rect.height / pageHeight) * 100);

      marker.style.top = `${percentage}%`;
      marker.style.height = `${markerHeight}%`;

      // 点击标记跳转到对应位置
      marker.style.pointerEvents = 'auto';
      marker.style.cursor = 'pointer';
      marker.addEventListener('click', () => {
        currentIndex = index;
        updateCurrentHighlight(true);
        updateScrollbarMarker();
        scrollToCurrentMatch();

        // 通知popup更新
        chrome.runtime.sendMessage({
          type: 'NAVIGATE',
          index: index
        }).catch(() => {});
      });

      // 悬停显示提示
      marker.addEventListener('mouseenter', () => {
        marker.title = `#${index + 1}: ${match.text.substring(0, 50)}${match.text.length > 50 ? '...' : ''}`;
      });

      scrollbarMarkersContainer.appendChild(marker);
      scrollMarkerElements.push(marker);
    }
  });

  // 更新当前标记
  updateScrollbarMarker();
}

// 更新滚动条标记
function updateScrollbarMarker() {
  scrollMarkerElements.forEach((marker, index) => {
    if (index === currentIndex) {
      marker.classList.add('current');
    } else {
      marker.classList.remove('current');
    }
  });
}

// 移除滚动条标记
function removeScrollbarMarkers() {
  if (scrollbarMarkersContainer) {
    scrollbarMarkersContainer.remove();
    scrollbarMarkersContainer = null;
    scrollMarkerElements = [];
  }
}

// 清除高亮
function clearHighlights() {
  const highlights = document.querySelectorAll('.regexp-highlight');

  highlights.forEach(highlight => {
    const parent = highlight.parentNode;
    const text = highlight.textContent;
    parent.replaceChild(document.createTextNode(text), highlight);
  });

  // 清除滚动条标记
  removeScrollbarMarkers();

  // 合并相邻文本节点
  document.body.normalize();

  // 重置状态
  matches = [];
  currentIndex = 0;
  originalTextNodes.clear();
}

// 监听页面动态内容变化
const observer = new MutationObserver((mutations) => {
  // 只在有高亮时才处理
  if (matches.length > 0) {
    // 检查是否需要重新搜索
    let needsRecheck = false;

    mutations.forEach(mutation => {
      if (mutation.type === 'childList' || mutation.type === 'characterData') {
        needsRecheck = true;
      }
    });

    if (needsRecheck) {
      // 可以在这里添加自动重新搜索的逻辑
      // clearHighlights();
    }
  }
});

// 开始观察
observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true
});

// 键盘快捷键支持
document.addEventListener('keydown', (e) => {
  if (matches.length === 0) return;

  //Shift+Enter: 上一个
  if (e.shiftKey && e.key === 'Enter') {
    e.preventDefault();
    handleNavigate({ direction: 'previous' });
  }
});

console.log(chrome.i18n.getMessage('pluginLoaded'));
