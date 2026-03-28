const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL_QUICK = "gemini-2.0-flash";
const MODEL_DEEP = "gemini-1.5-pro";
const MODEL_IMAGE = "gemini-2.0-flash";

// DOM Elements - Selected deferred to ensure availability
let chatContainer, messagesList, userInput, sendBtn, attachBtn, sqBtn, examModeBtn, fileInput, imagePreviewContainer;
let iconSend, iconStop, welcomeScreen, historySidebar, menuBtn, closeSidebarBtn, newChatBtn;
let historyList, typingIndicator, chipSummarize, modeSelector, micBtn;

// State
let currentChatId = null;
let chats = {};
let abortController = null;
let isGenerating = false;
let currentMode = localStorage.getItem('kenowa_current_mode') || 'quick';
let EXAM_DURATION = 30 * 60 * 1000; // Default 30m, updated from server // 'quick', 'deep', 'image'
let currentDraftImages = [];
let isExamMode = false;
let examModeTimeout = null;
let examModeTabId = null;

const APP_VERSION = "1.0.0";

// Auth & Maintenance Globals
const API_BASE = "https://kenowa.synergize.co/server/auth.php";
let authModal, authFormContainer, maintenanceMsg, authUsernameInput, authPasswordInput, authSubmitBtn, authError, tabSignin, tabSignup, authTitle;
let examDelayInput;

// State for Tab Tracking
let currentActiveTabId = null;
let currentTabChatMap = {}; // { tabId: chatId }

// State for Exam Mode
let examModeStartTime = null;
let lastExamPageSignature = "";
let lastExamAnswer = "";
let examCountdownInterval = null;

// New Features: Blocklist & Notifications
let blockedWebsites = [];
chrome.storage.local.get(['kenowa_blocked_websites'], (result) => {
    blockedWebsites = result.kenowa_blocked_websites || [];
});
let seenNotifications = [];

// Lesson / Onboarding Globals
let lessonModal, lessonTitle, lessonText, lessonImage, lessonDots, lessonPrevBtn, lessonNextBtn, lessonSkipBtn;
let currentLessonIndex = 0;

const lessonSteps = [
    {
        title: "Welcome to Kenowa AI",
        text: "Let's get you set up for the best AI experience. This quick guide will help you activate the extension.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`
    },
    {
        title: "Open the Sidebar",
        text: "Click the <strong>three-line bar (Menu)</strong> in the top-left corner to open the sidebar history and options.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`
    },
    {
        title: "Access Settings",
        text: "Look for the <strong>Settings</strong> button at the bottom of the sidebar to manage your profile and keys.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`
    },
    {
        title: "Select Active Provider",
        text: "In Settings, change your Active Provider to <strong>OpenRouter</strong> for access to powerful models.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
    },
    {
        title: "Paste Your API Key",
        text: "Visit <a href='https://openrouter.ai/' target='_blank'>openrouter.ai</a> to get your key, then paste it in the <strong>OpenRouter API Key</strong> field.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zM12 12l.13-.13a5.5 5.5 0 1 1 7.78 7.78l-.13.13L12 12z"></path><path d="M14 14l3.5 3.5"></path><path d="M16.5 11.5l3.5 3.5"></path></svg>`
    },
    {
        title: "Set Default Model",
        text: "Finally, select <strong>OpenRouter: GPT-4o Mini</strong> as your Default AI Model for the best results.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
    },
    {
        title: "Ready to Explore!",
        text: "Configuration complete! You're now ready to use the full power of Kenowa AI version 2.0.",
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`
    }
];

const isVersionOlder = (current, latest) => {
    if (!latest) return false;
    const s1 = String(current).replace(/[^0-9.]/g, '');
    const s2 = String(latest).replace(/[^0-9.]/g, '');
    const v1 = s1.split('.').map(Number);
    const v2 = s2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
        const n1 = v1[i] || 0;
        const n2 = v2[i] || 0;
        if (n1 < n2) return true;
        if (n1 > n2) return false;
    }
    return false;
};

const showAnnouncement = (data, mandatory = true) => {
    const modal = document.getElementById('announcement-modal');
    if (!modal) return;

    const titleEl = document.getElementById('announcement-title');
    const versionEl = document.getElementById('announcement-version-tag');
    const descEl = document.getElementById('announcement-desc');
    const dlBtn = document.getElementById('announcement-download-link');
    const helpBtn = document.getElementById('announcement-help-link');
    const closeBtn = document.getElementById('close-ann-btn');

    if (titleEl) titleEl.innerText = data.version_name || (mandatory ? "New Update Available" : "System Announcement");
    if (versionEl) versionEl.innerText = `v${data.version_number}`;
    if (descEl) descEl.innerText = data.description || (mandatory ? "A new version is available. Please download the update to continue." : "");
    if (dlBtn) {
        if (data.download_link) {
            dlBtn.href = data.download_link;
            dlBtn.classList.remove('hidden');
        } else {
            dlBtn.classList.add('hidden');
        }
    }

    if (helpBtn) {
        if (data.help_link) {
            helpBtn.href = data.help_link;
            helpBtn.classList.remove('hidden');
        } else {
            helpBtn.classList.add('hidden');
        }
    }

    if (closeBtn) {
        if (mandatory) {
            closeBtn.style.display = 'none';
        } else {
            closeBtn.style.display = 'block';
            closeBtn.onclick = () => {
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');
            };
        }
    }

    modal.classList.remove('hidden');
    document.body.classList.add('modal-open');
};

