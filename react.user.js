


// ==UserScript==
// @name         Paragon Case Counter & Timer - Manual Reset Only
// @namespace    http://tampermonkey.net/
// @version      8.4
// @description  Counts cases and tracks time for Paragon - Reset ONLY via button - Fixed break logic
// @author       You
// @match        https://paragon-na.amazon.com/*
// @match        https://paragon-eu.amazon.com/*
// @match        https://paragon-fe.amazon.com/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // CHANGE: Add this RIGHT AFTER your initial variable declarations (at the top of your main code)
// XHR Interception for PAA POST request monitoring
const originalOpen = XMLHttpRequest.prototype.open;
const originalSend = XMLHttpRequest.prototype.send;

XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    this._method = method;
    this._url = url;
    return originalOpen.apply(this, [method, url, ...rest]);
};

XMLHttpRequest.prototype.send = function(body) {
    // Monitor POST requests to audit-actions-widget
    if (this._method === 'POST' &&
        this._url.includes('audit-actions-widget') &&
        this._url.includes('ExecuteUow')) {

        this.addEventListener('load', function() {
            if (this.status === 200) {
                // Mark case as having PAA action executed
                updatePAAStatus('executed');
                console.log('PAA action executed detected');
            }
        });
    }

    return originalSend.apply(this, arguments);
};


    if (window.self !== window.top || document.querySelector('#paragon-case-counter')) {
        return;
    }

    const today = new Date().toISOString().split('T')[0];  // ✅ FIXED: Added [0]
    const storageKey = `caseCount_${today}`;
    const marketplaceKey = `marketplace_${today}`;
    const lastCaseKey = `lastCase_${today}`;
    const minimizedKey = 'counterMinimized';
    const totalTimeKey = `totalTime_${today}`;
    const caseTimeKey = `caseTime_${today}`;
    const lastSyncTimeKey = `lastSyncTime_${today}`;
    const wasOnBreakKey = `wasOnBreak_${today}`;
    const storedBeforeBreakKey = `storedBeforeBreak_${today}`;
    const breakStartTimeKey = `breakStartTime_${today}`;
    const exportHistoryKey = 'exportHistory';
    const initializedKey = `initialized_${today}`;
    const wasOfflineKey = `wasOffline_${today}`;
    const globalAuxStatusKey = `globalAuxStatus_${today}`;
    const caseDetailsKey = `caseDetails_${today}`;
    const caseStartTimeKey = `caseStartTime_${today}`;

    let caseCount = GM_getValue(storageKey, 0);
    let marketplaceCounts = GM_getValue(marketplaceKey, {});
    let lastCaseId = GM_getValue(lastCaseKey, '');
    let isMinimized = GM_getValue(minimizedKey, false);
    let achtAlertCount = 0;
    let lastAlertMinute = -1;
    let syncInterval;
    let wasOnBreak = GM_getValue(wasOnBreakKey, false);
    let lastSyncTime = GM_getValue(lastSyncTimeKey, Date.now());
    let storedBeforeBreak = GM_getValue(storedBeforeBreakKey, 0);
    let breakStartTime = GM_getValue(breakStartTimeKey, 0);
    let wasOffline = GM_getValue(wasOfflineKey, false);
    let caseStartTime = GM_getValue(caseStartTimeKey, null);

    const skippedCasesKey = `skippedCases_${today}`;
let skippedCaseIds = new Set(GM_getValue(skippedCasesKey, []));


    const container = document.createElement('div');
    container.id = 'paragon-case-counter';
    Object.assign(container.style, {
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: '2147483647',
        backgroundColor: '#2c2c2c',
        padding: '8px',
        borderRadius: '8px',
        color: 'white',
        fontSize: '10px',
        fontFamily: 'Arial, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        border: '2px solid #444',
        userSelect: 'none',
        opacity: '0.95',
        cursor: 'grab',
        minWidth: '160px',
        transition: 'all 0.3s ease'
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2px',
        paddingBottom: '6px',
        borderBottom: '1px solid #444'
    });

    const headerTitle = document.createElement('div');
