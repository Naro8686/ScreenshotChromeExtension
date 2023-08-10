const SCREENSHOT_SEND_URL = null;
chrome.runtime.onInstalled.addListener(function (tab) {
    chrome.storage.sync.set({enabled: true});
});

chrome.action.onClicked.addListener(function (tab) {
    chrome.storage.sync.get('enabled', function (data) {
        const isEnabled = data.enabled !== false;
        chrome.tabs.sendMessage(tab.id, {text: isEnabled ? 'enabled' : 'disabled'});
        chrome.storage.sync.set({enabled: !isEnabled});
        return false;
    });
    return false;
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.img) {
        sendImg({img: request.img, current_url: request.current_url}).then(r => {
            console.log(r);
        });
    }
    sendResponse();
});

async function sendImg(data = {}) {
    try {
        if (!SCREENSHOT_SEND_URL) {
            throw "SCREENSHOT_SEND_URL not set"
        }
        const response = await fetch(SCREENSHOT_SEND_URL, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        });
        return await response.json();
    } catch (error) {
        console.error(error);
    }
    return null;
}