const checkAccountStatus = async () => {
    try {
        updateModelBadge();
        const storedUser = localStorage.getItem('kenowa_user');
        if (!storedUser) {
            if (authModal) {
                authModal.classList.remove('hidden');
                document.body.classList.add('modal-open');
            }
            return false;
        }

        const user = JSON.parse(storedUser);
        // Sync user to storage for background access
        chrome.storage.local.set({ 'kenowa_user': user });

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout to 15s for slower networks

            const response = await fetch(`${API_BASE}?action=check_status&t=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    username: user.username,
                    session_token: user.session_token,
                    time: new Date().toISOString()
                }),
                signal: controller.signal
            });

            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonErr) {
                console.error("Server returned non-JSON response:", text);
                if (text.toLowerCase().includes("<html")) {
                    console.warn("Detected HTML response. This might be a hosting challenge.");
                    // Don't error out entirely, just log it. 
                    // But for auth, we should be stricter.
                }
                return true; 
            }

            if (data.success) {
                // Announcements check
                if (data.announcement) {
                    if (isVersionOlder(APP_VERSION, data.announcement.version_number)) {
                        showAnnouncement(data.announcement, true); // Mandatory update
                        return false;
                    } else {
                        // Check if we've seen this specific announcement already
                        const lastSeenAnn = localStorage.getItem('kenowa_last_seen_ann');
                        if (lastSeenAnn !== data.announcement.version_number) {
                            showAnnouncement(data.announcement, false); // Non-mandatory
                            localStorage.setItem('kenowa_last_seen_ann', data.announcement.version_number);
                        }
                    }
                }

                if (data.maintenance_mode === 'on') {
                    showMaintenanceView();
                    return false;
                } else {
                    hideMaintenanceView();
                }

                if (data.status === 'banned' || data.status === 'blocked') {
                    forceLogout(`Your account is ${data.status}.`);
                    return false;
                }

                // Handle Blocklist
                if (data.blocked_websites) {
                     blockedWebsites = data.blocked_websites;
                     chrome.storage.local.set({ 'kenowa_blocked_websites': blockedWebsites });
                     localStorage.setItem('kenowa_blocked_websites', JSON.stringify(blockedWebsites));
 
                     // Still helpful to re-audit if sidepanel state needs refreshing, but background handles most
                     chrome.tabs.query({}, tabs => {
                         tabs.forEach(t => {
                             if (t.url) checkAndBlockWebsite(t.id, t.url);
                         });
                     });
                 }

                // Handle Push Notifications
                if (data.push_notification) {
                    const nid = data.push_notification.id;
                    const savedSeen = JSON.parse(localStorage.getItem('kenowa_seen_notifications') || '[]');
                    if (!savedSeen.includes(nid)) {
                        showPushNotification(data.push_notification);
                        savedSeen.push(nid);
                        localStorage.setItem('kenowa_seen_notifications', JSON.stringify(savedSeen));
                    }
                }

                // Load Exam Mode Duration
                if (data.exam_mode_duration) {
                    EXAM_DURATION = data.exam_mode_duration * 60 * 1000;
                }

                // Sync Settings with Cloud (Real-time Cross-window Sync)
                if (data.settings) {
                    const s = data.settings;
                    if (s.kenowa_provider) localStorage.setItem('kenowa_provider', s.kenowa_provider);
                    if (s.kenowa_api_key) localStorage.setItem('kenowa_api_key', s.kenowa_api_key);
                    if (s.kenowa_openrouter_key) localStorage.setItem('kenowa_openrouter_key', s.kenowa_openrouter_key);
                    if (s.kenowa_model) localStorage.setItem('kenowa_model', s.kenowa_model);
                    if (s.kenowa_exam_delay) localStorage.setItem('kenowa_exam_delay', s.kenowa_exam_delay);
                    updateModelBadge();
                }

                return true;
            } else {
                if (data.error === 'new_login') {
                    forceLogout(data.message);
                    return false;
                }
            }
        } catch (e) {
            console.error("Status check failed", e);
            return true;
        }
    } catch (e) {
        console.error("Critical error in checkAccountStatus:", e);
        return false;
    }
    return true;
};

const showMaintenanceView = () => {
    if (authModal) {
        authModal.classList.remove('hidden');
        authFormContainer.classList.add('hidden');
        maintenanceMsg.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
};

const hideMaintenanceView = () => {
    if (authModal) {
        // If user is already logged in, hide modal entirely. Otherwise just switch back to auth form.
        if (localStorage.getItem('kenowa_user')) {
            authModal.classList.add('hidden');
            document.body.classList.remove('modal-open');
        } else {
            authFormContainer.classList.remove('hidden');
            maintenanceMsg.classList.add('hidden');
        }
    }
};

const forceLogout = (msg) => {
    localStorage.removeItem('kenowa_user');
    if (authModal) {
        authModal.classList.remove('hidden');
        authFormContainer.classList.remove('hidden');
        maintenanceMsg.classList.add('hidden');
        authError.innerText = msg;
        authError.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
};

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    // Select Elements
    chatContainer = document.getElementById('chat-container');
    messagesList = document.getElementById('messages-list');
    userInput = document.getElementById('user-input');
    sendBtn = document.getElementById('send-btn');
    attachBtn = document.getElementById('attach-btn');
    sqBtn = document.getElementById('sq-btn');
    examModeBtn = document.getElementById('exam-mode-btn');
    fileInput = document.getElementById('file-input');
    imagePreviewContainer = document.getElementById('image-preview-container');
    iconSend = document.getElementById('icon-send');
    iconStop = document.getElementById('icon-stop');
    welcomeScreen = document.getElementById('welcome-screen');
    historySidebar = document.getElementById('history-sidebar');
    menuBtn = document.getElementById('menu-btn');
    closeSidebarBtn = document.getElementById('close-sidebar-btn');
    newChatBtn = document.getElementById('new-chat-btn');
    historyList = document.getElementById('history-list');
    typingIndicator = document.getElementById('typing-indicator');
    chipSummarize = document.getElementById('chip-summarize');
    modeSelector = document.getElementById('mode-selector');
    micBtn = document.getElementById('mic-btn');
    examDelayInput = document.getElementById('settings-exam-delay-input');
    const profileBtn = document.getElementById('profile-btn');
    const logoutBtn = document.getElementById('logout-btn');

    // Attach Event Listeners
    if (menuBtn) menuBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (newChatBtn) newChatBtn.addEventListener('click', startNewChat);
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to sign out?")) {
            localStorage.removeItem('kenowa_user');
            chrome.storage.local.remove(['kenowa_user', 'kenowa_blocked_websites']);
            window.location.reload();
        }
    });

    if (sendBtn) {
        sendBtn.addEventListener('click', () => {
            if (isGenerating) stopGeneration();
            else handleSend();
        });
    }

    if (attachBtn && fileInput) {
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', handleFileSelect);
    }

    if (sqBtn) {
        sqBtn.addEventListener('click', handleSQ);
    }

    if (examModeBtn) {
        examModeBtn.addEventListener('click', toggleExamMode);
    }

    if (userInput) {
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
            }
        });
        userInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') this.style.height = '24px';
        });
    }

    if (modeSelector) {
        modeSelector.addEventListener('change', (e) => {
            currentMode = e.target.value;
            localStorage.setItem('kenowa_current_mode', currentMode);
            if (currentMode === 'image') {
                userInput.placeholder = "Describe the image you want to generate...";
            } else {
                userInput.placeholder = "Message Kenowa or @mention a tab";
            }
        });
        modeSelector.value = currentMode;
    }

    if (micBtn) {
        micBtn.addEventListener('click', toggleVoiceInput);
    }

    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (chip.id === 'chip-summarize') summarizePage();
            else {
                if (userInput) userInput.value = chip.innerText;
                handleSend();
            }
        });
    });

    // Auth & Onboarding UI assignment
    authModal = document.getElementById('auth-modal');
    authFormContainer = document.getElementById('auth-form-container');
    maintenanceMsg = document.getElementById('maintenance-msg');
    authUsernameInput = document.getElementById('auth-username');
    authPasswordInput = document.getElementById('auth-password');
    authSubmitBtn = document.getElementById('auth-submit-btn');
    authError = document.getElementById('auth-error');
    authTitle = document.getElementById('auth-title');
    tabSignin = document.getElementById('tab-signin');
    tabSignup = document.getElementById('tab-signup');
    const tabForgot = document.getElementById('tab-forgot');
    const forgotLink = document.getElementById('forgot-password-link');
    const groupPassword = document.getElementById('group-password');
    const groupEmail = document.getElementById('group-email');
    const authEmailInput = document.getElementById('auth-email');

    // Lesson Elements
    lessonModal = document.getElementById('lesson-modal');
    lessonTitle = document.getElementById('lesson-title');
    lessonText = document.getElementById('lesson-text');
    lessonImage = document.getElementById('lesson-image');
    lessonDots = document.getElementById('lesson-dots');
    lessonPrevBtn = document.getElementById('lesson-prev-btn');
    lessonNextBtn = document.getElementById('lesson-next-btn');
    lessonSkipBtn = document.getElementById('lesson-skip-btn');
    const lessonRetryBtn = document.getElementById('lesson-retry-btn');

    if (lessonNextBtn) lessonNextBtn.addEventListener('click', nextLesson);
    if (lessonPrevBtn) lessonPrevBtn.addEventListener('click', prevLesson);
    if (lessonSkipBtn) lessonSkipBtn.addEventListener('click', skipLessons);
    if (lessonRetryBtn) lessonRetryBtn.addEventListener('click', showLessons);

    const profileModal = document.getElementById('profile-modal');
    const closeProfileBtn = document.getElementById('close-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            const storedUser = localStorage.getItem('kenowa_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const profileUrl = `https://kenowa.synergize.co/profile.php?username=${encodeURIComponent(user.username)}&token=${encodeURIComponent(user.session_token)}`;
                chrome.tabs.create({ url: profileUrl });
            }
        });
    }

    if (closeProfileBtn) {
        closeProfileBtn.addEventListener('click', () => {
            profileModal.classList.add('hidden');
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const newUsername = document.getElementById('profile-new-username').value.trim();
            const newEmail = document.getElementById('profile-new-email').value.trim();
            const newPass = document.getElementById('profile-new-password').value.trim();
            const errorEl = document.getElementById('profile-error');
            const successEl = document.getElementById('profile-success');

            const user = JSON.parse(localStorage.getItem('kenowa_user'));
            saveProfileBtn.innerText = "Updating...";
            saveProfileBtn.disabled = true;

            try {
                const res = await fetch(`${API_BASE}?action=update_profile&t=${Date.now()}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        current_username: user.username,
                        session_token: user.session_token,
                        new_username: newUsername,
                        new_email: newEmail,
                        new_password: newPass
                    })
                });
                const text = await res.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (err) {
                    throw new Error("Invalid server response format. Please refresh and try again.");
                }
                if (data.success) {
                    successEl.classList.remove('hidden');
                    errorEl.classList.add('hidden');
                    document.getElementById('profile-new-password').value = '';
                    
                    // Update local storage and background
                    localStorage.setItem('kenowa_user', JSON.stringify(data.user));
                    chrome.storage.local.set({ 'kenowa_user': data.user });
                    
                    if (document.getElementById('profile-username-display')) {
                        document.getElementById('profile-username-display').innerText = `@${data.user.username}`;
                    }
                    updateGreeting(data.user.username);
                    
                    setTimeout(() => {
                        successEl.classList.add('hidden');
                        if (profileModal) profileModal.classList.add('hidden');
                    }, 2000);
                } else {
                    errorEl.innerText = data.error || "Failed to update profile.";
                    errorEl.classList.remove('hidden');
                }
            } catch (e) {
                errorEl.innerText = "Connection error. " + (e.message || "");
                errorEl.classList.add('hidden');
            } finally {
                saveProfileBtn.innerText = "Update Profile";
                saveProfileBtn.disabled = false;
            }
        });
    }

    let authMode = 'signin';

    function updateAuthUI() {
        if (!authError || !authSubmitBtn) return;
        authError.classList.add('hidden');
        authError.style.color = "";

        if (authMode === 'signin') {
            if (tabSignin) tabSignin.classList.add('active');
            if (tabSignup) tabSignup.classList.remove('active');
            if (tabForgot) tabForgot.classList.add('hidden');
            if (groupPassword) groupPassword.classList.remove('hidden');
            if (groupEmail) groupEmail.classList.add('hidden');
            if (forgotLink) forgotLink.classList.remove('hidden');
            authTitle.innerText = "Welcome Back";
            authSubmitBtn.innerText = "Sign In";
        } else if (authMode === 'signup') {
            if (tabSignup) tabSignup.classList.add('active');
            if (tabSignin) tabSignin.classList.remove('active');
            if (tabForgot) tabForgot.classList.add('hidden');
            if (groupPassword) groupPassword.classList.remove('hidden');
            if (groupEmail) groupEmail.classList.remove('hidden');
            if (forgotLink) forgotLink.classList.add('hidden');
            authTitle.innerText = "Create Account";
            authSubmitBtn.innerText = "Sign Up";
        } else if (authMode === 'forgot') {
            if (tabForgot) {
                tabForgot.classList.remove('hidden');
                tabForgot.classList.add('active');
            }
            if (tabSignin) tabSignin.classList.remove('active');
            if (tabSignup) tabSignup.classList.remove('active');
            if (groupPassword) groupPassword.classList.add('hidden');
            if (groupEmail) groupEmail.classList.remove('hidden');
            authTitle.innerText = "Reset Password";
            authSubmitBtn.innerText = "Request Reset";
        }
    }

    if (tabSignin) tabSignin.addEventListener('click', () => { authMode = 'signin'; updateAuthUI(); });
    if (tabSignup) tabSignup.addEventListener('click', () => { authMode = 'signup'; updateAuthUI(); });
    if (tabForgot) tabForgot.addEventListener('click', () => { authMode = 'forgot'; updateAuthUI(); });
    if (forgotLink) forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: "https://kenowa.synergize.co/server/forgot_password.php" });
    });

    const handleAuth = async () => {
        const username = authUsernameInput.value.trim();
        const password = authPasswordInput.value.trim();
        const email = authEmailInput.value.trim();

        if (authMode === 'signup' && (!username || !password || !email)) {
            authError.innerText = "Username, password and email are required.";
            authError.classList.remove('hidden');
            return;
        }

        if (authMode === 'signin' && (!username || !password)) {
            authError.innerText = "Username and password are required.";
            authError.classList.remove('hidden');
            return;
        }

        authSubmitBtn.innerText = "Processing...";
        authSubmitBtn.disabled = true;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

        try {
            const response = await fetch(`${API_BASE}?action=${authMode}&t=${Date.now()}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ username, password, email, time: new Date().toISOString() }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const text = await response.text();
            
            if (!response.ok) {
                throw new Error(`Server returned ${response.status}: ${text}`);
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (err) {
                if (text.toLowerCase().includes("<html")) {
                    throw new Error("Connection error: The server returned an HTML page instead of JSON. This usually happens with some web hosting. Please open 'https://kenowa.synergize.co/server/auth.php' in a new tab, then come back here and try again.");
                }
                throw new Error("Invalid server response format. Please contact the administrator.");
            }

            if (data.success) {
                if (authMode === 'forgot') {
                    authError.innerText = "Request sent! Check back after admin approval.";
                    authError.style.color = "#2ed573";
                    authError.classList.remove('hidden');
                    authUsernameInput.value = '';
                    authEmailInput.value = '';
                    authSubmitBtn.innerText = "Sent";
                    return;
                }
                if (authMode === 'signup') {
                    authMode = 'signin';
                    updateAuthUI();
                    authError.innerText = "Account created! Please sign in.";
                    authError.style.color = "#2ed573";
                    authError.classList.remove('hidden');
                } else {
                    localStorage.setItem('kenowa_user', JSON.stringify(data.user));
                    chrome.storage.local.set({ 'kenowa_user': data.user });

                    // Sync settings from server back to local
                    if (data.user.settings) {
                        const s = data.user.settings;
                        if (s.kenowa_provider) localStorage.setItem('kenowa_provider', s.kenowa_provider);
                        if (s.kenowa_api_key) localStorage.setItem('kenowa_api_key', s.kenowa_api_key);
                        if (s.kenowa_openrouter_key) localStorage.setItem('kenowa_openrouter_key', s.kenowa_openrouter_key);
                        if (s.kenowa_model) localStorage.setItem('kenowa_model', s.kenowa_model);
                        if (s.kenowa_exam_delay) localStorage.setItem('kenowa_exam_delay', s.kenowa_exam_delay);
                    }

                    authModal.classList.add('hidden');
                    document.body.classList.remove('modal-open');
                    updateGreeting(data.user.username);

                    // Trigger Lesson if first time
                    if (!localStorage.getItem('kenowa_lesson_completed')) {
                        showLessons();
                    }
                }
            } else {
                authError.innerText = data.error || "Authentication failed.";
                authError.classList.remove('hidden');
            }
        } catch (e) {
            console.error("Auth Fetch Error:", e);
            if (e.name === 'AbortError') {
                authError.innerText = "Request timed out. Please try again.";
            } else {
                authError.innerText = "Connection error. Check your server or network. (" + (e.message || "Unknown error") + ")";
            }
            authError.classList.remove('hidden');
        } finally {
            if (authMode === 'signin') authSubmitBtn.innerText = "Sign In";
            else if (authMode === 'signup') authSubmitBtn.innerText = "Sign Up";
            else authSubmitBtn.innerText = "Request Reset";
            authSubmitBtn.disabled = false;
        }
    };

    if (authSubmitBtn) authSubmitBtn.addEventListener('click', handleAuth);

    const handleAuthEnter = (e) => {
        if (e.key === 'Enter') handleAuth();
    };

    if (authUsernameInput) authUsernameInput.addEventListener('keydown', handleAuthEnter);
    if (authPasswordInput) authPasswordInput.addEventListener('keydown', handleAuthEnter);

    // Initial check
    const storedUser = localStorage.getItem('kenowa_user');
    if (!storedUser) {
        if (authModal) authModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
        
        const checkGuestStatus = () => {
            fetch(`${API_BASE}?action=check_registration&t=${Date.now()}`, { credentials: 'include' })
                .then(r => r.text())
                .then(text => {
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch (err) {
                        console.warn("check_registration non-JSON response:", text);
                        return;
                    }
                    if (data.success) {
                        // Mandatory update check even for non-logged-in users
                        if (data.announcement) {
                            const latestVer = data.announcement.version_number;
                            if (isVersionOlder(APP_VERSION, latestVer)) {
                                showAnnouncement(data.announcement);
                                return; // Stop here if update required
                            }
                        }
                        if (data.registration_enabled === 'off') {
                            if (tabSignup) { tabSignup.classList.add('hidden'); tabSignin.style.width = '100%'; }
                            authMode = 'signin';
                            updateAuthUI();
                        } else {
                            if (tabSignup) { tabSignup.classList.remove('hidden'); tabSignin.style.width = ''; }
                        }
                    }
                }).catch(e => console.error(e));
        };
        
        checkGuestStatus();
        setInterval(checkGuestStatus, 10000); // 10s real-time guest status
    } else {
        const user = JSON.parse(storedUser);
        updateGreeting(user.username); // Use username
        checkAccountStatus();
    }



    try {
        const lastId = await loadChats();
        initTabTracking();
        if (lastId && chats[lastId]) {
            loadChat(lastId, false); // Don't toggle sidebar on auto-load
        } else {
            startNewChat();
        }
    } catch (e) {
        console.error(e);
        initTabTracking();
    }
});

function initTabTracking() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs && tabs[0]) {
            currentActiveTabId = tabs[0].id;
        }
    });

    chrome.tabs.onActivated.addListener(activeInfo => {
        currentActiveTabId = activeInfo.tabId;

        // If we have a chat mapped to this tab, load it
        if (currentTabChatMap[currentActiveTabId] && chats[currentTabChatMap[currentActiveTabId]]) {
            loadChat(currentTabChatMap[currentActiveTabId], false);
        } else {
            startNewChat();
        }

        // Update Exam Mode button appearance if active on this tab
        if (examModeBtn) {
            if (isExamMode && examModeTabId === currentActiveTabId) {
                examModeBtn.classList.add('mic-active');
                examModeBtn.style.color = '#4caf50';
            } else {
                examModeBtn.classList.remove('mic-active');
                examModeBtn.style.color = '';
            }
        }
    });

    // Real-time System Status Check (every 10 seconds)
    setInterval(checkAccountStatus, 10 * 1000);
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
        });
    }
}