Object.assign(headerTitle.style, {
    fontWeight: 'bold',
    fontSize: '13px',
    background: 'linear-gradient(90deg, #00D4FF, #00A8E1, #0080FF)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    letterSpacing: '2px',
    animation: 'glow 2s ease-in-out infinite'
});
headerTitle.textContent = '⚡ REACT ⚡';

    const minimizeButton = document.createElement('button');
    Object.assign(minimizeButton.style, {
        padding: '1px 6px',
        fontSize: '12px',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        border: '1px solid #666',
        borderRadius: '3px',
        color: 'white',
        fontWeight: 'bold'
    });
    minimizeButton.textContent = '−';

    header.appendChild(headerTitle);
    header.appendChild(minimizeButton);

    const contentContainer = document.createElement('div');
    Object.assign(contentContainer.style, {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px'
    });

    const breakIndicator = document.createElement('div');
    Object.assign(breakIndicator.style, {
        backgroundColor: '#ff9800',
        color: '#000',
        padding: '3px 6px',
        borderRadius: '4px',
        fontWeight: 'bold',
        fontSize: '9px',
        display: 'none',
        textAlign: 'center'
    });
    breakIndicator.textContent = '☕ On Break';

    const offlineIndicator = document.createElement('div');
    Object.assign(offlineIndicator.style, {
        backgroundColor: '#9e9e9e',
        color: '#fff',
        padding: '3px 6px',
        borderRadius: '4px',
        fontWeight: 'bold',
        fontSize: '9px',
        display: 'none',
        textAlign: 'center'
    });
    offlineIndicator.textContent = '🌙 You did great today! CYA tomorrow!!';

    const marketplaceDisplay = document.createElement('div');
    Object.assign(marketplaceDisplay.style, {
        fontSize: '10px',
        fontWeight: 'bold',
        padding: '3px',
        textAlign: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px'
    });

    const caseCountDisplay = document.createElement('div');
    Object.assign(caseCountDisplay.style, {
        fontWeight: 'bold',
        fontSize: '11px',
        padding: '3px',
        textAlign: 'center'
    });
    caseCountDisplay.textContent = `Cases: ${caseCount}`;

    const timerDisplay = document.createElement('div');
    Object.assign(timerDisplay.style, {
        fontWeight: 'bold',
        fontSize: '10px',
        padding: '3px',
        textAlign: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px'
    });
    timerDisplay.textContent = 'Time in this case: 00:00:00';

    const totalTimeDisplay = document.createElement('div');
    Object.assign(totalTimeDisplay.style, {
        fontWeight: 'bold',
        fontSize: '10px',
        padding: '3px',
        textAlign: 'center'

    });

    totalTimeDisplay.style.display = 'none';  // Hide total avail time

    const achtDisplay = document.createElement('div');
    Object.assign(achtDisplay.style, {
        fontWeight: 'bold',
        fontSize: '10px',
        padding: '3px',
        textAlign: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: '4px',
        color: '#4CAF50'
    });

    const buttonContainer = document.createElement('div');
    Object.assign(buttonContainer.style, {
        display: 'flex',
        gap: '4px',
        marginTop: '2px'
    });

    const exportButton = document.createElement('button');
    Object.assign(exportButton.style, {
        padding: '3px 6px',
        fontSize: '9px',
        cursor: 'pointer',
        backgroundColor: '#4CAF50',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        fontWeight: 'bold',
        flex: '1'
    });
    exportButton.textContent = '📊 Export';

    const resetButton = document.createElement('button');
    Object.assign(resetButton.style, {
        padding: '3px 6px',
        fontSize: '9px',
        cursor: 'pointer',
        backgroundColor: '#ff4444',
        border: 'none',
        borderRadius: '4px',
        color: 'white',
        fontWeight: 'bold',
        flex: '1'
    });
    resetButton.textContent = 'Reset';



    function confirmAutoAssignment(caseId) {
    return new Promise((resolve) => {
        // Create overlay
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: '2147483646',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
        });

        // Create confirmation dialog
        const dialog = document.createElement('div');
        Object.assign(dialog.style, {
            backgroundColor: '#2c2c2c',
            padding: '20px',
            borderRadius: '8px',
            color: 'white',
            fontSize: '14px',
            fontFamily: 'Arial, sans-serif',
            boxShadow: '0 0 20px rgba(255, 165, 0, 0.8), 0 0 40px rgba(255, 165, 0, 0.4)',
            animation: 'glow 1.5s ease-in-out infinite',
            border: '2px solid #00A8E1',
            maxWidth: '250px',
            textAlign: 'center'
        });

        const message = document.createElement('div');
        message.style.marginBottom = '15px';
        message.innerHTML = `
             <div style="font-weight: bold; font-size: 16px; margin-bottom: 10px;">
        <span class="bell-ring">🔔</span> New Case Detected
    </div>
            <div style="margin-bottom: 10px;">Case ID: <span style="color: #00A8E1;">${caseId}</span></div>
            <div>Was this case <strong>auto-assigned</strong>?</div>`;

        const buttonContainer = document.createElement('div');
        Object.assign(buttonContainer.style, {
            display: 'flex',
            gap: '10px',
            justifyContent: 'center',
            marginTop: '15px'
        });

        const yesButton = document.createElement('button');
        Object.assign(yesButton.style, {
            padding: '8px 20px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: '#4CAF50',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            fontWeight: 'bold'
        });
        yesButton.textContent = 'Yes (Y)';

        const noButton = document.createElement('button');
        Object.assign(noButton.style, {
            padding: '8px 20px',
            fontSize: '14px',
            cursor: 'pointer',
            backgroundColor: '#ff4444',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            fontWeight: 'bold'
        });
        noButton.textContent = 'No (N)';

       /*const timer = document.createElement('div');
        Object.assign(timer.style, {
            marginTop: '10px',
            fontSize: '12px',
            color: '#999'
        });

       let countdown = 10;
        timer.textContent = `Auto-declining in ${countdown}s...`;

        const countdownInterval = setInterval(() => {
            countdown--;
            timer.textContent = `Auto-declining in ${countdown}s...`;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                cleanup(false);
            }
        }, 1000);*/

        function cleanup(result) {
                        document.removeEventListener('keydown', keyHandler);
            document.body.removeChild(overlay);
            resolve(result);
        }

        function keyHandler(e) {
            if (e.key === 'y' || e.key === 'Y') {
                cleanup(true);
            } else if (e.key === 'n' || e.key === 'N' || e.key === 'Escape') {
                cleanup(false);
            }
        }

        yesButton.addEventListener('click', () => cleanup(true));
        noButton.addEventListener('click', () => cleanup(false));
        document.addEventListener('keydown', keyHandler);

        buttonContainer.appendChild(yesButton);
        buttonContainer.appendChild(noButton);
        dialog.appendChild(message);
        dialog.appendChild(buttonContainer);
        //dialog.appendChild(timer);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    });
}


    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function formatACHT(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    function getCaseIdFromUrl() {
        const url = window.location.href;
        const caseIdMatch = url.match(/caseId=(\d+)/) || url.match(/case\/(\d+)/);
        return caseIdMatch ? caseIdMatch[1] : null;
    }

    function isAdminCase() {
        return window.location.href.includes('clientId=PARAGON_ADMIN') || window.location.href.includes('/admin/');
    }

    function isInLobby() {
        return window.location.href.includes('/lobby') || window.location.href.includes('/hz/lobby');
    }

    function isValidForCaseCounting() {
        const url = window.location.href;
        const currentCaseId = getCaseIdFromUrl();

        if (!currentCaseId) {
            return false;
        }

        if (isAdminCase()) {
            return false;
        }

        const isViewCase = url.includes('/hz/view-case') && url.includes('caseId=');
        const isSLLCase = url.includes('/hz/case/') && url.includes('/sll');

        const isExcluded = url.includes('/search') ||
                          url.includes('/list') ||
                          url.includes('/queue') ||
                          url.includes('/tool/') ||
                          url.includes('/internal/');

        return (isViewCase || isSLLCase) && !isExcluded;
    }

    function isRegularCaseWindow() {
        const currentCaseId = getCaseIdFromUrl();
        return currentCaseId && !isAdminCase();
    }

    // ✅ IMPROVED: More robust break detection with debouncing
    function isOnBreak() {
        const globalStatus = GM_getValue(globalAuxStatusKey, { onBreak: false, offline: false, timestamp: 0 });

        if (isAdminCase()) {
            return globalStatus.onBreak;
        }

        const statusElements = document.querySelectorAll('[class*="status"], [class*="State"], [id*="status"], .timerText, [class*="agent"]');
        let foundAvailable = false;
        let foundBreak = false;

        for (const element of statusElements) {
            const text = element.textContent.trim().toLowerCase();
            if (text.length === 0 || text.length > 30) continue;

            // ✅ IMPROVED: Prioritize "available" - if found, immediately return false
            if (text.includes('available')) {
                foundAvailable = true;
                break;
            }

            if (text.includes('break') ||
                text.includes('lunch') ||
                text.includes('meeting') ||
                text.includes('training') ||
                text.includes('system')) {
                foundBreak = true;
            }
        }

        const result = foundAvailable ? false : foundBreak;

        // ✅ IMPROVED: Only update global status if it actually changed
        if (result !== globalStatus.onBreak) {
            GM_setValue(globalAuxStatusKey, { onBreak: result, offline: globalStatus.offline, timestamp: Date.now() });
        }

        return result;
    }

    function isOffline() {
        const globalStatus = GM_getValue(globalAuxStatusKey, { onBreak: false, offline: false, timestamp: 0 });

        if (isAdminCase()) {
            return globalStatus.offline;
        }

        const statusElements = document.querySelectorAll('[class*="status"], [class*="State"], [id*="status"], .timerText, [class*="agent"]');

        for (const element of statusElements) {
            const text = element.textContent.trim().toLowerCase();
            if (text.length === 0 || text.length > 30) continue;

            if (text === 'offline' || text.includes('offline')) {
                if (!globalStatus.offline) {
                    GM_setValue(globalAuxStatusKey, { onBreak: globalStatus.onBreak, offline: true, timestamp: Date.now() });
                }
                return true;
            }
        }

        if (globalStatus.offline) {
            GM_setValue(globalAuxStatusKey, { onBreak: globalStatus.onBreak, offline: false, timestamp: Date.now() });
        }
        return false;
    }

    // ✅ NEW: Detect if the current case has been successfully resolved
function isCaseResolved() {
    const bodyText = document.body.innerText.toLowerCase();
    return bodyText.includes('successfully resolved audit') ||
           bodyText.includes('successfully resolved') || bodyText.includes('successfully');
}

// ✅ NEW: Detect if agent is idle (no active case, not on break, not offline)
function isIdle() {
        if (isAdminCase()) return false;
    const currentCaseId = getCaseIdFromUrl();
    if (!currentCaseId) return !isOnBreak() && !isOffline(); // No case in URL = idle

    // Case URL still open — check if it was already resolved
    return isCaseResolved() && !isOnBreak() && !isOffline();
}

function getParagonAvailableTime() {
    const timerElements = document.querySelectorAll('.timerText');

    for (const element of timerElements) {
        const text = element.textContent.trim();
        const timeMatch = text.match(/(\d{1,2}):(\d{2}):(\d{2})/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]);    // ✅ FIXED - added
            const minutes = parseInt(timeMatch[2]);  // ✅ FIXED - added
            const seconds = parseInt(timeMatch[3]);  // ✅ FIXED - added
            return hours * 3600 + minutes * 60 + seconds;  // ✅ Return single value
        }
    }
    return null;
}



    function getCaseTimer() {
        const taskTimerElement = document.getElementById('taskTimer');
        if (taskTimerElement) {
            const text = taskTimerElement.textContent.trim();
            const timeMatch = text.match(/(\d{1,2}):(\d{2}):(\d{2})/);
            if (timeMatch) {
                const hours = parseInt(timeMatch[1]);
                const minutes = parseInt(timeMatch[2]);
                const seconds = parseInt(timeMatch[3]);
                return hours * 3600 + minutes * 60 + seconds;
            }
        }
        return null;
    }

