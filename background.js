const SCREENSHOT_SEND_URL = null;

chrome.runtime.onInstalled.addListener(function (tab) {
    chrome.storage.sync.set({enabled: false});
});

chrome.action.onClicked.addListener(function (tab) {
    toggleEnabled(tab.id);
});

chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    var track_ids = request.track_ids ?? [];
    if (request.img && track_ids.length) {
        sendImg({img: request.img, current_url: request.current_url, track_ids: request.track_ids ?? []}).then(r => {
        });
    }
    if (request.hasOwnProperty('enabled')) {
        toggleEnabled(sender.tab.id, request.enabled);
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

function toggleEnabled(tabId, state = null) {
    chrome.storage.sync.get('enabled', function (data) {
        const newState = state !== null ? state : !data.enabled;

        chrome.tabs.sendMessage(tabId, {text: newState ? 'enabled' : 'disabled'});
        chrome.storage.sync.set({enabled: newState});
    });
}