// Event Delegation for Dynamic Content (Code Copy Buttons)
if (messagesList) {
    messagesList.addEventListener('click', (e) => {
        const btn = e.target.closest('.copy-code-btn');
        if (btn) {
            const code = decodeURIComponent(btn.getAttribute('data-code'));
            copyToClipboard(code, btn);
        }
    });
}


// Functions

function updateGreeting(name) {
    if (!welcomeScreen) return;
    const greetingEl = welcomeScreen.querySelector('.greeting');
    if (greetingEl) {
        const displayName = name || 'there';
        greetingEl.innerText = `Hi ${displayName}, what should we dive into today?`;
    }
}

async function loadChats() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['chats', 'lastChatId']);
        chats = result.chats || {};
        renderHistoryList();
        return result.lastChatId;
    }
    return null;
}

async function saveChats() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
            chats: chats,
            lastChatId: currentChatId
        });
        renderHistoryList();
    }
}

function toggleSidebar() {
    if (historySidebar) historySidebar.classList.toggle('show');
}

function startNewChat() {
    currentChatId = Date.now().toString();
    if (messagesList) messagesList.innerHTML = '';
    if (welcomeScreen) welcomeScreen.classList.remove('hidden');
    if (userInput) {
        userInput.value = '';
        userInput.focus();
    }
    if (historySidebar) historySidebar.classList.remove('show');
    clearImages();
    if (currentActiveTabId) {
        currentTabChatMap[currentActiveTabId] = currentChatId;
    }

    isGenerating = false;
    toggleSendButton(false);
}

