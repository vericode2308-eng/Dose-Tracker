/**
 * DoseTracker Landing Page Interactions
 * Features:
 * - Light/Dark Theme Switcher with system & localStorage sync
 * - Interactive Today Dose Simulator with dynamic SVG progress ring & audio
 * - Showcase Screen Switcher for 8 key app views
 * - Audio Chime Player Studio with waveform animation
 * - Profile Switcher with context-dependent dose schedules
 * - Accessible FAQ Accordion
 * - Confetti celebration particle burst
 */

document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------------------------------------
  // 1. THEME TOGGLE (LIGHT / DARK)
  // ------------------------------------------------------------------------
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const body = document.body;

  // Check saved theme or system preference
  const savedTheme = localStorage.getItem('dosetracker-theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme) {
    body.setAttribute('data-theme', savedTheme);
  } else if (systemPrefersDark) {
    body.setAttribute('data-theme', 'dark');
  } else {
    body.setAttribute('data-theme', 'light');
  }

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('dosetracker-theme', newTheme);
  });

  // ------------------------------------------------------------------------
  // 2. MOBILE NAVIGATION MENU
  // ------------------------------------------------------------------------
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const navLinks = document.getElementById('nav-links');

  if (mobileToggle && navLinks) {
    mobileToggle.addEventListener('click', () => {
      navLinks.classList.toggle('mobile-open');
    });

    // Close mobile nav when clicking a link
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('mobile-open');
      });
    });
  }

  // ------------------------------------------------------------------------
  // 3. SOUND CHIMES STUDIO & AUDIO PLAYERS
  // ------------------------------------------------------------------------
  const audioGentle = document.getElementById('audio-gentle');
  const audioClear = document.getElementById('audio-clear');
  const playGentleBtn = document.getElementById('play-gentle-btn');
  const playClearBtn = document.getElementById('play-clear-btn');
  const waveGentle = document.getElementById('wave-gentle');
  const waveClear = document.getElementById('wave-clear');

  function stopAllAudio() {
    if (audioGentle) {
      audioGentle.pause();
      audioGentle.currentTime = 0;
      playGentleBtn?.classList.remove('playing');
      waveGentle?.classList.remove('active');
      if (playGentleBtn) playGentleBtn.querySelector('.btn-text').textContent = 'Listen to Gentle';
    }
    if (audioClear) {
      audioClear.pause();
      audioClear.currentTime = 0;
      playClearBtn?.classList.remove('playing');
      waveClear?.classList.remove('active');
      if (playClearBtn) playClearBtn.querySelector('.btn-text').textContent = 'Listen to Clear';
    }
  }

  function setupAudioPlayer(button, audio, waveform, label) {
    if (!button || !audio) return;

    button.addEventListener('click', () => {
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        button.classList.remove('playing');
        waveform?.classList.remove('active');
        button.querySelector('.btn-text').textContent = `Listen to ${label}`;
      } else {
        stopAllAudio();
        audio.play().then(() => {
          button.classList.add('playing');
          waveform?.classList.add('active');
          button.querySelector('.btn-text').textContent = 'Playing...';
        }).catch(err => {
          console.warn('Audio playback error:', err);
        });
      }
    });

    audio.addEventListener('ended', () => {
      button.classList.remove('playing');
      waveform?.classList.remove('active');
      button.querySelector('.btn-text').textContent = `Listen to ${label}`;
    });
  }

  setupAudioPlayer(playGentleBtn, audioGentle, waveGentle, 'Gentle');
  setupAudioPlayer(playClearBtn, audioClear, waveClear, 'Clear');

  // Simulator quick chime play button
  const simQuickChimeBtn = document.getElementById('sim-quick-chime-btn');
  if (simQuickChimeBtn && audioClear) {
    simQuickChimeBtn.addEventListener('click', () => {
      audioClear.currentTime = 0;
      audioClear.play().catch(e => console.warn(e));
      showToast('🔔 Played Clear Chime notification preview');
    });
  }

  // ------------------------------------------------------------------------
  // 4. INTERACTIVE DOSE SIMULATOR
  // ------------------------------------------------------------------------
  const ringIndicator = document.getElementById('sim-ring-indicator');
  const ringText = document.getElementById('sim-ring-text');
  const summaryTitle = document.getElementById('sim-summary-title');
  const summarySub = document.getElementById('sim-summary-sub');
  const btnTakeDose2 = document.getElementById('btn-take-dose-2');
  const btnSnoozeDose2 = document.getElementById('btn-snooze-dose-2');
  const doseCard2 = document.getElementById('dose-card-2');
  const dose2Actions = document.getElementById('dose-2-actions');
  const dose2TakenPill = document.getElementById('dose-2-taken-pill');
  const simResetBtn = document.getElementById('sim-reset-btn');
  const toastEl = document.getElementById('sim-toast');
  const toastMsg = document.getElementById('sim-toast-msg');

  const FULL_CIRCUMFERENCE = 263.89; // 2 * PI * 42

  function updateProgressRing(percent) {
    if (!ringIndicator || !ringText) return;
    const offset = FULL_CIRCUMFERENCE - (percent / 100) * FULL_CIRCUMFERENCE;
    ringIndicator.style.strokeDashoffset = offset;
    ringText.textContent = `${percent}%`;
  }

  function showToast(message) {
    if (!toastEl || !toastMsg) return;
    toastMsg.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3200);
  }

  // Initial State: 3 of 4 taken (75%)
  let isDose2Taken = false;

  if (btnTakeDose2) {
    btnTakeDose2.addEventListener('click', () => {
      isDose2Taken = true;
      doseCard2?.classList.remove('pulse-border', 'due-now');
      doseCard2?.classList.add('taken');
      dose2Actions?.classList.add('hidden');
      dose2TakenPill?.classList.remove('hidden');

      // Update progress to 100%
      updateProgressRing(100);
      if (summaryTitle) summaryTitle.textContent = "All Doses Complete for Today! 🎉";
      if (summarySub) summarySub.textContent = "Outstanding consistency! 4 of 4 scheduled doses completed.";

      // Play chime
      if (audioGentle) {
        audioGentle.currentTime = 0;
        audioGentle.play().catch(e => console.warn(e));
      }

      showToast("✨ Metformin 500mg recorded! SQLite updated & stock decremented.");
      launchConfetti();
    });
  }

  if (btnSnoozeDose2) {
    btnSnoozeDose2.addEventListener('click', () => {
      showToast("⏰ Snooze set for 10 minutes. Exact alarm re-armed.");
      if (audioClear) {
        audioClear.currentTime = 0;
        audioClear.play().catch(e => console.warn(e));
      }
    });
  }

  if (simResetBtn) {
    simResetBtn.addEventListener('click', () => {
      isDose2Taken = false;
      doseCard2?.classList.remove('taken');
      doseCard2?.classList.add('pulse-border', 'due-now');
      dose2Actions?.classList.remove('hidden');
      dose2TakenPill?.classList.add('hidden');

      updateProgressRing(75);
      if (summaryTitle) summaryTitle.textContent = "Today's Schedule: 3 of 4 Doses Taken";
      if (summarySub) summarySub.textContent = "Great job! You only have 1 dose remaining for today.";

      showToast("🔄 Simulator reset to default state.");
    });
  }

  // Profile Switcher in Simulator
  const profilePills = document.querySelectorAll('.profile-pill');
  profilePills.forEach(pill => {
    pill.addEventListener('click', () => {
      profilePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const profile = pill.getAttribute('data-profile');
      if (profile === 'dad') {
        showToast("Switched to Dad's profile: 1 Overdue blood pressure medication.");
        updateProgressRing(50);
        if (summaryTitle) summaryTitle.textContent = "Dad's Schedule: 1 of 2 Doses Taken";
        if (summarySub) summarySub.textContent = "⚠️ Lisinopril 20mg morning dose is currently overdue.";
      } else if (profile === 'oliver') {
        showToast("Switched to Oliver's profile: Pediatric vitamins & inhaler.");
        updateProgressRing(100);
        if (summaryTitle) summaryTitle.textContent = "Oliver's Schedule: 2 of 2 Doses Taken";
        if (summarySub) summarySub.textContent = "All pediatric doses administered for today.";
      } else {
        showToast("Switched to Sarah (You): Daily active routine.");
        updateProgressRing(isDose2Taken ? 100 : 75);
        if (summaryTitle) {
          summaryTitle.textContent = isDose2Taken ? "All Doses Complete for Today! 🎉" : "Today's Schedule: 3 of 4 Doses Taken";
        }
      }
    });
  });

  // ------------------------------------------------------------------------
  // 5. APP SHOWCASE SCREEN SWITCHER (8 REAL DESIGN PREVIEWS)
  // ------------------------------------------------------------------------
  const showcaseData = {
    today: {
      img: './assets/design/01-today-dashboard-dose-schedule.png',
      badge: 'Primary Screen',
      title: 'Today Dashboard & Dose Schedule',
      desc: 'The central control room of your daily routine. Clean, card-based medicine blocks display dose timings, precise milligram strengths, food accompaniment instructions, and a responsive circular progress indicator.',
      highlights: [
        'Clear Status Distinction: Overdue, Due Now, Taken, and Upcoming doses each have distinct visual cues.',
        'Actionable Cards: Record a dose immediately or trigger a 5/10/15/30-minute smart snooze.',
        'Selected Profile Header: Always clearly shows which family member or pet schedule is active.'
      ],
      asset: '01-today-dashboard-dose-schedule.png'
    },
    meds: {
      img: './assets/design/02-medicines-list-active-filter.png',
      badge: 'Inventory Directory',
      title: 'Medicines List & Category Filters',
      desc: 'Browse your entire medicine cabinet at a glance. Filter quickly between Active, As-Needed, and Archived treatments with instant fuzzy search.',
      highlights: [
        'Instant Filter Tabs: All, Active Courses, As-Needed (PRN), and Archived.',
        'Stock Health Indicators: Pill tags alert you immediately when supply falls below minimum refill levels.',
        'Dose Frequency Badges: Clear labels for "Once Daily", "Twice Daily", or "As Needed".'
      ],
      asset: '02-medicines-list-active-filter.png'
    },
    stock: {
      img: './assets/design/03-medicine-details-low-stock.png',
      badge: 'Safety & Refills',
      title: 'Medicine Details & Low Stock Warnings',
      desc: 'Comprehensive profile for every prescription. Inspect strength, formulation, prescribing instructions, scheduled alarm times, and active stock counts.',
      highlights: [
        'Inventory Depletion Meter: Real-time visual progress of remaining tablets with projected run-out dates.',
        'One-Tap Stock Replenishment: Easily top up pill counts after picking up a pharmacy refill.',
        'Discreet Notes & Warnings: Stores food requirements, side effect notes, and personal physician advice.'
      ],
      asset: '03-medicine-details-low-stock.png'
    },
    history: {
      img: './assets/design/04-history-calendar-and-dose-records.png',
      badge: 'Audit & Adherence',
      title: 'Adherence Calendar & Audit Logbook',
      desc: 'Review adherence consistency across months with color-coded dot heatmaps. A detailed chronological log preserves exact millisecond timestamps of every dose taken or skipped.',
      highlights: [
        'Adherence Heatmap Calendar: Visual monthly view showing 100% adherence, partial days, and skips.',
        'Accurate Timestamp Audit: Verified historical records to share with your cardiologist or doctor.',
        'Full JSON Export: Seamlessly export all adherence logs to your device files at any time.'
      ],
      asset: '04-history-calendar-and-dose-records.png'
    },
    wizard: {
      img: './assets/design/08-add-medicine-step-4-review.png',
      badge: 'Seamless Setup',
      title: '4-Step Add Medicine Wizard',
      desc: 'Adding a complex medication routine takes less than 30 seconds. A structured 4-step wizard guides you through Details, Schedule, Stock tracking, and Review.',
      highlights: [
        'Step 1 Formulation: Select tablets, capsules, liquid, drops, inhalers, or injections with color tags.',
        'Step 2 Recurrence: Configure daily, specific days of the week, or interval alarms with exact times.',
        'Step 3 & 4 Stock & Verification: Review full instructions before committing to SQLite.'
      ],
      asset: '08-add-medicine-step-4-review.png'
    },
    reminders: {
      img: './assets/design/09-notification-reminder-and-confirm-dose.png',
      badge: 'Native Alarms',
      title: 'Actionable Heads-Up Reminders',
      desc: 'Dependable Android notifications that deliver exact alerts even when the device is locked or in battery-saving sleep mode.',
      highlights: [
        'Direct Action Controls: Take dose directly or snooze for 10 minutes without unlocking.',
        'Privacy Redaction: Mode options hide sensitive drug names from bystanders seeing your screen.',
        'Custom Sound Assignment: Choose between gentle harmony or crisp chime tones.'
      ],
      asset: '09-notification-reminder-and-confirm-dose.png'
    },
    profiles: {
      img: './assets/design/people and profile.png',
      badge: 'Caregiver Hub',
      title: 'Multi-Profile Family Care',
      desc: 'One app to care for everyone. Easily create separate profile cards for family members, elderly parents, or pets with custom avatar colors and photos.',
      highlights: [
        'Zero Data Bleed: Each profile keeps completely isolated prescriptions, schedules, and history.',
        'Overdue Notifications: The profile switcher displays urgent dose count badges for all profiles.',
        'Archive or Delete: Easily archive completed temporary courses while preserving logs.'
      ],
      asset: 'people and profile.png'
    },
    settings: {
      img: './assets/design/Settings.png',
      badge: 'Security & Control',
      title: 'Privacy, Biometrics & Alarm Health',
      desc: 'Granular control over your device security. Configure hardware fingerprint / Face ID app lock, inspect exact alarm permissions, and preview notification chimes.',
      highlights: [
        'Hardware Biometric Lock: Built using expo-local-authentication and secure hardware keystore.',
        'Notification Privacy Levels: Choose Public, Private, or Secret channel visibility.',
        'Exact Alarm Diagnostics: Real-time system health checks verify Android battery permissions.'
      ],
      asset: 'Settings.png'
    }
  };

  const showcaseTabs = document.querySelectorAll('.showcase-tab');
  const showcaseScreenImg = document.getElementById('showcase-screen-img');
  const showcaseBadge = document.getElementById('showcase-badge');
  const showcaseTitle = document.getElementById('showcase-title');
  const showcaseDesc = document.getElementById('showcase-desc');
  const showcaseHighlights = document.getElementById('showcase-highlights');

  showcaseTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      showcaseTabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');

      const tabKey = tab.getAttribute('data-tab');
      const data = showcaseData[tabKey];
      if (!data) return;

      // Animate update
      if (showcaseScreenImg) {
        showcaseScreenImg.style.opacity = '0.3';
        showcaseScreenImg.src = data.img;
        showcaseScreenImg.onload = () => {
          showcaseScreenImg.style.opacity = '1';
        };
      }

      if (showcaseBadge) showcaseBadge.textContent = data.badge;
      if (showcaseTitle) showcaseTitle.textContent = data.title;
      if (showcaseDesc) showcaseDesc.textContent = data.desc;

      if (showcaseHighlights) {
        showcaseHighlights.innerHTML = data.highlights.map(item => {
          const parts = item.split(':');
          if (parts.length > 1) {
            return `
              <div class="highlight-item">
                <div class="check-icon">✓</div>
                <div><strong>${parts[0]}:</strong> ${parts.slice(1).join(':')}</div>
              </div>
            `;
          }
          return `
            <div class="highlight-item">
              <div class="check-icon">✓</div>
              <div>${item}</div>
            </div>
          `;
        }).join('');
      }
    });
  });

  // ------------------------------------------------------------------------
  // 6. ACCORDION FAQ
  // ------------------------------------------------------------------------
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question-btn');
    questionBtn?.addEventListener('click', () => {
      const isActive = item.classList.contains('active');
      
      // Close all others
      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
        otherItem.querySelector('.faq-question-btn')?.setAttribute('aria-expanded', 'false');
      });

      if (!isActive) {
        item.classList.add('active');
        questionBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ------------------------------------------------------------------------
  // 7. CONFETTI BURST CELEBRATION
  // ------------------------------------------------------------------------
  function launchConfetti() {
    const colors = ['#22C55E', '#14B8A6', '#0B2540', '#F59E0B', '#8B5CF6'];
    const count = 40;

    for (let i = 0; i < count; i++) {
      const particle = document.createElement('div');
      particle.className = 'confetti-particle';
      particle.style.cssText = `
        position: fixed;
        width: ${Math.random() * 8 + 6}px;
        height: ${Math.random() * 8 + 6}px;
        background-color: ${colors[Math.floor(Math.random() * colors.length)]};
        border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
        top: 50%;
        left: 50%;
        z-index: 10000;
        pointer-events: none;
        transform: translate(-50%, -50%);
        transition: transform 1.2s cubic-bezier(0.1, 1, 0.1, 1), opacity 1.2s ease;
      `;
      document.body.appendChild(particle);

      const angle = Math.random() * 2 * Math.PI;
      const velocity = Math.random() * 280 + 120;
      const x = Math.cos(angle) * velocity;
      const y = Math.sin(angle) * velocity - 100;
      const rotation = Math.random() * 720;

      requestAnimationFrame(() => {
        particle.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) rotate(${rotation}deg)`;
        particle.style.opacity = '0';
      });

      setTimeout(() => {
        particle.remove();
      }, 1300);
    }
  }

});
