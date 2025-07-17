function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  let session = params.get('session');
  let brk = params.get('break');
  // Validate: must be integer 1-60
  if (!/^\d{1,2}$/.test(session || '') || +session < 1 || +session > 60)
    session = null;
  if (!/^\d{1,2}$/.test(brk || '') || +brk < 1 || +brk > 60) brk = null;
  return {
    session: session || null,
    break: brk || null,
  };
}

function setUrlParams(session, brk, forceDefaults = false) {
  let newUrl;
  if (forceDefaults) {
    newUrl = `${window.location.pathname}?session=25&break=5`;
  } else {
    const params = new URLSearchParams(window.location.search);
    if (session === '25') {
      params.delete('session');
    } else {
      params.set('session', session);
    }
    if (brk === '5') {
      params.delete('break');
    } else {
      params.set('break', brk);
    }
    const newParams = params.toString();
    newUrl = newParams
      ? `${window.location.pathname}?${newParams}`
      : window.location.pathname;
  }
  window.history.replaceState({}, '', newUrl);
}

let initialTime, breakTime;

(function initTimesFromUrl() {
  let params = getUrlParams();
  let sessionMin = params.session || '25';
  let breakMin = params.break || '5';
  // If params were missing or invalid, reset the URL to defaults
  if (!params.session || !params.break) {
    sessionMin = '25';
    breakMin = '5';
    setUrlParams(sessionMin, breakMin, true);
  }
  initialTime = `${sessionMin.padStart(2, '0')}:00`;
  breakTime = `${breakMin.padStart(2, '0')}:00`;
})();

let isSession = true;
let intervalId = null;
let running = false;
let paused = false;
let currentSeconds = 0;
let currentType = 'session'; // 'session' or 'break'
let hideBtnTimeout = null;
let hideBtnDelayTimeout = null;

function parseTime(str) {
  const [min, sec] = str.split(':').map(Number);
  return min * 60 + sec;
}