function playBeep() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 600;  // Lower frequency (was 800) - softer sound
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);  // Quieter (was 0.3)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);  // Shorter (was 0.5)
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);  // Shorter duration
    } catch (e) {
        console.error('Error playing beep:', e);
    }
}

function checkACHTAlert(achtSeconds) {
    const currentCaseCount = GM_getValue(storageKey, 0);

    if (currentCaseCount === 0) return;

    const achtMinutes = achtSeconds / 60;
    const totalTimeSpent = GM_getValue(totalTimeKey, 0);
    const currentMinute = Math.floor(totalTimeSpent / 60);

    // Set color based on threshold
    if (achtMinutes >= 15) {
        achtDisplay.style.color = '#ff4444';  // RED when over goal

        if (isRegularCaseWindow()) {
            const currentTwoMinuteBlock = Math.floor(currentMinute / 2);
            const lastAlertBlock = Math.floor(lastAlertMinute / 2);

            if (currentTwoMinuteBlock !== lastAlertBlock) {
                lastAlertMinute = currentMinute;
                achtAlertCount = 0;
            }

            if (achtAlertCount < 2) {
                console.log('🔊 BEEP TRIGGERED - Block:', currentTwoMinuteBlock, 'Count:', achtAlertCount);
                playBeep();
                achtAlertCount++;
                achtDisplay.style.animation = 'pulse 0.5s';
                setTimeout(() => { achtDisplay.style.animation = ''; }, 500);
            }
        }
    } else {
        achtDisplay.style.color = '#4CAF50';  // GREEN when within goal
        achtAlertCount = 0;
        lastAlertMinute = -1;
    }
}



    /// OLd working

/*   function checkACHTAlert() {
        const totalTimeSpent = GM_getValue(totalTimeKey, 0);
        const currentCaseCount = GM_getValue(storageKey, 0);

        if (currentCaseCount === 0) return;

        const achtMinutes = totalTimeSpent / 60 / currentCaseCount;
        const currentMinute = Math.floor(totalTimeSpent / 60);

        if (achtMinutes > 15) {
            achtDisplay.style.color = '#ff4444';
            if (isRegularCaseWindow()) {
                const currentTwoMinuteBlock = Math.floor(currentMinute / 2);
                const lastAlertBlock = Math.floor(lastAlertMinute / 2);

                if (currentTwoMinuteBlock !== lastAlertBlock) {
                    lastAlertMinute = currentMinute;
                    achtAlertCount = 0;
                }

                if (achtAlertCount < 2) {
                    playBeep();
                    achtAlertCount++;
                    achtDisplay.style.animation = 'pulse 0.5s';
                    setTimeout(() => { achtDisplay.style.animation = ''; }, 500);
                }
            }
        } else {
            achtDisplay.style.color = '#4CAF50';
            achtAlertCount = 0;
            lastAlertMinute = -1;
        }
    } */



function updateACHT() {
    const caseDetails = GM_getValue(caseDetailsKey, []);
    let currentCaseCount = caseDetails.length;
    let totalAuditTime = caseDetails.reduce((sum, detail) => sum + detail.timeSpent, 0);

    // ✅ FIX: Only include current active case if NOT on break or offline
    const storedCaseStartTime = GM_getValue(caseStartTimeKey, null);
    const storedLastCaseId = GM_getValue(lastCaseKey, '');
    const onBreak = isOnBreak();
    const offline = isOffline();

    // ✅ NEW: Only add current case time if actively working (not on break/offline)
    const idle = isIdle(); // ✅ NEW

    const paragonTimerWorking = isRegularCaseWindow() ? getParagonAvailableTime() !== null : true; // ✅ NEW

if (storedCaseStartTime && storedLastCaseId && !onBreak && !offline && !idle && paragonTimerWorking) {
    const now = Date.now();
    const currentCaseTime = Math.floor((now - storedCaseStartTime) / 1000);

    const alreadyRecorded = caseDetails.some(detail => detail.caseId === storedLastCaseId);
    const isSkipped = skippedCaseIds.has(String(storedLastCaseId));  // ✅ FIX

    if (!alreadyRecorded && !isSkipped) {  // ✅ FIX
        totalAuditTime += currentCaseTime;
        currentCaseCount += 1;
    }
}

 if (currentCaseCount > 0) {
    const achtSeconds = totalAuditTime / currentCaseCount;
    const achtFormatted = formatACHT(achtSeconds);
    achtDisplay.textContent = `Avg ACHT for today: ${achtFormatted}`;

    // ✅ NEW: Pass the calculated achtSeconds to checkACHTAlert
    checkACHTAlert(achtSeconds);
} else {
    achtDisplay.textContent = `Avg ACHT for today: 00:00:00`;
}

}


    function updateMarketplaceDisplay() {
        const currentMarketplaceCounts = GM_getValue(marketplaceKey, {});
        let displayText = '';
        const markets = Object.entries(currentMarketplaceCounts);
        if (markets.length > 0) {
            displayText = markets.map(([market, count]) => `${market}: ${count}`).join(' | ');
        } else {
            displayText = 'No cases yet';
        }
        marketplaceDisplay.textContent = displayText;
    }

    function recalculateMarketplaceCounts() {
    const caseDetails = GM_getValue(caseDetailsKey, []);
    const recalculatedCounts = {};

    // Count cases by marketplace from actual case details
    caseDetails.forEach(detail => {
        const marketplace = detail.marketplace || 'Unknown';
        recalculatedCounts[marketplace] = (recalculatedCounts[marketplace] || 0) + 1;
    });

    // Update stored marketplace counts
    GM_setValue(marketplaceKey, recalculatedCounts);

    // Update the display
    updateMarketplaceDisplay();

    console.log('📊 Recalculated marketplace counts:', recalculatedCounts);
}