function clearImages() {
    currentDraftImages = [];
    renderImagePreviews();
    if (fileInput) fileInput.value = '';
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    files.forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (currentDraftImages.length < 5) { // Limit to 5 images
                currentDraftImages.push(e.target.result);
                renderImagePreviews();
            }
        };
        reader.readAsDataURL(file);
    });
}

function renderImagePreviews() {
    if (!imagePreviewContainer) return;

    imagePreviewContainer.innerHTML = '';
    if (currentDraftImages.length === 0) {
        imagePreviewContainer.classList.add('hidden');
        return;
    }
    imagePreviewContainer.classList.remove('hidden');

    currentDraftImages.forEach((imgSrc, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-thumbnail-wrapper';

        const img = document.createElement('img');
        img.src = imgSrc;
        img.className = 'image-thumbnail';

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = () => {
            currentDraftImages.splice(index, 1);
            renderImagePreviews();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        imagePreviewContainer.appendChild(wrapper);
    });
}

function deleteChat(e, chatId) {
    e.stopPropagation();
    if (confirm('Delete this chat?')) {
        delete chats[chatId];
        saveChats();
        if (currentChatId === chatId) {
            startNewChat();
        }
        for (let tid in currentTabChatMap) {
            if (currentTabChatMap[tid] === chatId) delete currentTabChatMap[tid];
        }
    }
}

function toggleSendButton(loading) {
    isGenerating = loading;
    if (loading) {
        if (iconSend) iconSend.classList.add('hidden');
        if (iconStop) iconStop.classList.remove('hidden');
        if (sendBtn) sendBtn.classList.add('stop');
    } else {
        if (iconSend) iconSend.classList.remove('hidden');
        if (iconStop) iconStop.classList.add('hidden');
        if (sendBtn) sendBtn.classList.remove('stop');
    }
}

function linkify(text) {
    if (typeof text !== 'string') return text;
    if (text.includes('<a href')) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function (url) {
        return `<a href="${url}" target="_blank">${url}</a>`;
    });
}

function copyToClipboard(text, btnElement) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = 'Copied!';
        setTimeout(() => {
            btnElement.innerHTML = originalText;
        }, 2000);
    });
}

function appendMessage(role, content, images = [], animate = false, isReload = false) {
    if (welcomeScreen) welcomeScreen.classList.add('hidden');

    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;

    // Images
    if (images && images.length > 0) {
        const imgsDiv = document.createElement('div');
        imgsDiv.style.display = 'flex';
        imgsDiv.style.gap = '5px';
        imgsDiv.style.marginBottom = '5px';
        imgsDiv.style.flexWrap = 'wrap';
        images.forEach(img => {
            const src = typeof img === 'string' ? img : img.image_url.url;
            const imgEl = document.createElement('img');
            imgEl.src = src;
            imgEl.style.maxWidth = '100px';
            imgEl.style.borderRadius = '5px';
            imgsDiv.appendChild(imgEl);
        });
        msgDiv.appendChild(imgsDiv);
    }

    const textDiv = document.createElement('div');

    // Animate AI response (Typewriter)
    if (role === 'ai' && animate) {
        textDiv.className = 'typewriter-text';
        // We need to append msgDiv now to see streaming
        if (messagesList) messagesList.appendChild(msgDiv);
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

        let i = 0;
        const speed = 15; // ms per char

        function type() {
            if (i < content.length) {
                textDiv.textContent += content.charAt(i);
                i++;
                if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
                setTimeout(type, speed);
            } else {
                // Finished typing
                let finalHTML = typeof parseMarkdown === 'function' ? parseMarkdown(content) : content;
                finalHTML = linkify(finalHTML);
                textDiv.innerHTML = finalHTML;
                addActions(msgDiv, content);
                if (!isReload) saveToHistory(role, content, images);
            }
        }
        type();

    } else {
        // Static render
        let innerHTML = '';
        if (role === 'user') {
            innerHTML = content.replace(/\n/g, '<br>');
        } else {
            innerHTML = typeof parseMarkdown === 'function' ? parseMarkdown(content) : content;
            innerHTML = linkify(innerHTML);
        }
        textDiv.innerHTML = innerHTML;

        // Actions
        if (role === 'ai') {
            addActions(msgDiv, content);
        } else if (role === 'user') {
            const editBtn = document.createElement('button');
            editBtn.className = 'edit-msg-btn';
            editBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
            editBtn.title = "Edit message";
            editBtn.onclick = () => {
                if (userInput) {
                    userInput.value = content;
                    userInput.focus();
                }
            };
            msgDiv.appendChild(editBtn);
        }

        msgDiv.appendChild(textDiv);
        if (messagesList) messagesList.appendChild(msgDiv);
        if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;

        // Save if not animating (animating saves at end)
        if (!animate && !isReload) saveToHistory(role, content, images);
    }

    if (role === 'ai' && animate) {
        msgDiv.appendChild(textDiv);
    }
}

function addActions(parentDiv, content) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'action-btn';
    copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy`;
    copyBtn.onclick = () => copyToClipboard(content, copyBtn);

    const regenBtn = document.createElement('button');
    regenBtn.className = 'action-btn';
    regenBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg> Regenerate`;
    regenBtn.onclick = () => regenerateMessage();

    actionsDiv.appendChild(copyBtn);
    actionsDiv.appendChild(regenBtn);
    parentDiv.appendChild(actionsDiv);
}

function saveToHistory(role, content, images) {
    if (!chats[currentChatId]) {
        chats[currentChatId] = {
            title: content.substring(0, 30) + (content.length > 30 ? '...' : ' Image'),
            messages: [],
            timestamp: Date.now()
        };
    }
    chats[currentChatId].messages.push({ role, content, images });
    saveChats();
}

