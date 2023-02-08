chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.contentScriptQuery == 'fetchJson') {
      fetch(request.url)
          .then(response => response.json())
          .then(json => sendResponse(json))
          .catch(error => console.log(error))
      return true;  // Will respond asynchronously.
    }
  }
);