function exportToCSV() {
    // ✅ FIX 1: Move caseDetails declaration to TOP of function (outside the if block)
    let caseDetails = GM_getValue(caseDetailsKey, []);

    // ✅ FIX 2: Save current case if one is open (captures last case)
    const currentCaseId = getCaseIdFromUrl();
    if (currentCaseId && caseStartTime && isValidForCaseCounting()) {
        const now = Date.now();
        const timeSpent = Math.floor((now - caseStartTime) / 1000);

        // ✅ REMOVED: "let caseDetails = GM_getValue(caseDetailsKey, []);" was here — DELETED
        const marketplace = window.location.href.includes('paragon-eu') ? 'EU' :
                          window.location.href.includes('paragon-na') ? 'NA' :
                          window.location.href.includes('paragon-fe') ? 'FE' : 'Unknown';

        // Check if this case is already in the array (avoid duplicates)
        const existingIndex = caseDetails.findIndex(d => d.caseId === currentCaseId);
        if (existingIndex === -1 && !skippedCaseIds.has(String(currentCaseId))) {  // ✅ skipped check
            caseDetails.push({
                caseId: currentCaseId,
                marketplace: marketplace,
                startTime: new Date(caseStartTime).toISOString(),
                endTime: new Date(now).toISOString(),
                timeSpent: timeSpent,
                status: getCaseStatus()
            });
            GM_setValue(caseDetailsKey, caseDetails);
            console.log('💾 Current case captured for export:', currentCaseId);
        }
    }  // ✅ FIX 2: THIS CLOSING BRACE WAS MISSING — NOW ADDED

    // Get updated case details after capturing current case
    const currentCaseCount = caseDetails.length;
    const currentMarketplaceCounts = GM_getValue(marketplaceKey, {});

    // ✅ FIX: Calculate ACHT using actual case handling time
    let totalAuditTime = 0;
    let achtSeconds = 0;
    if (currentCaseCount > 0) {
        totalAuditTime = caseDetails.reduce((sum, detail) => sum + detail.timeSpent, 0);
        achtSeconds = totalAuditTime / currentCaseCount;
    }

    // Build detailed CSV with fixed date/time format
    let detailedCsvContent = 'Date,Case ID,Marketplace,Start Time,End Time,Time Spent (HH:MM:SS),Status\r';

    caseDetails.forEach(detail => {
        const timeFormatted = formatTime(detail.timeSpent);

        const startDateTime = new Date(detail.startTime);
        const endDateTime = new Date(detail.endTime);

        // ✅ FIX: Extract date once (DD/MM/YYYY format)
        const dateStr = startDateTime.toLocaleDateString('en-GB', {
            timeZone: 'Asia/Kolkata',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        // ✅ FIX: Extract start time only (HH:MM:SS format)
        const startTimeStr = startDateTime.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // ✅ FIX: Extract end time only (HH:MM:SS format)
        const endTimeStr = endDateTime.toLocaleTimeString('en-GB', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        // ✅ Add status at the end
        const status = detail.status || '';

        // ✅ FIX: Use dateStr (not today), separate time columns
        detailedCsvContent += `${dateStr},${detail.caseId},${detail.marketplace},${startTimeStr},${endTimeStr},${timeFormatted},${status}\r`;
    });

    // Update export history
    let exportHistory = GM_getValue(exportHistoryKey, []);
    const todayIndex = exportHistory.findIndex(entry => entry.date === today);

    const newEntry = {
        date: today,
        totalCases: currentCaseCount,
        euCases: currentMarketplaceCounts['EU'] || 0,
        naCases: currentMarketplaceCounts['NA'] || 0,
        feCases: currentMarketplaceCounts['FE'] || 0,
        totalTime: formatTime(totalAuditTime),
        avgACHT: formatACHT(achtSeconds)
    };

    if (todayIndex !== -1) {
        exportHistory[todayIndex] = newEntry;
    } else {
        exportHistory.push(newEntry);
    }

    GM_setValue(exportHistoryKey, exportHistory);

    // Build summary CSV
    let summaryCsvContent = 'Date,Total Cases,EU Cases,NA Cases,FE Cases,Total Audit Time,Average ACHT\r';
    exportHistory.forEach(entry => {
        summaryCsvContent += `${entry.date},${entry.totalCases},${entry.euCases},${entry.naCases},${entry.feCases},${entry.totalTime},${entry.avgACHT}\r
`;
    });

    // Download detailed CSV
    const detailedBlob = new Blob([detailedCsvContent], { type: 'text/csv;charset=utf-8;' });
    const detailedLink = document.createElement('a');
    const detailedUrl = URL.createObjectURL(detailedBlob);
    detailedLink.setAttribute('href', detailedUrl);
    detailedLink.setAttribute('download', `ACHT_Buddy_Case_Details_${today}.csv`);
    detailedLink.style.visibility = 'hidden';
    document.body.appendChild(detailedLink);
    detailedLink.click();
    document.body.removeChild(detailedLink);

    // Download summary CSV after a short delay
    setTimeout(() => {
        const summaryBlob = new Blob([summaryCsvContent], { type: 'text/csv;charset=utf-8;' });
        const summaryLink = document.createElement('a');
        const summaryUrl = URL.createObjectURL(summaryBlob);
        summaryLink.setAttribute('href', summaryUrl);;
        summaryLink.setAttribute('download', 'ACHT_Buddy_Daily_Summary.csv');
        summaryLink.style.visibility = 'hidden';
        document.body.appendChild(summaryLink);
        summaryLink.click();
        document.body.removeChild(summaryLink);
    }, 500);

    // Update button feedback
    exportButton.textContent = '✓ Exported';
    exportButton.style.backgroundColor = '#2196F3';
    setTimeout(() => {
        exportButton.textContent = '📊 Export';
        exportButton.style.backgroundColor = '#4CAF50';
    }, 2000);

    console.log('📊 Data exported successfully - 2 files created');
    console.log('📊 Total cases:', currentCaseCount, '| Total audit time:', formatTime(totalAuditTime), '| Avg ACHT:', formatACHT(achtSeconds));
}




   function applyMinimizeState(minimized) {
        if (minimized) {
            contentContainer.style.display = 'none';
            minimizeButton.textContent = '+';
            container.style.minWidth = '120px';
        } else {
            contentContainer.style.display = 'flex';
            minimizeButton.textContent = '−';
            container.style.minWidth = '160px';
        }
    }

    function toggleMinimize() {
        isMinimized = !isMinimized;
        GM_setValue(minimizedKey, isMinimized);
        applyMinimizeState(isMinimized);
    }

    function syncMinimizeState() {
        const storedMinimized = GM_getValue(minimizedKey, false);
        if (storedMinimized !== isMinimized) {
            isMinimized = storedMinimized;
            applyMinimizeState(isMinimized);
        }
    }

    function updateWindowVisibility() {
        if (isInLobby()) {
            container.style.display = 'none';
        } else {
            container.style.display = 'flex';
        }
    }

    // ✅ IMPROVED: Break logic with no resets during status changes
    function syncWithParagonTimer() {
        const onBreak = isOnBreak();
        const offline = isOffline();

        breakIndicator.style.display = onBreak ? 'flex' : 'none';
        offlineIndicator.style.display = offline ? 'flex' : 'none';

        // OFFLINE HANDLING
        if (offline) {
            if (!wasOffline) {
                // ✅ IMPROVED: Store time before going offline (only once)
                const currentTotalTime = GM_getValue(totalTimeKey, 0);
                if (isRegularCaseWindow()) {
                    const paragonTime = getParagonAvailableTime();
                    if (paragonTime !== null) {
                        GM_setValue(totalTimeKey, paragonTime);
                        GM_setValue(storedBeforeBreakKey, paragonTime);
                        console.log('🌙 Going Offline - Stored Total Time:', paragonTime);
                    } else {
                        // ✅ If Paragon timer not available, keep current stored value
                        GM_setValue(storedBeforeBreakKey, currentTotalTime);
                        console.log('🌙 Going Offline - Kept stored time:', currentTotalTime);
                    }
                } else {
                    GM_setValue(storedBeforeBreakKey, currentTotalTime);
                }
                wasOffline = true;
                GM_setValue(wasOfflineKey, true);
                GM_setValue(caseTimeKey, 0);
            }

            // ✅ IMPROVED: Display stored values without modification
            const storedTotalTime = GM_getValue(storedBeforeBreakKey, 0)
            timerDisplay.textContent = `Time in this case: 00:00:00`;
            totalTimeDisplay.textContent = `Total avail time: ${formatTime(storedTotalTime)}`;

            caseCount = GM_getValue(storageKey, 0);
            caseCountDisplay.textContent = `Cases: ${caseCount}`;
            updateACHT();
            return;


        }

        // BREAK HANDLING
if (onBreak) {
    if (!wasOnBreak) {
        // ✅ Store time before going on break (only once)
        const currentTotalTime = GM_getValue(totalTimeKey, 0);
        if (isRegularCaseWindow()) {
            const paragonTime = getParagonAvailableTime();
            if (paragonTime !== null) {
                GM_setValue(totalTimeKey, paragonTime);
                GM_setValue(storedBeforeBreakKey, paragonTime);
                console.log('🛑 Going on Break - Stored Total Time:', paragonTime);
            } else {
                GM_setValue(storedBeforeBreakKey, currentTotalTime);
                console.log('🛑 Going on Break - Kept stored time:', currentTotalTime);
            }
        } else {
            GM_setValue(storedBeforeBreakKey, currentTotalTime);
        }
        wasOnBreak = true;
        GM_setValue(wasOnBreakKey, true);
        breakStartTime = Date.now();
        GM_setValue(breakStartTimeKey, breakStartTime);
        GM_setValue(caseTimeKey, 0);
        GM_setValue(caseStartTimeKey, null); // new added
        localStorage.removeItem('acht_caseStartTime');


    const currentCaseId = getCaseIdFromUrl();
        if (currentCaseId && caseStartTime&& !isAdminCase()) {
            const now = Date.now();
            const timeSpent = Math.floor((now - caseStartTime) / 1000);
            let caseDetails = GM_getValue(caseDetailsKey, []);
            const marketplace = window.location.href.includes('paragon-eu') ? 'EU' :
                              window.location.href.includes('paragon-na') ? 'NA' :
                              window.location.href.includes('paragon-fe') ? 'FE' : 'Unknown';

            // Check for PAA status
            const pendingPAAKey = `pendingPAA_${new Date().toISOString().split('T')[0]}`;
            let pendingPAA = GM_getValue(pendingPAAKey, {});
            const status = pendingPAA[currentCaseId] ? 'PAA' : '';

const existingIndex = caseDetails.findIndex(d => d.caseId === currentCaseId);
if (existingIndex === -1 && !skippedCaseIds.has(String(currentCaseId))) {  // ✅ FIX
    caseDetails.push({
        caseId: currentCaseId,
        marketplace: marketplace,
        startTime: new Date(caseStartTime).toISOString(),
        endTime: new Date(now).toISOString(),
        timeSpent: timeSpent,
        status: status
    });
    GM_setValue(caseDetailsKey, caseDetails);
    recalculateMarketplaceCounts();
    console.log('💾 Case saved on break with status:', status);
}
        }
    }

    // ✅ FIX: Display the value stored BEFORE break started
    const storedTotalTime = GM_getValue(storedBeforeBreakKey, 0);
    timerDisplay.textContent = `Time in this case: 00:00:00`;
    totalTimeDisplay.textContent = `Total avail time: ${formatTime(storedTotalTime)}`;

    caseCount = GM_getValue(storageKey, 0);
    caseCountDisplay.textContent = `Cases: ${caseCount}`;
    updateACHT();
    return;
}



        // RETURNING FROM BREAK/OFFLINE
// RETURNING FROM BREAK/OFFLINE
        if ((wasOnBreak || wasOffline) && !onBreak && !offline) {
            console.log('✅ Returning from break/offline');

            const storedTimeBeforeBreak = GM_getValue(storedBeforeBreakKey, 0);

            wasOnBreak = false;
            wasOffline = false;
            GM_setValue(wasOnBreakKey, false);
            GM_setValue(wasOfflineKey, false);

            // ✅ IMPROVED: Update total time with cumulative logic
            if (isRegularCaseWindow()) {
                const paragonCurrentTime = getParagonAvailableTime();
                if (paragonCurrentTime !== null) {
                    const newTotalTime = storedTimeBeforeBreak + paragonCurrentTime;
                    GM_setValue(totalTimeKey, newTotalTime);
                    console.log('📊 Resume: Stored:', storedTimeBeforeBreak, '+ Current:', paragonCurrentTime, '= Total:', newTotalTime);
                } else {
                    // ✅ If Paragon timer not available, keep stored value
                    console.log('📊 Resume: Paragon timer not available, keeping stored time:', storedTimeBeforeBreak);
                }
            } else {
                // ✅ In admin window, keep the stored time
                console.log('📊 Resume: In admin window, keeping stored time:', storedTimeBeforeBreak);
            }

            lastSyncTime = Date.now();
            GM_setValue(lastSyncTimeKey, lastSyncTime);
        }




        // NORMAL OPERATION
        let currentCaseTime;
        let totalTimeSpent;

          // ✅ NEW: Idle check — reset case timer and freeze ACHT when no active case
        if (isIdle()) {
            timerDisplay.textContent = `Time in this case: 00:00:00`;
            updateACHT(); // ACHT will freeze since idle = true
            return;
        }

        if (isRegularCaseWindow()) {
            const paragonAvailTime = getParagonAvailableTime();
            const caseTime = getCaseTimer();

            if (paragonAvailTime !== null) {
                const storedTimeBeforeBreak = GM_getValue(storedBeforeBreakKey, 0);

                // ✅ IMPROVED: Simplified cumulative logic
                if (storedTimeBeforeBreak > 0) {
                    totalTimeSpent = storedTimeBeforeBreak + paragonAvailTime;
                    //GM_setValue(storedBeforeBreakKey, 0);
                } else {
                    totalTimeSpent = paragonAvailTime;
                }

                GM_setValue(totalTimeKey, totalTimeSpent);
                lastSyncTime = Date.now();
                GM_setValue(lastSyncTimeKey, lastSyncTime);
            } else {
                totalTimeSpent = GM_getValue(totalTimeKey, 0);
            }

            /*if (caseTime !== null) {
                currentCaseTime = caseTime;
                GM_setValue(caseTimeKey, currentCaseTime);
            }else if (isCaseResolved()) {
                // ✅ NEW: Case resolved but still on case URL — reset case timer
                currentCaseTime = 0;
                GM_setValue(caseTimeKey, 0);
            GM_setValue(caseStartTimeKey, null);  // ✅ ADD THIS LINE
    localStorage.removeItem('acht_caseStartTime');  // ✅ ADD THIS LINE
            }

            else {
                  const _storedStart = GM_getValue(caseStartTimeKey, null);
    currentCaseTime = _storedStart ? Math.floor((Date.now() - _storedStart) / 1000) : GM_getValue(caseTimeKey, 0);
            }
              } else {
            // Admin window - read live caseStartTime from localStorage
            const lsStart = localStorage.getItem('acht_caseStartTime');
            const _storedStart = lsStart ? parseInt(lsStart, 10) : null;
            currentCaseTime = _storedStart ? Math.floor((Date.now() - _storedStart) / 1000) : GM_getValue(caseTimeKey, 0);
            totalTimeSpent = GM_getValue(totalTimeKey, 0);
        }*/

                        if (caseTime !== null) {
                currentCaseTime = caseTime;
                GM_setValue(caseTimeKey, currentCaseTime);
            } else {
                currentCaseTime = GM_getValue(caseTimeKey, 0);
            }
        } else {
            // Admin case or other window - read from storage
            currentCaseTime = GM_getValue(caseTimeKey, 0);
            totalTimeSpent = GM_getValue(totalTimeKey, 0);
        }


        timerDisplay.textContent = `Time in this case: ${formatTime(currentCaseTime)}`;
        totalTimeDisplay.textContent = `Total avail time: ${formatTime(totalTimeSpent)}`;

        caseCount = GM_getValue(storageKey, 0);
        caseCountDisplay.textContent = `Cases: ${caseCount}`;
        updateACHT();
    }

    function startTimerSync() {
        if (syncInterval) clearInterval(syncInterval);

        const isInitialized = GM_getValue(initializedKey, false);
        if (!isInitialized && isRegularCaseWindow()) {
            const paragonTime = getParagonAvailableTime();
            if (paragonTime !== null) {
                GM_setValue(totalTimeKey, paragonTime);
                GM_setValue(initializedKey, true);
                console.log('🌅 Day start - Initialized with Paragon time:', paragonTime);
            }
        }

        lastSyncTime = Date.now();
        GM_setValue(lastSyncTimeKey, lastSyncTime);
        syncInterval = setInterval(syncWithParagonTimer, 1000);
    }

    function updateBreakStatus() {
        const onBreak = isOnBreak();
        const offline = isOffline();
        breakIndicator.style.display = onBreak ? 'flex' : 'none';
        offlineIndicator.style.display = offline ? 'flex' : 'none';
    }







async function incrementCounter() {
    console.log('🔍 incrementCounter called - Current count:', GM_getValue(storageKey, 0));

    const currentCaseId = getCaseIdFromUrl();
    startTimerSync();

    caseCount = GM_getValue(storageKey, 0);
    marketplaceCounts = GM_getValue(marketplaceKey, {});
    caseCountDisplay.textContent = `Cases: ${caseCount}`;
    updateMarketplaceDisplay();
    updateACHT();

    if (!isValidForCaseCounting()) {
        console.log('⛔️ Not a valid case for counting - skipping increment');
        return;
    }

    if (String(currentCaseId) !== String(lastCaseId)) {
        const now = Date.now();

        // ✅ FIX: Ask for confirmation FIRST before saving anything
        const isAutoAssigned = await confirmAutoAssignment(currentCaseId);

        if (!isAutoAssigned) {
            console.log('❌ User confirmed case was NOT auto-assigned - skipping increment');
            // Still update lastCaseId to track we've seen this case
            lastCaseId = String(currentCaseId);
            GM_setValue(lastCaseKey, String(currentCaseId));
            // ✅ FIX: Persist this case ID as skipped so save block ignores it even after page reload
            skippedCaseIds.add(String(currentCaseId));
            GM_setValue(skippedCasesKey, [...skippedCaseIds]);
            //caseStartTime = now;
            // GM_setValue(caseStartTimeKey, caseStartTime);
            return;
        }

        // ✅ FIX: Save previous case ONLY AFTER user clicked Yes
        // ✅ FIX: Also skip saving if lastCaseId was a skipped (No) case
        if (lastCaseId && lastCaseId !== '' && caseStartTime && !skippedCaseIds.has(String(lastCaseId))) {
            const timeSpent = Math.floor((now - caseStartTime) / 1000);

            let caseDetails = GM_getValue(caseDetailsKey, []);
            const previousMarketplace = window.location.href.includes('paragon-eu') ? 'EU' :
                                      window.location.href.includes('paragon-na') ? 'NA' :
                                      window.location.href.includes('paragon-fe') ? 'FE' : 'Unknown';

            // Check for pending reject status
            const pendingRejectsKey = `pendingRejects_${new Date().toISOString().split('T')[0]}`;
            let pendingRejects = GM_getValue(pendingRejectsKey, {});

            // Check for pending PAA status
            const pendingPAAKey = `pendingPAA_${new Date().toISOString().split('T')[0]}`;
            let pendingPAA = GM_getValue(pendingPAAKey, {});

            // Determine status priority: Reject > PAA > default
            let status = '';
            if (pendingRejects[lastCaseId]) {
                status = 'Rejected case';
            } else if (pendingPAA[lastCaseId]) {
                status = 'PAA';
            } else {
                status = getCaseStatus();
            }

            // Prevent duplicate entries
            const existingIndex = caseDetails.findIndex(d => d.caseId === lastCaseId);

            if (existingIndex === -1) {
                // Only add if case doesn't already exist
                caseDetails.push({
                    caseId: lastCaseId,
                    marketplace: previousMarketplace,
                    startTime: new Date(caseStartTime).toISOString(),
                    endTime: new Date(now).toISOString(),
                    timeSpent: timeSpent,
                    status: status
                });
                GM_setValue(caseDetailsKey, caseDetails);
            } else {
                // Update existing entry instead of adding duplicate
                caseDetails[existingIndex] = {
                    caseId: lastCaseId,
                    marketplace: previousMarketplace,
                    startTime: new Date(caseStartTime).toISOString(),
                    endTime: new Date(now).toISOString(),
                    timeSpent: timeSpent,
                    status: status
                };
                GM_setValue(caseDetailsKey, caseDetails);
            }

            // Clear the pending statuses after using them
            if (pendingRejects[lastCaseId]) {
                delete pendingRejects[lastCaseId];
                GM_setValue(pendingRejectsKey, pendingRejects);
                console.log('📝 Case completed with REJECT status:', lastCaseId, 'Duration:', formatTime(timeSpent));
            } else if (pendingPAA[lastCaseId]) {
                delete pendingPAA[lastCaseId];
                GM_setValue(pendingPAAKey, pendingPAA);
                console.log('📝 Case completed with PAA status:', lastCaseId, 'Duration:', formatTime(timeSpent));
            } else {
                console.log('📝 Case completed:', lastCaseId, 'Duration:', formatTime(timeSpent));
            }
        }

        console.log('✅ User confirmed case WAS auto-assigned - incrementing counter');

        caseStartTime = now;
        GM_setValue(caseStartTimeKey, caseStartTime);
        localStorage.setItem('acht_caseStartTime', String(caseStartTime));

        lastCaseId = String(currentCaseId);
        GM_setValue(lastCaseKey, String(currentCaseId));

        const marketplace = window.location.href.includes('paragon-eu') ? 'EU' :
                          window.location.href.includes('paragon-na') ? 'NA' :
                          window.location.href.includes('paragon-fe') ? 'FE' : 'Unknown';

        caseCount++;
        marketplaceCounts[marketplace] = (marketplaceCounts[marketplace] || 0) + 1;

        GM_setValue(storageKey, caseCount);
        GM_setValue(marketplaceKey, marketplaceCounts);

        caseCountDisplay.textContent = `Cases: ${caseCount}`;
        updateMarketplaceDisplay();

        console.log('✅ New case counted:', currentCaseId, 'Marketplace:', marketplace, 'Total:', caseCount);
    }
}




    function getCaseStatus() {
    const url = window.location.href;

    // Check if it's a rejected case
    if (url.includes('https://paragon-eu.amazon.com/hz/action/resolve-case') ||
        url.includes('/hz/api/get-resolve-case-data?caseId=')) {
        return 'Rejected case';
    }

    return '';  // Empty for normal cases
} 

 



// ✅ NEW FUNCTION - ADD THIS ENTIRE BLOCK HERE
function monitorRejectAPI() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args;

        if (typeof url === 'string' &&
            (url.includes('/hz/api/get-resolve-case-data') ||
             url.includes('/hz/action/resolve-case'))) {

            console.log('🚨 Reject API detected:', url);

            // ✅ FIX: Extract case ID correctly (use  for captured group)
            const urlCaseIdMatch = url.match(/caseId=(\d+)/);
            const urlCaseId = urlCaseIdMatch ? urlCaseIdMatch : null;

            const targetCaseId = urlCaseId || getCaseIdFromUrl() || lastCaseId;

            console.log('🎯 Target case ID for rejection:', targetCaseId);

            if (targetCaseId) {
                let caseDetails = GM_getValue(caseDetailsKey, []);
                const caseIndex = caseDetails.findIndex(d => d.caseId === targetCaseId);

                if (caseIndex !== -1) {
                    caseDetails[caseIndex].status = 'Rejected case';
                    GM_setValue(caseDetailsKey, caseDetails);
                    console.log('✅ Updated existing case status to "Rejected case" for:', targetCaseId);
                } else {
                    // ✅ FIX: Add  to get date string
                 //   const pendingRejectsKey = `pendingRejects_${new Date().toISOString().split('T')}`;
                   const pendingRejectsKey = `pendingRejects_${new Date().toISOString().split('T')[0]}`;


                    let pendingRejects = GM_getValue(pendingRejectsKey, {});
                    pendingRejects[targetCaseId] = 'Rejected case';
                    GM_setValue(pendingRejectsKey, pendingRejects);
                    console.log('📝 Stored pending reject status for:', targetCaseId);
                }
            } else {
                console.error('❌ Could not determine case ID for rejection');
            }
        }

        return originalFetch.apply(this, args);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string' &&
            (url.includes('/hz/api/get-resolve-case-data') ||
             url.includes('/hz/action/resolve-case'))) {

            console.log('🚨 Reject API detected (XHR):', url);

            // ✅ FIX: Extract case ID correctly (use  for captured group)
            const urlCaseIdMatch = url.match(/caseId=(\d+)/);
            const urlCaseId = urlCaseIdMatch ? urlCaseIdMatch : null;
            const targetCaseId = urlCaseId || getCaseIdFromUrl() || lastCaseId;

            console.log('🎯 Target case ID for rejection:', targetCaseId);

            if (targetCaseId) {
                let caseDetails = GM_getValue(caseDetailsKey, []);
                const caseIndex = caseDetails.findIndex(d => d.caseId === targetCaseId);

                if (caseIndex !== -1) {
                    caseDetails[caseIndex].status = 'Rejected case';
                    GM_setValue(caseDetailsKey, caseDetails);
                    console.log('✅ Updated existing case status to "Rejected case" for:', targetCaseId);
                } else {
                    // ✅ FIX: Add  to get date string
                    const pendingRejectsKey = `pendingRejects_${new Date().toISOString().split('T')[0]}`;
                    let pendingRejects = GM_getValue(pendingRejectsKey, {});
                    pendingRejects[targetCaseId] = 'Rejected case';
                    GM_setValue(pendingRejectsKey, pendingRejects);
                    console.log('📝 Stored pending reject status for:', targetCaseId);
                }
            } else {
                console.error('❌ Could not determine case ID for rejection');
            }
        }

        return originalXHROpen.apply(this, [method, url, ...rest]);
    };
}