async function handleSend(textOverride = null) {
    const text = textOverride || (userInput ? userInput.value.trim() : '');
    const hasImages = currentDraftImages.length > 0;

    if (!text && !hasImages) return;

    // Check Status & Maintenance before every AI call
    const isOk = await checkAccountStatus();
    if (!isOk) return;

    // Capture images for this send
    const imagesToSend = [...currentDraftImages];

    if (!textOverride && userInput) {
        userInput.value = '';
        userInput.style.height = '24px';
        appendMessage('user', text, imagesToSend);
        clearImages();
    }

    // Show Loading
    if (currentMode === 'deep') {
        showTypingIndicator("Thinking Deeply (Pro model)...");
    } else if (currentMode === 'image') {
        showTypingIndicator("Painting Masterpiece...");
    } else {
        showTypingIndicator("Kenowa is thinking...");
    }

    toggleSendButton(true);
    abortController = new AbortController();

    try {
        const provider = localStorage.getItem('kenowa_provider') || 'gemini';
        let apiKey, url, body;

        // --- MODE & MODEL SELECTION ---
        let model = localStorage.getItem('kenowa_model') || MODEL_QUICK;

        // Auto-fix legacy models (only likely relevant for Gemini default)
        // Auto-fix legacy models
        if (provider === 'gemini' && model && (model.includes('1.5') && !model.includes('2.0'))) {
            console.log("Migrating legacy model 1.5 to 2.0");
            model = MODEL_QUICK;
            localStorage.setItem('kenowa_model', MODEL_QUICK);
        }

        // For Gemini, we override model based on mode. 
        if (provider === 'gemini') {
            if (currentMode === 'deep') model = MODEL_DEEP;
            else if (currentMode === 'image') model = MODEL_IMAGE;
        }

        if (provider === 'gemini') {
            // --- GEMINI LOGIC ---
            apiKey = localStorage.getItem('kenowa_api_key');
            if (!apiKey) {
                appendMessage('ai', 'Please set your Gemini API Key in Settings.');
                hideTypingIndicator();
                toggleSendButton(false);
                return;
            }

            if (currentMode === 'image' && !checkImageGenLimit()) {
                appendMessage('ai', "🔒 Daily limit reached. You can generate only 1 image per day. Try again tomorrow!");
                return;
            }

            const parts = [];
            if (text) parts.push({ text: text });

            // Handle Images (Inline Data)
            if (hasImages) {
                for (const imgDataUrl of currentDraftImages) {
                    const [header, base64Data] = imgDataUrl.split(',');
                    const mimeType = header.match(/:(.*?);/)[1];
                    parts.push({
                        inline_data: { mime_type: mimeType, data: base64Data }
                    });
                }
            }

            if (parts.length === 0 && !hasImages) return;

            url = `${BASE_URL}${model}:generateContent?key=${apiKey}`;
            body = JSON.stringify({ contents: [{ parts: parts }] });

        } else {
            // --- OPENROUTER (OpenAI Format) LOGIC ---
            apiKey = localStorage.getItem('kenowa_openrouter_key');
            if (!apiKey) {
                appendMessage('ai', 'Please set your OpenRouter API Key in Settings.');
                hideTypingIndicator();
                toggleSendButton(false);
                return;
            }

            const messages = [];
            const contentArray = [];

            if (text) contentArray.push({ type: "text", text: text });

            if (hasImages) {
                for (const imgDataUrl of currentDraftImages) {
                    contentArray.push({
                        type: "image_url",
                        image_url: { url: imgDataUrl }
                    });
                }
            }

            if (contentArray.length === 0) return;

            messages.push({ role: "user", content: contentArray });

            url = "https://openrouter.ai/api/v1/chat/completions";
            body = JSON.stringify({
                model: model, // Depends on user selection in settings
                messages: messages
            });
        }

        // --- FETCH ---
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(provider === 'openrouter' ? {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://kenowa.extension',
                    'X-Title': 'Kenowa Extension'
                } : {})
            },
            body: body,
            signal: abortController.signal
        });

        if (!response.ok) {
            let errorMsg = 'API request failed';
            try {
                const errData = await response.json();
                errorMsg = errData.error?.message || JSON.stringify(errData);
            } catch (e) {
                errorMsg += ` (${response.status} ${response.statusText})`;
            }
            throw new Error(errorMsg);
        }

        const data = await response.json();

        let aiMessage = "";
        let imageResponses = [];

        if (provider === 'gemini') {
            if (data.candidates && data.candidates[0] && data.candidates[0].content) {
                const partsResponse = data.candidates[0].content.parts;
                if (partsResponse) {
                    for (const part of partsResponse) {
                        if (part.text) aiMessage += part.text;
                        else if (part.inline_data) {
                            const base64 = part.inline_data.data;
                            const mime = part.inline_data.mime_type || 'image/png';
                            imageResponses.push(`data:${mime};base64,${base64}`);
                        }
                    }
                }
            }
        } else {
            // OpenRouter / OpenAI Format
            if (data.choices && data.choices[0] && data.choices[0].message) {
                aiMessage = data.choices[0].message.content;
            }
        }

        hideTypingIndicator();

        if (imageResponses.length > 0) {
            if (currentMode === 'image' && provider === 'gemini') logImageGenSuccess();
            appendMessage('ai', aiMessage || "Generated Content:", imageResponses);
        } else {
            if (!aiMessage && !imageResponses.length) aiMessage = "No content generated.";
            appendMessage('ai', aiMessage, [], true);
        }

    } catch (error) {
        hideTypingIndicator();
        if (error.name === 'AbortError') {
            console.log('Fetch aborted');
        } else {
            console.error("API Error", error);
            appendMessage('ai', "Sorry, I can't process that right now. Error: " + error.message);
        }
    } finally {
        toggleSendButton(false);
        abortController = null;
    }
}
function checkImageGenLimit() {
    const lastGen = localStorage.getItem('kenowa_last_image_gen');
    if (!lastGen) return true;

    const lastDate = new Date(parseInt(lastGen));
    const today = new Date();

    return lastDate.getDate() !== today.getDate() ||
        lastDate.getMonth() !== today.getMonth() ||
        lastDate.getFullYear() !== today.getFullYear();
}

function logImageGenSuccess() {
    localStorage.setItem('kenowa_last_image_gen', Date.now().toString());
}

function stopGeneration() {
    if (abortController) {
        abortController.abort();
        hideTypingIndicator();
        toggleSendButton(false);
    }
}

async function handleSQ() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) return;
        const tab = tabs[0];

        if (!tab.url || tab.url.startsWith('chrome://')) {
            appendMessage('ai', 'Cannot analyze system pages.');
            return;
        }

        // Show generic thinking
        showTypingIndicator("Scanning page for questions...");

        // Extract text
        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // simple heuristic to get likely main content
                return document.body.innerText;
            }
        });

        if (result && result[0] && result[0].result) {
            const pageText = result[0].result.substring(0, 5000);
            const prompt = `Strictly identify any quiz/test/problem question in the following text. 
If found, provide ONLY the direct answer.
If multiple, answer the first one.
Do not provide explanations unless necessary for the answer itself.

Text:
${pageText}`;

            // Reset UI state to allow immediate send
            isGenerating = false;
            if (typingIndicator) typingIndicator.classList.add('hidden');

            handleSend(prompt);
        } else {
            hideTypingIndicator();
            appendMessage('ai', 'Could not read page content.');
        }

    } catch (err) {
        hideTypingIndicator();
        console.error(err);
        appendMessage('ai', 'Error scanning page: ' + err.message);
    }
}

async function summarizePage() {
    try {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tabs || tabs.length === 0) return;
        const tab = tabs[0];

        if (!tab.url) {
        } else if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('view-source:')) {
            appendMessage('ai', 'I cannot summarize this system page for security reasons. Try a normal website!');
            return;
        }

        // Check Permissions for this specific site
        try {
            const hasPermission = await new Promise(resolve => {
                chrome.permissions.contains({ origins: [tab.url] }, (result) => resolve(result));
            });

            if (!hasPermission) {
                const granted = await new Promise(resolve => {
                    chrome.permissions.request({ origins: [tab.url] }, (result) => resolve(result));
                });

                if (!granted) {
                    appendMessage('ai', 'I cannot summarize this page because permission was denied.');
                    return;
                }
            }
        } catch (permErr) {
            console.warn("Permission check failed, trying anyway...", permErr);
        }

        const result = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText
        });

        if (result && result[0] && result[0].result) {
            const pageText = result[0].result;
            const truncatedText = pageText.substring(0, 4000);
            const prompt = `Summarize the following page content in a concise, bulleted format:\n\n${truncatedText}`;
            handleSend(prompt);
        } else {
            appendMessage('ai', 'I could not read the content of this page. It might be protected or empty.');
        }
    } catch (err) {
        console.error('Summarization failed', err);
        appendMessage('ai', 'Failed to read page content. \nError: ' + (err.message || 'Unknown error'));
    }
}

