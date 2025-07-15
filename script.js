console.log('Chill Timer script loaded.');

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
        startBreak();
      } else {
        document.getElementById('break-time').textContent = breakTime;
        setButtonText('Resume');
        setBreakActive(false);
        startSession();
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

function startSession() {
  isSession = true;
  setButtonText('Break');
  setBreakActive(false);
  setTimerSlides('session');
  startTimer(parseTime(initialTime), 'session-time', startBreak, 'session');
  scheduleHideButton();
}

function startBreak() {
  isSession = false;
  setButtonText('Resume');
  setBreakActive(true);
  setTimerSlides('break');
  startTimer(parseTime(breakTime), 'break-time', startSession, 'break');
  // Do not show the button or hide the glow here; let the state persist
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('session-time').textContent = initialTime;
  document.getElementById('break-time').textContent = breakTime;
  setButtonText('Start');
  setBreakActive(false);
  setTimerSlides('session');
  document.getElementById('initialize-btn').addEventListener('click', () => {
    if (!running) {
      running = true;
      if (currentType === 'break') {
        startBreak();
      } else {
        startSession();
      }
    }
  });
  setupButtonGlowEvents();
  document.getElementById('button-glow').classList.remove('visible');
});