// ✅ END OF NEW FUNCTION

    // PAA case

    // ✅ ADD THIS NEW FUNCTION HERE (after monitorRejectAPI, before monitorPAAAPI) -------- working
/*function updatePAAStatus(status) {
    const currentCaseId = getCaseIdFromUrl();

    if (!currentCaseId) {
        console.log('⚠️ No case ID found for PAA status update');
        return;
    }

    console.log('📋 Updating PAA status for case:', currentCaseId, 'Status:', status);

    // Update existing case details if case already exists
    let caseDetails = GM_getValue(caseDetailsKey, []);
    const caseIndex = caseDetails.findIndex(d => d.caseId === currentCaseId);

    if (caseIndex !== -1) {
        caseDetails[caseIndex].status = 'PAA';
        GM_setValue(caseDetailsKey, caseDetails);
        console.log('✅ Updated existing case with PAA status:', currentCaseId);
    } else {
        // Store as pending PAA status (will be applied when case is saved)
        const pendingPAAKey = `pendingPAA_${new Date().toISOString().split('T')[0]}`;
        let pendingPAA = GM_getValue(pendingPAAKey, {});
        pendingPAA[currentCaseId] = 'PAA';
        GM_setValue(pendingPAAKey, pendingPAA);
        console.log('📌 Stored pending PAA status for:', currentCaseId);
    }
} */