function regenerateMessage() {
    const chat = chats[currentChatId];
    if (!chat || !chat.messages.length) return;

    let lastUserMsg = null;
    let spliceIndex = -1;

    for (let i = chat.messages.length - 1; i >= 0; i--) {
        if (chat.messages[i].role === 'user') {
            lastUserMsg = chat.messages[i];
            spliceIndex = i + 1;
            break;
        }
    }

    if (lastUserMsg) {
        if (messagesList) {
            const allMessages = messagesList.querySelectorAll('.message');
            for (let i = spliceIndex; i < chat.messages.length; i++) {
                if (i < allMessages.length) allMessages[i].remove();
            }
        }

        chat.messages.splice(spliceIndex);
        saveChats();

        let textToSend = "";
        let imagesToSend = [];

        if (Array.isArray(lastUserMsg.content)) {
            // Complex structure not fully supported in simple regenerate without parsing.
            // Simplified: grab pure text if complex
            // But we stored it as array in 'content' if it was array. 
            // Wait, in handleSend we send array, but in saveToHistory we save...
            // In handleSend we called appendMessage(user, text, images).
            // appendMessage saves to history { role, content: text, images: images }. 
            // So content is just string. Good.
            textToSend = lastUserMsg.content;
            imagesToSend = lastUserMsg.images || [];
        } else {
            textToSend = lastUserMsg.content;
            imagesToSend = lastUserMsg.images || [];
        }

        currentDraftImages = imagesToSend.map(img => (typeof img === 'string' ? img : img.image_url.url));
        handleSend(textToSend);
    }
}

function showTypingIndicator(message = "Thinking...") {
    if (!typingIndicator) return;

    typingIndicator.innerHTML = `<span class="thinking-text">${message}</span>`;
    typingIndicator.classList.add('thinking-indicator');
    typingIndicator.classList.remove('hidden');
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
}

function hideTypingIndicator() {
    if (typingIndicator) typingIndicator.classList.add('hidden');
}

function renderHistoryList() {
    if (!historyList) return;

    historyList.innerHTML = '';
    const sortedChatIds = Object.keys(chats).sort((a, b) => chats[b].timestamp - chats[a].timestamp);

    sortedChatIds.forEach(id => {
        const chat = chats[id];
        const item = document.createElement('div');
        item.className = 'history-item';

        const titleSpan = document.createElement('span');
        titleSpan.className = 'history-item-title';
        titleSpan.textContent = chat.title || 'New Chat';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-chat-btn';
        deleteBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
        deleteBtn.onclick = (e) => deleteChat(e, id);

        item.appendChild(titleSpan);
        item.appendChild(deleteBtn);
        item.onclick = (e) => {
            loadChat(id, true);
        };

        historyList.appendChild(item);
    });
}

function loadChat(id, closeSidebar = true) {
    currentChatId = id;
    const chat = chats[id];

    // Persist current chat selection
    saveChats();

    if (messagesList) messagesList.innerHTML = '';
    if (welcomeScreen) welcomeScreen.classList.add('hidden');

    chat.messages.forEach(msg => {
        appendMessage(msg.role, msg.content, msg.images, false, true);
    });

    if (closeSidebar) toggleSidebar();
    if (chatContainer) chatContainer.scrollTop = chatContainer.scrollHeight;
}

// Scroll to Bottom Logic
const scrollBottomBtn = document.getElementById('scroll-bottom-btn');
if (scrollBottomBtn && messagesList) {
    // Show/Hide button on scroll
    messagesList.addEventListener('scroll', () => {
        const threshold = 100;
        const isNearBottom = messagesList.scrollHeight - messagesList.scrollTop - messagesList.clientHeight < threshold;

        if (isNearBottom) {
            scrollBottomBtn.classList.add('hidden');
        } else {
            scrollBottomBtn.classList.remove('hidden');
        }
    });

    // Scroll to bottom on click
    scrollBottomBtn.addEventListener('click', () => {
        messagesList.scrollTo({
            top: messagesList.scrollHeight,
            behavior: 'smooth'
        });
    });
}

// Settings & Logout Logic
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        forceLogout('Logged out successfully.');
    });
}

const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const clearDataBtn = document.getElementById('clear-data-btn');

const providerInput = document.getElementById('settings-provider-input');
const keyInput = document.getElementById('settings-key-input');
const openRouterKeyInput = document.getElementById('settings-openrouter-key-input');
const modelInput = document.getElementById('settings-model-input');

if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        if (settingsModal) {
            settingsModal.classList.remove('hidden');
            // Pre-fill current values
            providerInput.value = localStorage.getItem('kenowa_provider') || 'gemini';
            keyInput.value = localStorage.getItem('kenowa_api_key') || '';
            openRouterKeyInput.value = localStorage.getItem('kenowa_openrouter_key') || '';
            modelInput.value = localStorage.getItem('kenowa_model') || MODEL_QUICK;
            if (examDelayInput) examDelayInput.checked = localStorage.getItem('kenowa_exam_delay') !== 'false';
        }
        if (historySidebar) historySidebar.classList.remove('show');
    });
}

if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', () => {
        localStorage.setItem('kenowa_provider', providerInput.value);
        localStorage.setItem('kenowa_api_key', keyInput.value.trim());
        localStorage.setItem('kenowa_openrouter_key', openRouterKeyInput.value.trim());
        localStorage.setItem('kenowa_model', modelInput.value);
        localStorage.setItem('kenowa_exam_delay', examDelayInput.checked ? 'true' : 'false');

        updateModelBadge();

        // Sync to cloud
        syncSettingsToServer();

        // Feedback UI
        const originalText = saveSettingsBtn.innerText;
        saveSettingsBtn.innerText = 'Saved!';
        saveSettingsBtn.style.backgroundColor = '#4caf50';

        setTimeout(() => {
            saveSettingsBtn.innerText = originalText;
            saveSettingsBtn.style.backgroundColor = '';
            if (settingsModal) settingsModal.classList.add('hidden');
        }, 800);
    });
}

if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
        if (settingsModal) settingsModal.classList.add('hidden');
    });
}

if (clearDataBtn) {
    clearDataBtn.addEventListener('click', async () => {
        if (confirm("Are you sure you want to clear all data? This cannot be undone.")) {
            localStorage.clear();
            if (typeof chrome !== 'undefined' && chrome.storage) {
                await chrome.storage.local.clear();
            }
            window.location.reload();
        }
    });
}


// Voice Input Logic
let recognition;

function toggleVoiceInput() {

    if (!('webkitSpeechRecognition' in window)) {
        appendMessage('ai', 'Sorry, speech recognition is not supported in this browser.');
        return;
    }

    if (recognition && recognition.active) {
        recognition.stop();
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = function () {
        recognition.active = true;
        if (micBtn) micBtn.classList.add('mic-active');
        if (userInput) userInput.placeholder = "Listening...";
    };

    recognition.onresult = function (event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            } else {
                interimTranscript += event.results[i][0].transcript;
            }
        }

        if (userInput) {
            // Append to existing text if any? Or replace? 
            // Usually replace for short commands, append for dictation. 
            // Let's go with: if input matches transcript start, update, else append.
            // Simpler: Just set value to current total transcript.
            // But we need to handle existing text in input. 
            // Stick to simple: Replace current input or append?
            // User likely wants to speak the message.
            userInput.value = finalTranscript + interimTranscript;

            // Auto resize
            userInput.style.height = 'auto';
            userInput.style.height = (userInput.scrollHeight) + 'px';
        }
    };

    recognition.onerror = function (event) {
        console.error("Speech recognition error", event.error);
        stopRecognitionUI();
    };

    recognition.onend = function () {
        stopRecognitionUI();
        // Auto send if settings enabled? For now, just let user review and send.
    };

    recognition.start();
}

function stopRecognitionUI() {
    if (recognition) recognition.active = false;
    if (micBtn) micBtn.classList.remove('mic-active');
    if (userInput) userInput.placeholder = "Message Kenowa or @mention a tab";
}

