/**
 * DoseTracker Landing Page Interactions
 * Features:
 * - Light/Dark Theme Switcher with system & localStorage sync
 * - Interactive Today Dose Simulator with dynamic SVG progress ring & audio
 * - Showcase Screen Switcher for 8 key app views (Consumer-Friendly)
 * - Audio Chime Player Studio with waveform animation
 * - Profile Switcher with context-dependent dose schedules
 * - Accessible FAQ Accordion
 * - Legal Modal Dialog (Privacy Policy & Terms of Service)
 * - Confetti celebration particle burst
 */

document.addEventListener('DOMContentLoaded', () => {

  // ------------------------------------------------------------------------
  // 1. THEME TOGGLE (LIGHT / DARK)
  // ------------------------------------------------------------------------
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  const body = document.body;

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
      if (playGentleBtn) playGentleBtn.querySelector('.btn-text').textContent = 'Listen to Gentle Chime';
    }
    if (audioClear) {
      audioClear.pause();
      audioClear.currentTime = 0;
      playClearBtn?.classList.remove('playing');
      waveClear?.classList.remove('active');
      if (playClearBtn) playClearBtn.querySelector('.btn-text').textContent = 'Listen to Clear Chime';
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
        button.querySelector('.btn-text').textContent = `Listen to ${label} Chime`;
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
      button.querySelector('.btn-text').textContent = `Listen to ${label} Chime`;
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

  let isDose2Taken = false;

  if (btnTakeDose2) {
    btnTakeDose2.addEventListener('click', () => {
      isDose2Taken = true;
      doseCard2?.classList.remove('pulse-border', 'due-now');
      doseCard2?.classList.add('taken');
      dose2Actions?.classList.add('hidden');
      dose2TakenPill?.classList.remove('hidden');

      updateProgressRing(100);
      if (summaryTitle) summaryTitle.textContent = "All Doses Complete for Today! 🎉";
      if (summarySub) summarySub.textContent = "Outstanding consistency! 4 of 4 scheduled doses completed.";

      if (audioGentle) {
        audioGentle.currentTime = 0;
        audioGentle.play().catch(e => console.warn(e));
      }

      showToast("✨ Metformin 500mg recorded! Supply updated on your device.");
      launchConfetti();
    });
  }

  if (btnSnoozeDose2) {
    btnSnoozeDose2.addEventListener('click', () => {
      showToast("⏰ Reminder snoozed for 10 minutes.");
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

      showToast("🔄 Demo reset to default morning view.");
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
        showToast("Switched to Dad's profile: 1 overdue morning medication.");
        updateProgressRing(50);
        if (summaryTitle) summaryTitle.textContent = "Dad's Schedule: 1 of 2 Doses Taken";
        if (summarySub) summarySub.textContent = "⚠️ Lisinopril 20mg morning dose is currently overdue.";
      } else if (profile === 'oliver') {
        showToast("Switched to Oliver's profile: Daily chewable vitamin & inhaler.");
        updateProgressRing(100);
        if (summaryTitle) summaryTitle.textContent = "Oliver's Schedule: 2 of 2 Doses Taken";
        if (summarySub) summarySub.textContent = "All doses completed for today.";
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
  // 5. APP SHOWCASE SCREEN SWITCHER (CONSUMER-FRIENDLY)
  // ------------------------------------------------------------------------
  const showcaseData = {
    today: {
      img: './assets/design/01-today-dashboard-dose-schedule.png',
      badge: 'Main Screen',
      title: 'Today Schedule & Daily Checklist',
      desc: 'Your daily routine laid out clearly. Each medication card shows exact dosage, instructions (such as with food or water), and quick one-tap buttons to confirm or snooze.',
      highlights: [
        'Clear Status Colors: See at a glance what is taken, due now, or coming up later.',
        'Quick Snooze: Busy or away from your pills? Snooze for 10 or 15 minutes with one touch.',
        'Always Know Who: The selected person name and photo remain clearly displayed.'
      ]
    },
    meds: {
      img: './assets/design/02-medicines-list-active-filter.png',
      badge: 'Medicine Cabinet',
      title: 'Complete Medicine Cabinet & Search',
      desc: 'Browse all your current medications in one clean list. Easily filter between daily medications, as-needed treatments, or past prescriptions.',
      highlights: [
        'Instant Filters: View active daily courses or as-needed pain relief with a tap.',
        'Pill Supply Warnings: Color tags warn you immediately when a bottle is running low.',
        'Clear Dosing Rules: Shows how often and how much to take for each medicine.'
      ]
    },
    stock: {
      img: './assets/design/03-medicine-details-low-stock.png',
      badge: 'Supply & Refills',
      title: 'Medicine Details & Refill Alerts',
      desc: 'Never get surprised by an empty prescription bottle. DoseTracker automatically updates your pill count and alerts you days in advance.',
      highlights: [
        'Remaining Supply Meter: Visual bar shows how many days of medication you have left.',
        'One-Tap Refill: Quickly top up your pill count whenever you pick up a new bottle.',
        'Food & Doctor Notes: Keep your doctor special instructions handy right in the app.'
      ]
    },
    history: {
      img: './assets/design/04-history-calendar-and-dose-records.png',
      badge: 'Progress & Logs',
      title: 'Monthly Calendar & Adherence History',
      desc: 'Track your daily consistency over time. Color-coded dots show which days were 100% completed, giving you confidence and clear records to share with your physician.',
      highlights: [
        'Monthly Overview: At-a-glance calendar shows green dots for perfect days.',
        'Exact Timestamps: Know precisely what time you took each medication.',
        'Share with Your Doctor: Bring your verified history to your next checkup.'
      ]
    },
    wizard: {
      img: './assets/design/08-add-medicine-step-4-review.png',
      badge: 'Quick Setup',
      title: 'Easy 4-Step Medication Assistant',
      desc: 'Adding a new medicine takes less than a minute. Simple questions guide you through dosage, timing, and pill counts without medical jargon.',
      highlights: [
        'Choose Pill Form: Select tablets, capsules, liquids, drops, or inhalers.',
        'Custom Schedules: Set reminders for specific times of day or days of the week.',
        'Instant Protection: Your alarms arm immediately with no complicated settings.'
      ]
    },
    reminders: {
      img: './assets/design/09-notification-reminder-and-confirm-dose.png',
      badge: 'On-Time Reminders',
      title: 'Heads-Up Reminders That Respect You',
      desc: 'Reminders appear reliably on your screen with quick buttons to confirm or snooze without having to search through your phone.',
      highlights: [
        'Confirm from Lock Screen: Mark a dose taken directly with a single tap.',
        'Privacy Protection: Choose to hide medication names so others cannot see your prescriptions.',
        'Calm Chimes: Gentle tones that alert you politely without loud jarring alarms.'
      ]
    },
    profiles: {
      img: './assets/design/people and profile.png',
      badge: 'Caregiver Hub',
      title: 'Caring for Parents, Kids & Pets',
      desc: 'One app to look after everyone you love. Easily add family members with their own picture and color, keeping their prescriptions neatly organized.',
      highlights: [
        'Completely Separate Records: Each family member has their own schedule and history.',
        'Urgent Overdue Alerts: The profile menu shows a badge if someone needs their medication.',
        'No Account Confusion: Switch between family members in one tap.'
      ]
    },
    settings: {
      img: './assets/design/Settings.png',
      badge: 'Security & Control',
      title: 'Fingerprint Lock & Privacy Settings',
      desc: 'Your personal health data stays securely on your phone. Turn on fingerprint lock, choose your favorite chime, and manage privacy settings easily.',
      highlights: [
        'Fingerprint & Face Lock: Require your phone biometric scan to open the app.',
        'Notification Privacy: Select whether medicine names show on your locked screen.',
        'Erase Anytime: You can wipe all records with one tap whenever you choose.'
      ]
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
  // 7. LEGAL & PRIVACY MODAL DIALOG
  // ------------------------------------------------------------------------
  const legalModal = document.getElementById('legal-modal');
  const legalModalClose = document.getElementById('legal-modal-close');
  const legalTabPrivacy = document.getElementById('legal-tab-privacy');
  const legalTabTerms = document.getElementById('legal-tab-terms');
  const legalContentPrivacy = document.getElementById('legal-content-privacy');
  const legalContentTerms = document.getElementById('legal-content-terms');
  const openPrivacyBtns = document.querySelectorAll('.open-privacy-modal, #footer-legal-btn');
  const openTermsBtns = document.querySelectorAll('.open-terms-modal');

  function openLegalModal(tabName) {
    if (!legalModal) return;
    legalModal.classList.remove('hidden');
    legalModal.setAttribute('aria-hidden', 'false');

    if (tabName === 'terms') {
      legalTabTerms?.classList.add('active');
      legalTabPrivacy?.classList.remove('active');
      legalContentTerms?.classList.add('active');
      legalContentPrivacy?.classList.remove('active');
    } else {
      legalTabPrivacy?.classList.add('active');
      legalTabTerms?.classList.remove('active');
      legalContentPrivacy?.classList.add('active');
      legalContentTerms?.classList.remove('active');
    }
  }

  function closeLegalModal() {
    if (!legalModal) return;
    legalModal.classList.add('hidden');
    legalModal.setAttribute('aria-hidden', 'true');
  }

  openPrivacyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openLegalModal('privacy');
    });
  });

  openTermsBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openLegalModal('terms');
    });
  });

  legalModalClose?.addEventListener('click', closeLegalModal);

  legalTabPrivacy?.addEventListener('click', () => openLegalModal('privacy'));
  legalTabTerms?.addEventListener('click', () => openLegalModal('terms'));

  // Close modal when clicking backdrop
  legalModal?.addEventListener('click', (e) => {
    if (e.target === legalModal) {
      closeLegalModal();
    }
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && legalModal && !legalModal.classList.contains('hidden')) {
      closeLegalModal();
    }
  });

  // ------------------------------------------------------------------------
  // 8. CONFETTI BURST CELEBRATION
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

  // ------------------------------------------------------------------------
  // 9. SUPPORT CONTACT FORM HANDLER
  // ------------------------------------------------------------------------
  const supportForm = document.getElementById('support-contact-form');
  const contactSuccessBox = document.getElementById('contact-success-box');
  const btnSendAnother = document.getElementById('btn-send-another');

  if (supportForm) {
    supportForm.addEventListener('submit', (e) => {
      e.preventDefault();
      supportForm.classList.add('hidden');
      contactSuccessBox?.classList.remove('hidden');
      launchConfetti();
    });
  }

  if (btnSendAnother) {
    btnSendAnother.addEventListener('click', () => {
      supportForm?.reset();
      supportForm?.classList.remove('hidden');
      contactSuccessBox?.classList.add('hidden');
    });
  }

});