function updatePAAStatus(status) {
    const currentCaseId = getCaseIdFromUrl();

    if (!currentCaseId) {
        console.log('⚠️ No case ID found for PAA status update');
        return;
    }

    console.log('📋 Updating PAA status for case:', currentCaseId, 'Status:', status);

    const pendingPAAKey = `pendingPAA_${new Date().toISOString().split('T')[0]}`;
    let pendingPAA = GM_getValue(pendingPAAKey, {});

    // ✅ CRITICAL FIX: ALWAYS store in pending first (this ensures it's captured)
    pendingPAA[currentCaseId] = 'PAA';
    GM_setValue(pendingPAAKey, pendingPAA);
    console.log('📌 Stored pending PAA status for:', currentCaseId);

    // ✅ ALSO update existing case details immediately if case already exists
    let caseDetails = GM_getValue(caseDetailsKey, []);
    const caseIndex = caseDetails.findIndex(d => d.caseId === currentCaseId);

    if (caseIndex !== -1) {
        caseDetails[caseIndex].status = 'PAA';
        GM_setValue(caseDetailsKey, caseDetails);
        console.log('✅ Updated existing case with PAA status:', currentCaseId);
    }
}




    // Add this function after the monitorRejectAPI() function (around line 850)

function monitorPAAAPI() {
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const url = args;

        // Monitor PAA API calls
        if (typeof url === 'string' &&
            url.includes('prod-na.auditor-central.paragon.amazon.dev/#/audit-actions-widget')) {

            console.log('�� PAA API detected:', url);

            // Extract case ID from URL or use current case
            const urlCaseIdMatch = url.match(/caseId=(\d+)/);
            const urlCaseId = urlCaseIdMatch ? urlCaseIdMatch : null;
            const targetCaseId = urlCaseId || getCaseIdFromUrl() || lastCaseId;

            console.log('�� Target case ID for PAA:', targetCaseId);

            if (targetCaseId) {
                let caseDetails = GM_getValue(caseDetailsKey, []);
                const caseIndex = caseDetails.findIndex(d => d.caseId === targetCaseId);

                if (caseIndex !== -1) {
                    caseDetails[caseIndex].status = 'PAA';
                    GM_setValue(caseDetailsKey, caseDetails);
                    console.log('✅ Updated existing case status to "PAA" for:', targetCaseId);
                } else {
                    // Store pending PAA status
                    const pendingPAAKey = `pendingPAA_${new Date().toISOString().split('T')[0]}`;
                    let pendingPAA = GM_getValue(pendingPAAKey, {});
                    pendingPAA[targetCaseId] = 'PAA';
                    GM_setValue(pendingPAAKey, pendingPAA);
                    console.log('�� Stored pending PAA status for:', targetCaseId);
                }
            } else {
                console.error('❌ Could not determine case ID for PAA');
            }
        }

        return originalFetch.apply(this, args);
    };

    // Also monitor XMLHttpRequest for PAA API
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        if (typeof url === 'string' &&
            url.includes('prod-na.auditor-central.paragon.amazon.dev/#/audit-actions-widget')) {

            console.log('�� PAA API detected (XHR):', url);

            const urlCaseIdMatch = url.match(/caseId=(\d+)/);
            const urlCaseId = urlCaseIdMatch ? urlCaseIdMatch : null;
            const targetCaseId = urlCaseId || getCaseIdFromUrl() || lastCaseId;

            console.log('�� Target case ID for PAA:', targetCaseId);

            if (targetCaseId) {
                let caseDetails = GM_getValue(caseDetailsKey, []);
                const caseIndex = caseDetails.findIndex(d => d.caseId === targetCaseId);

                if (caseIndex !== -1) {
                    caseDetails[caseIndex].status = 'PAA';
                    GM_setValue(caseDetailsKey, caseDetails);
                    console.log('✅ Updated existing case status to "PAA" for:', targetCaseId);
                } else {
                    const pendingPAAKey = `pendingPAA_${new Date().toISOString().split('T')[0]}`;
                    let pendingPAA = GM_getValue(pendingPAAKey, {});
                    pendingPAA[targetCaseId] = 'PAA';
                    GM_setValue(pendingPAAKey, pendingPAA);
                    console.log('�� Stored pending PAA status for:', targetCaseId);
                }
            } else {
                console.error('❌ Could not determine case ID for PAA');
            }
        }

        return originalXHROpen.apply(this, [method, url, ...rest]);
    };
}

    // END of function PAA



