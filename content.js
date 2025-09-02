console.log('YouTube Comment Section Enhancer: Content script loaded at', new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));

let isButtonInserted = false;
let pollingIntervalId = null;

function isVideoPage() {
  return window.location.pathname.includes('/watch') && window.location.search.includes('v=');
}

function extractKeyword() {
  const titleElement = document.querySelector('h1.ytd-watch-metadata') ||
                      document.querySelector('yt-formatted-string#video-title') ||
                      document.querySelector('h1.title.style-scope.ytd-watch-metadata');
  const descriptionElement = document.querySelector('#description yt-formatted-string') ||
                           document.querySelector('#description .ytd-video-description-content');
  
  if (!titleElement && !descriptionElement) {
    console.log('No title or description elements found');
    return null;
  }

  const title = titleElement ? titleElement.innerText.trim() : '';
  const description = descriptionElement ? descriptionElement.innerText.trim() : '';
  console.log('Title:', title);
  console.log('Description:', description);
  const text = `${title} ${description}`.toLowerCase();
  const commonWords = ['the', 'and', 'is', 'in', 'to', 'a', 'of', 'for', 'on', 'with'];
  const words = text.split(/\W+/).filter(word => word.length > 3 && !commonWords.includes(word));
  console.log('Filtered words:', words);
  const wordCount = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  console.log('Word count:', wordCount);
  let keyword = Object.keys(wordCount).reduce((a, b) => wordCount[a] > wordCount[b] ? a : b, '');
  if (!keyword) keyword = title.split(' ')[0] || 'search';
  console.log('Selected keyword:', keyword);
  return keyword;
}

function removeExistingButton() {
  const existingButton = document.querySelector('#custom-button-container');
  if (existingButton) {
    existingButton.remove();
    console.log('Removed existing button container');
  }
}

function insertButton() {
  if (!isVideoPage()) {
    console.log('Not a video page, skipping button insertion');
    removeExistingButton();
    isButtonInserted = false;
    return;
  }

  if (isButtonInserted) {
    console.log('Button already inserted, skipping');
    return;
  }

  const keyword = extractKeyword();
  if (!keyword) {
    console.log('No keyword available, skipping button insertion');
    return;
  }

  const commentSection = document.querySelector('#comments') ||
                        document.querySelector('ytd-comments');
  console.log('Comment section found:', !!commentSection);
  console.log('Comment section hidden:', commentSection?.hasAttribute('hidden'));
  let container = commentSection ? commentSection.parentNode :
                 document.querySelector('ytd-watch-flexy') || document.body;
  console.log('Insertion container:', !!container);
  if (!container) {
    console.log('No valid container found');
    return;
  }

  removeExistingButton();
  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'custom-button-container';
  buttonContainer.className = 'custom-button-container';
  buttonContainer.style.cursor = 'pointer'; // Ensure cursor indicates clickability

  const button = document.createElement('button');
  button.innerText = keyword;
  button.className = 'custom-button';

  const searchIcon = document.createElement('img');
  searchIcon.src = chrome.runtime.getURL('icon/blue_search_icon.png');
  searchIcon.className = 'custom-search-icon';
  searchIcon.alt = 'Search';
  searchIcon.style.pointerEvents = 'none'; // Prevent icon from intercepting clicks
  searchIcon.onerror = () => {
    console.error('Failed to load search icon at', searchIcon.src);
    searchIcon.style.display = 'none';
  };

  // Append button first, then search icon to place icon on the right
  buttonContainer.appendChild(button);
  buttonContainer.appendChild(searchIcon);

  // Make the entire container clickable
  buttonContainer.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent any default behavior
    console.log('Custom button container clicked at', new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}`, '_blank');
  });

  if (commentSection && commentSection.parentNode) {
    commentSection.parentNode.insertBefore(buttonContainer, commentSection);
  } else {
    container.prepend(buttonContainer);
  }
  console.log('Custom button inserted with keyword:', keyword);
  isButtonInserted = true;
}

function tryInsertButtonWithDelay(retryCount = 0, maxRetries = 6) {
  console.log(`Attempting button insertion (retry ${retryCount}/${maxRetries}) at`, new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  removeExistingButton();
  isButtonInserted = false;

  if (!isVideoPage()) {
    console.log('Not a video page, skipping insertion attempt');
    return;
  }

  setTimeout(() => {
    const keyword = extractKeyword();
    if (!keyword && retryCount < maxRetries) {
      console.log('Keyword not ready, retrying...');
      tryInsertButtonWithDelay(retryCount + 1, maxRetries);
      return;
    }
    insertButton();
  }, 1200);
}

function startPolling() {
  if (pollingIntervalId) {
    clearInterval(pollingIntervalId);
    console.log('Cleared previous polling interval');
  }
  pollingIntervalId = setInterval(() => {
    if (!isButtonInserted && isVideoPage()) {
      console.log('Polling: Attempting button insertion...');
      tryInsertButtonWithDelay();
    } else if (!isVideoPage()) {
      console.log('Polling: Not a video page, removing button if present');
      removeExistingButton();
      isButtonInserted = false;
    }
  }, 1800);
}

function waitForYouTubeApp() {
  const checkApp = () => {
    const ytdApp = document.querySelector('ytd-app');
    if (ytdApp) {
      console.log('YouTube SPA root (ytd-app) detected, initializing script');
      document.addEventListener('yt-navigate-finish', () => {
        console.log('yt-navigate-finish event triggered at', new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
        tryInsertButtonWithDelay();
      }, { once: false });
      tryInsertButtonWithDelay();
      startPolling();
      observeDOM();
    } else {
      console.log('Waiting for ytd-app...');
      setTimeout(checkApp, 400);
    }
  };
  checkApp();
}

function observeDOM() {
  const observer = new MutationObserver(() => {
    console.log('MutationObserver triggered for DOM changes');
    if (isVideoPage() && !isButtonInserted) {
      tryInsertButtonWithDelay();
    } else if (!isVideoPage()) {
      removeExistingButton();
      isButtonInserted = false;
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

console.log('Initializing script...');
waitForYouTubeApp();