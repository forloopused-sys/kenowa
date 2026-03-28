const API_BASE = "https://kenowa.synergize.co/server/auth.php";
let blockedWebsites = [];

// Initialize Blocklist from storage
chrome.storage.local.get(['kenowa_blocked_websites'], (result) => {
    if (result.kenowa_blocked_websites) {
        blockedWebsites = result.kenowa_blocked_websites;
    }
});

// Periodic Sync (every 5 minutes)
async function syncBlocklist() {
    chrome.storage.local.get(['kenowa_user'], async (result) => {
        if (!result.kenowa_user) return;
        const user = result.kenowa_user;

        try {
            const response = await fetch(`${API_BASE}?action=check_status&t=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    username: user.username,
                    session_token: user.session_token,
                    time: new Date().toISOString()
                })
            });
            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { return; }

            if (data.success && data.blocked_websites) {
                blockedWebsites = data.blocked_websites;
                chrome.storage.local.set({ 'kenowa_blocked_websites': blockedWebsites });
            }
        } catch (e) {
            console.error("Background sync failed", e);
        }
    });
}

// Listen for storage changes (when sidepanel updates the list)
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.kenowa_blocked_websites) {
        blockedWebsites = changes.kenowa_blocked_websites.newValue || [];
        // Re-audit all tabs when list changes
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url) checkAndBlockWebsite(tab.id, tab.url);
            });
        });
    }
});

function isWebsiteBlocked(url) {
    if (!url || !blockedWebsites.length) return false;
    return blockedWebsites.some(blocked => url.toLowerCase().includes(blocked.toLowerCase()));
}

function checkAndBlockWebsite(tabId, url) {
    if (!url || url.startsWith('chrome://')) return;

    if (isWebsiteBlocked(url)) {
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                if (document.getElementById('kenowa-block-overlay')) return;
                const overlay = document.createElement('div');
                overlay.id = 'kenowa-block-overlay';
                overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.98);z-index:2147483647;display:flex;align-items:center;justify-content:center;color:white;font-family:sans-serif;text-align:center;';
                overlay.innerHTML = `
                    <div style="padding:40px;border:2px solid #ef4444;border-radius:16px;background:#1e293b;max-width:400px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
                        <div style="font-size:50px;margin-bottom:20px;">🚫</div>
                        <h1 style="font-size:24px;margin-bottom:10px;color:#f87171;">Access Restricted</h1>
                        <p style="font-size:16px;color:#94a3b8;margin-bottom:25px;">This website is blocked by your administrator. AI features are disabled here.</p>
                        <div style="font-size:20px;font-weight:bold;color:white;padding:15px;background:#ef4444;border-radius:8px;text-transform:uppercase;letter-spacing:1px;">
                            close extension and Refresh website
                        </div>
                    </div>
                `;
                document.body.style.overflow = 'hidden';
                document.body.appendChild(overlay);
            }
        }).catch(err => console.log("Script injection failed (expected if tab not accessible):", err));
    }
}

// Tab Listeners
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' || changeInfo.url) {
        checkAndBlockWebsite(tabId, tab.url);
    }
});

chrome.tabs.onActivated.addListener(activeInfo => {
    chrome.tabs.get(activeInfo.tabId, tab => {
        if (tab && tab.url) checkAndBlockWebsite(activeInfo.tabId, tab.url);
    });
});

chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch((error) => console.error(error));

chrome.runtime.onInstalled.addListener(() => {
    syncBlocklist();
    console.log("Kenowa AI Extension Installed");
});

// Real-time background sync every 10 seconds
setInterval(syncBlocklist, 10 * 1000);