function formatTime(totalSeconds) {
  const min = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const sec = String(totalSeconds % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function setButtonText(text) {
  const btn = document.getElementById('initialize-btn');
  btn.classList.add('fade');
  setTimeout(() => {
    btn.textContent = text;
    btn.classList.remove('fade');
  }, 250);
}

function setBreakActive(active) {
  const btn = document.getElementById('initialize-btn');
  if (active) {
    btn.classList.add('break-active');
  } else {
    btn.classList.remove('break-active');
  }
}

function setTimerSlides(active) {
  const session = document.getElementById('session-time');
  const brk = document.getElementById('break-time');
  if (active === 'session') {
    session.classList.add('slide-in');
    session.classList.remove('slide-out');
    brk.classList.add('slide-out');
    brk.classList.remove('slide-in');
  } else {
    brk.classList.add('slide-in');
    brk.classList.remove('slide-out');
    session.classList.add('slide-out');
    session.classList.remove('slide-in');
  }
}

function startTimer(duration, displayId, next, type) {
  clearInterval(intervalId); // Always clear any previous timer
  running = true; // Set running here
  currentSeconds = duration;
  currentType = type;
  setTimerSlides(type);
  updateDisplays();
  intervalId = setInterval(() => {
    currentSeconds--;
    updateDisplays();
    if (currentSeconds <= 0) {
      clearInterval(intervalId);
      running = false;
      // Reset the finished timer to its original value
      if (type === 'session') {
        document.getElementById('session-time').textContent = initialTime;
        setButtonText('Break');
        setBreakActive(true);
        // Automatically start break after a short delay
        setTimeout(() => {
          startBreak();
        }, 1000); // 1s delay for UX
      } else {
        document.getElementById('break-time').textContent = breakTime;
        setButtonText('Resume');
        setBreakActive(false);
        // Automatically start session after a short delay
        setTimeout(() => {
          startSession();
        }, 1000); // 1s delay for UX
      }
    }
  }, 1000);
}

function updateDisplays() {
  if (currentType === 'session') {
    document.getElementById('session-time').textContent =
      formatTime(currentSeconds);
  } else {
    document.getElementById('break-time').textContent =
      formatTime(currentSeconds);
  }
}

function showButtonAndHideGlow() {
  const btn = document.getElementById('initialize-btn');
  const glow = document.getElementById('button-glow');
  btn.classList.remove('hide-btn');
  glow.classList.remove('visible');
  // Only schedule auto-hide in session mode
  if (running && currentType === 'session') {
    scheduleHideButton();
  }
}

function hideButtonAndShowGlow() {
  const btn = document.getElementById('initialize-btn');
  const glow = document.getElementById('button-glow');
  // Only show glow and hide button if session is running and active
  if (running && currentType === 'session') {
    glow.classList.remove('visible');
    btn.classList.add('hide-btn');
    setTimeout(() => {
      if (
        btn.classList.contains('hide-btn') &&
        running &&
        currentType === 'session'
      ) {
        glow.classList.add('visible');
      }
    }, 2500);
  } else {
    glow.classList.remove('visible');
    btn.classList.remove('hide-btn');
  }
}

function scheduleHideButton() {
  clearTimeout(hideBtnTimeout);
  hideBtnTimeout = setTimeout(() => {
    if (running && currentType === 'session') {
      hideButtonAndShowGlow();
    }
  }, 5000);
}

function setupButtonGlowEvents() {
  const btn = document.getElementById('initialize-btn');
  const glow = document.getElementById('button-glow');
  // Show button only after glow fades out on click
  glow.addEventListener('click', () => {
    glow.classList.remove('visible');
    setTimeout(() => {
      showButtonAndHideGlow();
      // After showing the button, auto-hide again after 5s if still in session
      if (running && currentType === 'session') {
        scheduleHideButton();
      }
    }, 1500); // match the glow fade out duration
  });
  btn.addEventListener('mouseenter', () => {
    clearTimeout(hideBtnDelayTimeout);
  });
  // Hide button after short delay when mouse leaves
  btn.addEventListener('mouseleave', () => {
    if (running && currentType === 'session') {
      hideBtnDelayTimeout = setTimeout(() => {
        hideButtonAndShowGlow();
      }, 1200);
    }
  });
}

// Add audio objects for sound effects
const startAudio = new Audio('start.ogg');
const breakAudio = new Audio('break.ogg');

// --- Sound Toggle Logic ---
const soundToggleBtn = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');

const VOLUME_ICON = `<svg id="sound-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume2-icon lucide-volume-2"><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6"/><path d="M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>`;
const MUTE_ICON = `<svg id="sound-icon" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-volume-off-icon lucide-volume-off"><path d="M16 9a5 5 0 0 1 .95 2.293"/><path d="M19.364 5.636a9 9 0 0 1 1.889 9.96"/><path d="m2 2 20 20"/><path d="m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11"/><path d="M9.828 4.172A.686.686 0 0 1 11 4.657v.686"/></svg>`;

function setMuted(muted) {
  startAudio.muted = muted;
  breakAudio.muted = muted;
  if (muted) {
    soundToggleBtn.innerHTML = MUTE_ICON;
  } else {
    soundToggleBtn.innerHTML = VOLUME_ICON;
  }
  localStorage.setItem('chill_timer_muted', muted ? '1' : '0');
}

function getMuted() {
  return localStorage.getItem('chill_timer_muted') === '1';
}

// Initialize state
setMuted(getMuted());

soundToggleBtn.addEventListener('click', () => {
  setMuted(!getMuted());
});
// --- End Sound Toggle Logic ---

function startSession() {
  startAudio.currentTime = 0; // rewind to start
  startAudio.play();
  isSession = true;
  setButtonText('Break');
  setBreakActive(false);
  setTimerSlides('session');
  document.getElementById('break-time').textContent = breakTime; // Reset break timer when session starts
  document.getElementById('session-time').textContent = initialTime; // Reset display
  startTimer(parseTime(initialTime), 'session-time', startBreak, 'session');
  scheduleHideButton();
}

function startBreak() {
  breakAudio.currentTime = 0; // rewind to start
  breakAudio.play();
  isSession = false;
  setButtonText('Resume');
  setBreakActive(true);
  setTimerSlides('break');
  document.getElementById('session-time').textContent = initialTime; // Reset session timer when break starts
  document.getElementById('break-time').textContent = breakTime; // Reset display
  startTimer(parseTime(breakTime), 'break-time', startSession, 'break');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('session-time').textContent = initialTime;
  document.getElementById('break-time').textContent = breakTime;
  setButtonText('Start');
  setBreakActive(false);
  setTimerSlides('session');
  const btn = document.getElementById('initialize-btn');
  btn.addEventListener('click', () => {
    if (btn.textContent.trim() === 'Break') {
      if (running && currentType === 'session') {
        // Skip session, go to break
        clearInterval(intervalId);
        running = false;
        startBreak();
      } else if (!running) {
        startBreak();
      }
    } else if (btn.textContent.trim() === 'Resume') {
      // Always restart the session, even if timer is running
      clearInterval(intervalId);
      running = false;
      startSession();
    } else if (!running) {
      startSession();
    }
  });
  setupButtonGlowEvents();
  document.getElementById('button-glow').classList.remove('visible');
});