// Exam Mode Logic
// Exam Mode Logic
async function apiGenerateText(prompt) {
    // Check if current tab is blocked
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs && tabs[0]) {
        const url = tabs[0].url;
        if (isWebsiteBlocked(url)) {
            appendMessage('ai', 'This website is on the administrator blocklist. AI features are disabled here.');
            return null;
        }
    }

    // Standard security check
    const isOk = await checkAccountStatus();
    if (!isOk) return null;

    const provider = localStorage.getItem('kenowa_provider') || 'gemini';
    let apiKey, url, body;
    let model = localStorage.getItem('kenowa_model') || MODEL_QUICK;

    if (provider === 'gemini') {
        apiKey = localStorage.getItem('kenowa_api_key');
        if (!apiKey) return null;
        url = `${BASE_URL}${model}:generateContent?key=${apiKey}`;
        body = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
    } else {
        apiKey = localStorage.getItem('kenowa_openrouter_key');
        if (!apiKey) return null;
        url = "https://openrouter.ai/api/v1/chat/completions";
        body = JSON.stringify({
            model: model,
            messages: [{ role: "user", content: [{ type: "text", text: prompt }] }]
        });
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(provider === 'openrouter' ? {
                    'Authorization': `Bearer ${apiKey}`,
                    'HTTP-Referer': 'https://kenowa.extension',
                    'X-Title': 'Kenowa Extension'
                } : {})
            },
            body: body
        });

        if (!response.ok) return null;
        const data = await response.json();

        if (provider === 'gemini') {
            if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts.length) {
                return data.candidates[0].content.parts.map(p => p.text).join('').trim();
            }
        } else {
            if (data.choices && data.choices[0] && data.choices[0].message) {
                return data.choices[0].message.content.trim();
            }
        }
    } catch (e) {
        console.error("Exam mode API error", e);
    }
    return null;
}

function examAppendMessage(text) {
    if (!examModeTabId || !currentTabChatMap[examModeTabId]) {
        appendMessage('ai', text);
        return;
    }

    let targetChatId = currentTabChatMap[examModeTabId];

    if (currentActiveTabId === examModeTabId) {
        appendMessage('ai', text);
    } else {
        if (!chats[targetChatId]) {
            chats[targetChatId] = {
                title: text.substring(0, 30) + '...',
                messages: [],
                timestamp: Date.now()
            };
        }
        chats[targetChatId].messages.push({ role: 'ai', content: text, images: [] });
        saveChats();
    }
}

function updateExamCountdown() {
    if (!isExamMode || !examModeStartTime) return;
    const isExamDelayEnabled = localStorage.getItem('kenowa_exam_delay') !== 'false';
    if (!isExamDelayEnabled) return;

    if (currentActiveTabId !== examModeTabId) {
        if (typingIndicator && !typingIndicator.classList.contains('hidden') && typingIndicator.innerHTML.includes('Exam Mode')) {
            typingIndicator.classList.add('hidden');
        }
        return;
    }

    // EXAM_DURATION is now a global variable updated from server
    // const EXAM_DURATION = 30 * 60 * 1000; 
    let timeElapsed = Date.now() - examModeStartTime;
    let timeLeft = EXAM_DURATION - timeElapsed;

    if (timeLeft > 0) {
        let mins = Math.floor(timeLeft / 60000);
        let secs = Math.floor((timeLeft % 60000) / 1000);
        let msg = `Exam Mode: Waiting to submit (${mins}m ${secs}s left)`;

        if (!typingIndicator.classList.contains('hidden')) {
            const span = typingIndicator.querySelector('.thinking-text');
            if (span && span.innerText.includes('Exam Mode')) {
                span.innerText = msg;
            }
        } else {
            typingIndicator.innerHTML = `<span class="thinking-text">${msg}</span>`;
            typingIndicator.classList.add('thinking-indicator');
            typingIndicator.classList.remove('hidden');
        }
    } else {
        const span = typingIndicator.querySelector('.thinking-text');
        if (span) span.innerText = `Exam Mode: Submitting...`;
    }
}

async function executeExamClicker(tabId, answerText, shouldSubmit, isExamDelayEnabled) {
    if (!tabId) {
        console.error("executeExamClicker: Missing tabId");
        return;
    }
    await chrome.scripting.executeScript({
        target: { tabId: tabId },
        args: [answerText, shouldSubmit, isExamDelayEnabled],
        func: (answerText, shouldSubmit, isExamDelayEnabled) => {
            let aiAnswers = [];
            try {
                let jsonMatch = answerText.match(/\[[\s\S]*\]/);
                if (jsonMatch) {
                    aiAnswers = JSON.parse(jsonMatch[0]);
                } else {
                    aiAnswers = [answerText];
                }
            } catch (e) {
                aiAnswers = [answerText];
            }

            aiAnswers.forEach(ans => {
                if (typeof ans !== 'string') return;
                let cleanAnswer = ans.trim();
                cleanAnswer = cleanAnswer.replace(/^[A-Z][\.\)]\s*/, '').toLowerCase();
                if (!cleanAnswer) return;

                let elements = Array.from(document.querySelectorAll('label, div, span, button, p'));

                let getScore = (el) => {
                    let text = el.innerText ? el.innerText.trim().toLowerCase() : '';
                    if (!text) return 0;
                    if (text === cleanAnswer) return 100;
                    if (text.includes(cleanAnswer) && cleanAnswer.length > 2) return (cleanAnswer.length / text.length) * 100;
                    return 0;
                };

                let bestElement = null;
                let bestScore = 1;
                elements.forEach(el => {
                    let score = getScore(el);
                    if (score > bestScore && el.children.length === 0) {
                        bestScore = score;
                        bestElement = el;
                    }
                });

                if (bestElement) {
                    bestElement.click();
                    let parent = bestElement.parentElement;
                    if (parent) {
                        let inputs = parent.querySelectorAll('input[type="radio"], input[type="checkbox"]');
                        if (inputs.length > 0) inputs[0].click();
                    }
                }
            });

            if (isExamDelayEnabled && !shouldSubmit) {
                let allBtns = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
                allBtns.forEach(b => {
                    let t = (b.innerText || b.value || '').toLowerCase();
                    if (t.includes('submit all and finish') || t.includes('finish attempt') || (t === 'submit' && !b.id.includes('search'))) {
                        if (!b.classList.contains('kenowa-blocked')) {
                            b.style.pointerEvents = 'none';
                            b.style.opacity = '0.4';
                            b.title = "Manual submit blocked. Auto-submit after 30 mins.";
                            b.classList.add('kenowa-blocked');
                        }
                    }
                });
            }

            setTimeout(() => {
                let allBtns = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], a'));
                let submitAllBtns = allBtns.filter(b => (b.innerText || b.value || '').toLowerCase().includes('submit all and finish'));
                let finishAttemptBtns = allBtns.filter(b => (b.innerText || b.value || '').toLowerCase().includes('finish attempt'));
                let nextBtns = allBtns.filter(b => /^(next|continue)\b/i.test(b.innerText || b.value || ''));
                let submitBtns = allBtns.filter(b => (b.innerText || b.value || '').toLowerCase() === 'submit');

                if (shouldSubmit) {
                    if (submitAllBtns.length > 0) submitAllBtns[0].click();
                    else if (finishAttemptBtns.length > 0) finishAttemptBtns[0].click();
                    else if (submitBtns.length > 0) submitBtns[0].click();
                    else if (nextBtns.length > 0) nextBtns[0].click();
                } else {
                    if (nextBtns.length > 0) nextBtns[0].click();
                }
            }, 1000);
        }
    });
}

function toggleExamMode() {
    if (isExamMode && examModeTabId !== null && currentActiveTabId !== examModeTabId) {
        appendMessage('ai', 'Exam Mode is currently running on another tab. Please stop it there first.');
        return;
    }

    isExamMode = !isExamMode;
    if (isExamMode) {
        if (examModeBtn) {
            examModeBtn.classList.add('mic-active');
            examModeBtn.style.color = '#4caf50';
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs[0]) {
                examModeTabId = tabs[0].id;
                examModeStartTime = Date.now();
                lastExamPageSignature = "";
                lastExamAnswer = "";

                examAppendMessage('Exam Mode Activated. Automatically scanning for questions, solving them, clicking the correct option, and proceeding to Next or Submit when time is up.');

                if (localStorage.getItem('kenowa_exam_delay') !== 'false') {
                    examCountdownInterval = setInterval(updateExamCountdown, 1000);
                }

                runExamModeStep();
            }
        });
    } else {
        if (examModeBtn) {
            examModeBtn.classList.remove('mic-active');
            examModeBtn.style.color = '';
        }

        examAppendMessage('Exam Mode Deactivated.');

        examModeTabId = null;
        clearTimeout(examModeTimeout);
        if (examCountdownInterval) {
            clearInterval(examCountdownInterval);
            examCountdownInterval = null;
        }

        if (currentActiveTabId === examModeTabId || (typingIndicator && typingIndicator.innerHTML.includes('Exam Mode'))) {
            hideTypingIndicator();
        }
    }
}