/*   function incrementCounter() {
        console.log('🔍 incrementCounter called - Current count:', GM_getValue(storageKey, 0));

        const currentCaseId = getCaseIdFromUrl();
        startTimerSync();

        caseCount = GM_getValue(storageKey, 0);
        marketplaceCounts = GM_getValue(marketplaceKey, {});
        caseCountDisplay.textContent = `Cases: ${caseCount}`;
        updateMarketplaceDisplay();
        updateACHT();

        if (!isValidForCaseCounting()) {
            console.log('⚠️ Not a valid case for counting - skipping increment');
            return;
        }

        if (String(currentCaseId) !== String(lastCaseId)) {
            const now = Date.now();

            if (lastCaseId && lastCaseId !== '' && caseStartTime) {
                const timeSpent = Math.floor((now - caseStartTime) / 1000);

                let caseDetails = GM_getValue(caseDetailsKey, []);
                const previousMarketplace = window.location.href.includes('paragon-eu') ? 'EU' :
                                          window.location.href.includes('paragon-na') ? 'NA' :
                                          window.location.href.includes('paragon-fe') ? 'FE' : 'Unknown';

                caseDetails.push({
                    caseId: lastCaseId,
                    marketplace: previousMarketplace,
                    startTime: new Date(caseStartTime).toISOString(),
                    endTime: new Date(now).toISOString(),
                    timeSpent: timeSpent
                });
                GM_setValue(caseDetailsKey, caseDetails);
                console.log('💾 Case completed:', lastCaseId, 'Duration:', formatTime(timeSpent));
            }

            caseStartTime = now;
            GM_setValue(caseStartTimeKey, caseStartTime);

            lastCaseId = String(currentCaseId);
            GM_setValue(lastCaseKey, String(currentCaseId));

            const marketplace = window.location.href.includes('paragon-eu') ? 'EU' :
                              window.location.href.includes('paragon-na') ? 'NA' :
                              window.location.href.includes('paragon-fe') ? 'FE' : 'Unknown';

            caseCount++;
            marketplaceCounts[marketplace] = (marketplaceCounts[marketplace] || 0) + 1;

            GM_setValue(storageKey, caseCount);
            GM_setValue(marketplaceKey, marketplaceCounts);

            caseCountDisplay.textContent = `Cases: ${caseCount}`;
            updateMarketplaceDisplay();

            console.log('✅ New case started:', currentCaseId, 'Marketplace:', marketplace, 'Total:', caseCount);
        }
    } */

    exportButton.addEventListener('click', () => { exportToCSV(); });

    resetButton.addEventListener('click', () => {
        if (!confirm('⚠️ Are you sure you want to reset all counters and timers? This will reset: - Case count - Total available time - Average ACHT - All marketplace counts - All case details')) {
            return;
        }

        console.log('🔄 MANUAL RESET TRIGGERED');

        caseCount = 0;
        marketplaceCounts = {};
        lastCaseId = '';
        achtAlertCount = 0;
        lastAlertMinute = -1;
        wasOnBreak = false;
        wasOffline = false;
        storedBeforeBreak = 0;
        caseStartTime = null;

        GM_setValue(storageKey, 0);
        GM_setValue(marketplaceKey, {});
        GM_setValue(lastCaseKey, '');
        GM_setValue(totalTimeKey, 0);
        GM_setValue(caseTimeKey, 0);
        GM_setValue(wasOnBreakKey, false);
        GM_setValue(wasOfflineKey, false);
        GM_setValue(storedBeforeBreakKey, 0);
        GM_setValue(breakStartTimeKey, 0);
        GM_setValue(initializedKey, false);
        GM_setValue(globalAuxStatusKey, { onBreak: false, offline: false });
        GM_setValue(caseDetailsKey, []);
         recalculateMarketplaceCounts();
        GM_setValue(caseStartTimeKey, null);

        caseCountDisplay.textContent = `Cases: ${caseCount}`;
        updateMarketplaceDisplay();
        timerDisplay.textContent = 'Time in this case: 00:00:00';
        totalTimeDisplay.textContent = `Total avail time: 00:00:00`;
        updateACHT();

        if (syncInterval) clearInterval(syncInterval);
        startTimerSync();

        console.log('✅ Manual reset completed');
    });

    minimizeButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMinimize();
    });

    let isDragging = false;
    let currentX, currentY, initialX, initialY;

    header.addEventListener('mousedown', (e) => {
        if (e.target !== minimizeButton) {
            isDragging = true;
            initialX = e.clientX - container.offsetLeft;
            initialY = e.clientY - container.offsetTop;
            container.style.cursor = 'grabbing';
        }
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            e.preventDefault();
            currentX = e.clientX - initialX;
            currentY = e.clientY - initialY;
            currentX = Math.max(0, Math.min(currentX, window.innerWidth - container.offsetWidth));
            currentY = Math.max(0, Math.min(currentY, window.innerHeight - container.offsetHeight));
            container.style.left = `${currentX}px`;
            container.style.top = `${currentY}px`;
            container.style.right = 'auto';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        container.style.cursor = 'grab';
    });

    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

          @keyframes glow {
       0%, 100% {
            box-shadow: 0 0 20px rgba(255, 165, 0, 0.6), 0 0 40px rgba(255, 165, 0, 0.3);
        }
        50% {
            box-shadow: 0 0 30px rgba(255, 165, 0, 1), 0 0 60px rgba(255, 165, 0, 0.5);
        }
    }

    @keyframes bell-ring {
        0%, 100% { transform: rotate(0deg); }
        10%, 30% { transform: rotate(-15deg); }
        20%, 40% { transform: rotate(15deg); }
        50% { transform: rotate(0deg); }
    }
    .bell-ring {
        display: inline-block;
        animation: bell-ring 1s ease-in-out infinite;
    }
    `;

    document.head.appendChild(style);

    buttonContainer.appendChild(exportButton);
    buttonContainer.appendChild(resetButton);

    contentContainer.append(
        breakIndicator,
        offlineIndicator,
        marketplaceDisplay,
        caseCountDisplay,
        timerDisplay,
        totalTimeDisplay,
        achtDisplay,
        buttonContainer
    );

    container.appendChild(header);
    container.appendChild(contentContainer);
    document.body.appendChild(container);

    const storedTotalTime = GM_getValue(totalTimeKey, 0);
    const storedCaseTime = GM_getValue(caseTimeKey, 0);
    totalTimeDisplay.textContent = `Total avail time: ${formatTime(storedTotalTime)}`;
    timerDisplay.textContent = `Time in this case: ${formatTime(storedCaseTime)}`;
    updateMarketplaceDisplay();
    updateACHT();

    applyMinimizeState(isMinimized);
    updateWindowVisibility();

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            updateWindowVisibility();
            updateBreakStatus();
            incrementCounter();
        }
    }).observe(document, {subtree: true, childList: true});

    updateBreakStatus();
    incrementCounter();

    setInterval(updateBreakStatus, 2000);
    setInterval(updateWindowVisibility, 1000);
    setInterval(syncMinimizeState, 500);

     // ✅ ADD THIS LINE HERE - Initialize API monitoring
    monitorRejectAPI();

    console.log('✅ ACHT Buddy v8.4 initialized - Fixed break logic and invalid date issue');


// Add this line after monitorRejectAPI();
monitorPAAAPI();

    startTimerSync();   // ← ADD THIS LINE

console.log('✅ ACHT Buddy v8.5 initialized - Added PAA status tracking');


})();