async function runExamModeStep() {
    if (!isExamMode || !examModeTabId) return;

    try {
        let tab;
        try {
            tab = await chrome.tabs.get(examModeTabId);
        } catch (e) {
            examAppendMessage('Exam tab closed. Disabling Exam Mode.');
            if (isExamMode) toggleExamMode();
            return;
        }

        if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
            examAppendMessage('Exam mode cannot run on system pages.');
            if (isExamMode) toggleExamMode();
            return;
        }

        if (!examModeTabId) {
            console.error("Exam Mode Error: examModeTabId is missing before executeScript");
            if (isExamMode) toggleExamMode();
            return;
        }

        const extraction = await chrome.scripting.executeScript({
            target: { tabId: examModeTabId },
            func: () => {
                let text = document.body.innerText;
                let isExamComplete = false;
                if (text.toLowerCase().includes('score') && text.toLowerCase().includes('result')) {
                    isExamComplete = true;
                }
                return { text, isExamComplete };
            }
        });

        if (!extraction || !extraction[0] || !extraction[0].result) {
            throw new Error('Could not read page');
        }

        if (extraction[0].result.isExamComplete) {
            examAppendMessage('Exam appears to be complete.');
            if (isExamMode) toggleExamMode();
            return;
        }

        const pageText = extraction[0].result.text.substring(0, 15000);
        let textForSignature = extraction[0].result.text.replace(/\d+/g, '').replace(/\s+/g, ' ').trim();

        const isExamDelayEnabled = localStorage.getItem('kenowa_exam_delay') !== 'false';
        const EXAM_DURATION = 30 * 60 * 1000;
        const timeElapsed = Date.now() - examModeStartTime;
        const shouldSubmit = !isExamDelayEnabled || (timeElapsed >= EXAM_DURATION);

        if (textForSignature === lastExamPageSignature && lastExamAnswer) {
            await executeExamClicker(examModeTabId, lastExamAnswer, shouldSubmit, isExamDelayEnabled);

            if (shouldSubmit && isExamDelayEnabled) {
                examAppendMessage('Exam Mode 30-minute timer ended. Auto-submitting and disabling Exam Mode automatically.');
                if (isExamMode) toggleExamMode();
                return;
            }

            if (isExamMode) {
                examModeTimeout = setTimeout(runExamModeStep, 4000);
            }
            return;
        }

        const prompt = `You are an expert test-taking assistant. Extracted text from an exam page:
${pageText}

Your task is to identify ALL multiple-choice questions on this page and determine the correct answer for EACH.
Reply with a JSON array containing ONLY the exact text of the correct options as they appear on the page. Do not include the letter/number prefix (e.g. A, B, 1).
Example: ["First correct answer text", "Second correct answer text"]
IMPORTANT: Only output the valid JSON array, no other text or explanation.`;

        if (!examCountdownInterval && currentActiveTabId === examModeTabId) {
            showTypingIndicator("Exam Mode: Scanning page...");
        }

        const aiAnswer = await apiGenerateText(prompt);

        if (!aiAnswer || aiAnswer.trim() === '') {
            examAppendMessage('Exam Mode: Failed to determine answer. Trying again soon.');
        } else {
            lastExamPageSignature = textForSignature;
            lastExamAnswer = aiAnswer;
            examAppendMessage('Exam Mode Found Answer: ' + aiAnswer);
            await executeExamClicker(examModeTabId, aiAnswer, shouldSubmit, isExamDelayEnabled);

            if (shouldSubmit && isExamDelayEnabled) {
                examAppendMessage('Exam Mode 30-minute timer ended. Auto-submitting and disabling Exam Mode automatically.');
                if (isExamMode) toggleExamMode();
                return;
            }
        }

        if (isExamMode) {
            examModeTimeout = setTimeout(runExamModeStep, 4000);
        }

    } catch (err) {
        console.error("Exam Mode Error:", err);
        examAppendMessage('Exam Mode Error: ' + err.message);
        if (isExamMode) toggleExamMode();
    }
}

async function syncSettingsToServer() {
    const storedUser = localStorage.getItem('kenowa_user');
    if (!storedUser) return;
    const user = JSON.parse(storedUser);

    const payload = {
        username: user.username,
        session_token: user.session_token,
        kenowa_provider: localStorage.getItem('kenowa_provider'),
        kenowa_api_key: localStorage.getItem('kenowa_api_key'),
        kenowa_openrouter_key: localStorage.getItem('kenowa_openrouter_key'),
        kenowa_model: localStorage.getItem('kenowa_model'),
        kenowa_exam_delay: localStorage.getItem('kenowa_exam_delay')
    };

    try {
        await fetch(`${API_BASE}?action=save_settings&t=${Date.now()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                ...payload,
                time: new Date().toISOString()
            })
        });
    } catch (e) {
        console.warn("Failed to sync settings to server", e);
    }
}

function updateModelBadge() {
    const badge = document.getElementById('active-model-badge');
    if (!badge) return;

    const currentModel = localStorage.getItem('kenowa_model');
    if (!currentModel) {
        badge.classList.add('hidden');
        return;
    }

    let modelName = currentModel;
    if (currentModel.includes('/')) {
        modelName = currentModel.split('/').pop().replace(/-/g, ' ').toUpperCase();
    } else {
        modelName = currentModel.replace(/-/g, ' ').toUpperCase();
    }

    badge.innerText = modelName;
    badge.classList.remove('hidden');
}

// --- Lesson / Onboarding Logic ---

function showLessons() {
    currentLessonIndex = 0;
    renderLesson();
    if (lessonModal) {
        lessonModal.classList.remove('hidden');
        document.body.classList.add('modal-open');
    }
}

function renderLesson() {
    const step = lessonSteps[currentLessonIndex];
    if (lessonTitle) lessonTitle.innerText = step.title;
    if (lessonText) lessonText.innerHTML = step.text;
    if (lessonImage) lessonImage.innerHTML = step.icon;

    // Render dots
    if (lessonDots) {
        lessonDots.innerHTML = '';
        lessonSteps.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.className = `dot ${i === currentLessonIndex ? 'active' : ''}`;
            lessonDots.appendChild(dot);
        });
    }

    // Buttons
    if (lessonPrevBtn) lessonPrevBtn.disabled = currentLessonIndex === 0;
    if (lessonNextBtn) {
        if (currentLessonIndex === lessonSteps.length - 1) {
            lessonNextBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            lessonNextBtn.title = "Finish";
        } else {
            lessonNextBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`;
            lessonNextBtn.title = "Next";
        }
    }
}

function nextLesson() {
    if (currentLessonIndex < lessonSteps.length - 1) {
        currentLessonIndex++;
        renderLesson();

        // Auto setup based on lesson steps
        if (currentLessonIndex === 4) { // OpenRouter activation step
            localStorage.setItem('kenowa_provider', 'openrouter');
            const providerInput = document.getElementById('settings-provider-input');
            if (providerInput) providerInput.value = 'openrouter';
        }

        if (currentLessonIndex === 6) { // Final "Set Model" step
            localStorage.setItem('kenowa_model', 'openai/gpt-4o-mini');
            const modelInput = document.getElementById('settings-model-input');
            if (modelInput) modelInput.value = 'openai/gpt-4o-mini';
            updateModelBadge();
        }
    } else {
        skipLessons();
    }
}

function prevLesson() {
    if (currentLessonIndex > 0) {
        currentLessonIndex--;
        renderLesson();
    }
}

function skipLessons() {
    localStorage.setItem('kenowa_lesson_completed', 'true');
    if (lessonModal) {
        lessonModal.classList.add('hidden');
        document.body.classList.remove('modal-open');
    }
}

function isWebsiteBlocked(url) {
    if (!url || !blockedWebsites.length) return false;
    return blockedWebsites.some(blocked => url.toLowerCase().includes(blocked.toLowerCase()));
}

function showPushNotification(notice) {
    const modal = document.getElementById('notification-modal');
    const title = document.getElementById('notification-title');
    const msg = document.getElementById('notification-message');
    const closeBtn = document.getElementById('close-notification-btn');

    if (modal && title && msg) {
        title.innerText = notice.title || "Important Update";
        msg.innerHTML = notice.message || notice.text || "";
        modal.classList.remove('hidden');
        document.body.classList.add('modal-open');

        if (closeBtn) {
            closeBtn.onclick = () => {
                modal.classList.add('hidden');
                document.body.classList.remove('modal-open');
            };
        }
    }
}
