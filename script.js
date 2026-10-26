/**
 * Mental Health Prediction UI - Frontend Controller
 * Connects to the deployed prediction service.
 */

const API_BASE_URL = "https://mindpulse-mental-health-score-4ur4.onrender.com";

// Witty, dry, non-cringe loading sentences shown during inference
const LOADING_QUIPS = [
  "Consulting a random forest about your 3 AM scrolling habits...",
  "Converting daily phone unlocks into quantifiable existential dread...",
  "Asking the model if 4 hours of sleep still counts as a lifestyle...",
  "Running linear algebra on your screen time so you don't have to...",
  "Weighing your study hours against your committed relationship with social media...",
  "Cross-referencing your caffeine-fueled schedule with standard human limits..."
];

// Preset student profiles for rapid testing
const PRESETS = {
  balanced: {
    Age: 21,
    Gender: "female",
    Country: "Canada",
    Academic_Level: "undergraduate",
    Most_Used_Platform: "LinkedIn",
    Purpose_Of_Use: "Education",
    Avg_Daily_Usage_Hours: 2.0,
    Daily_Unlocks: 28,
    Study_Hours: 6.5,
    Physical_Activity_Hours: 1.5,
    Sleep_Hours_Per_Night: 8.0,
    Stress_Level: "Low"
  },
  crammer: {
    Age: 23,
    Gender: "male",
    Country: "India",
    Academic_Level: "graduate",
    Most_Used_Platform: "YouTube",
    Purpose_Of_Use: "Education",
    Avg_Daily_Usage_Hours: 5.5,
    Daily_Unlocks: 75,
    Study_Hours: 9.0,
    Physical_Activity_Hours: 0.5,
    Sleep_Hours_Per_Night: 5.5,
    Stress_Level: "High"
  },
  doomscroller: {
    Age: 19,
    Gender: "female",
    Country: "USA",
    Academic_Level: "undergraduate",
    Most_Used_Platform: "TikTok",
    Purpose_Of_Use: "Entertainment",
    Avg_Daily_Usage_Hours: 9.5,
    Daily_Unlocks: 145,
    Study_Hours: 1.5,
    Physical_Activity_Hours: 0.0,
    Sleep_Hours_Per_Night: 4.5,
    Stress_Level: "Very High"
  }
};

let quipInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  initSliderSync();
  initPresets();
  initCountrySelect();
  updateDayBudgetMeter();
  checkBackendStatus();

  const form = document.getElementById("predictionForm");
  if (form) {
    form.addEventListener("submit", handleFormSubmit);
    form.addEventListener("input", () => {
      updateDayBudgetMeter();
    });
  }

  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      applyPreset(PRESETS.balanced);
      hideErrorBanner();
    });
  }

  const statusPill = document.getElementById("statusPill");
  if (statusPill) {
    statusPill.addEventListener("click", checkBackendStatus);
  }

  const closeErrorBtn = document.getElementById("closeErrorBtn");
  if (closeErrorBtn) {
    closeErrorBtn.addEventListener("click", hideErrorBanner);
  }

});

/**
 * Sync range inputs with numeric inputs for smooth UX
 */
function initSliderSync() {
  const syncPairs = [
    ["Avg_Daily_Usage_Hours_Slider", "Avg_Daily_Usage_Hours"],
    ["Study_Hours_Slider", "Study_Hours"],
    ["Physical_Activity_Hours_Slider", "Physical_Activity_Hours"],
    ["Sleep_Hours_Per_Night_Slider", "Sleep_Hours_Per_Night"]
  ];

  syncPairs.forEach(([sliderId, numId]) => {
    const slider = document.getElementById(sliderId);
    const num = document.getElementById(numId);
    if (!slider || !num) return;

    slider.addEventListener("input", () => {
      num.value = slider.value;
      clearFieldError(numId);
      updateDayBudgetMeter();
    });

    num.addEventListener("input", () => {
      const val = parseFloat(num.value);
      if (!isNaN(val) && val >= 0 && val <= 24) {
        slider.value = val;
      }
      clearFieldError(numId);
      updateDayBudgetMeter();
    });
  });

  // Clear field errors on change for remaining fields
  ["Age", "Country", "Custom_Country", "Most_Used_Platform", "Daily_Unlocks"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("input", () => {
        clearFieldError(id);
      });
    }
  });
}

function initCountrySelect() {
  const countrySelect = document.getElementById("Country");
  const customWrapper = document.getElementById("customCountryWrapper");
  if (!countrySelect || !customWrapper) return;

  countrySelect.addEventListener("change", () => {
    if (countrySelect.value === "__custom__") {
      customWrapper.style.display = "block";
    } else {
      customWrapper.style.display = "none";
    }
  });
}

function initPresets() {
  document.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-preset");
      if (PRESETS[key]) {
        applyPreset(PRESETS[key]);
        hideErrorBanner();
      }
    });
  });
}

function applyPreset(data) {
  document.getElementById("Age").value = data.Age;
  setRadioValue("Gender", data.Gender);

  const countrySelect = document.getElementById("Country");
  const customWrapper = document.getElementById("customCountryWrapper");
  const knownCountries = ["India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France", "Other"];
  if (knownCountries.includes(data.Country)) {
    countrySelect.value = data.Country;
    if (customWrapper) customWrapper.style.display = "none";
  } else {
    countrySelect.value = "__custom__";
    if (customWrapper) customWrapper.style.display = "block";
    document.getElementById("Custom_Country").value = data.Country;
  }

  setRadioValue("Academic_Level", data.Academic_Level);
  document.getElementById("Most_Used_Platform").value = data.Most_Used_Platform;
  setRadioValue("Purpose_Of_Use", data.Purpose_Of_Use);

  setSliderAndNumber("Avg_Daily_Usage_Hours", data.Avg_Daily_Usage_Hours);
  document.getElementById("Daily_Unlocks").value = data.Daily_Unlocks;
  setSliderAndNumber("Study_Hours", data.Study_Hours);
  setSliderAndNumber("Physical_Activity_Hours", data.Physical_Activity_Hours);
  setSliderAndNumber("Sleep_Hours_Per_Night", data.Sleep_Hours_Per_Night);
  setRadioValue("Stress_Level", data.Stress_Level);

  clearAllFieldErrors();
  updateDayBudgetMeter();
}

function setRadioValue(name, value) {
  const radios = document.querySelectorAll(`input[name="${name}"]`);
  radios.forEach((r) => {
    r.checked = r.value === value;
  });
}

function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : "";
}

function setSliderAndNumber(fieldId, val) {
  const num = document.getElementById(fieldId);
  const slider = document.getElementById(`${fieldId}_Slider`);
  if (num) num.value = val;
  if (slider) slider.value = val;
}

/**
 * Updates the 24-hour visual day allocation bar
 */
function updateDayBudgetMeter() {
  const usage = parseFloat(document.getElementById("Avg_Daily_Usage_Hours")?.value) || 0;
  const study = parseFloat(document.getElementById("Study_Hours")?.value) || 0;
  const activity = parseFloat(document.getElementById("Physical_Activity_Hours")?.value) || 0;
  const sleep = parseFloat(document.getElementById("Sleep_Hours_Per_Night")?.value) || 0;

  const total = +(usage + study + activity + sleep).toFixed(1);
  const totalLabel = document.getElementById("dayTotalHours");
  const noteLabel = document.getElementById("dayBudgetNote");

  if (totalLabel) {
    totalLabel.textContent = `${total}h / 24h logged`;
    totalLabel.style.color = total > 24 ? "#fb7185" : "#94a3b8";
  }

  if (noteLabel) {
    if (total > 24) {
      noteLabel.textContent = "Multitasking detected (Screen time overlaps with study/activity)";
      noteLabel.style.color = "#fbbf24";
    } else {
      noteLabel.textContent = `${+(24 - total).toFixed(1)}h unallocated free time`;
      noteLabel.style.color = "#64748b";
    }
  }

  const denom = Math.max(24, total);
  setBarWidth("segUsage", (usage / denom) * 100);
  setBarWidth("segStudy", (study / denom) * 100);
  setBarWidth("segActivity", (activity / denom) * 100);
  setBarWidth("segSleep", (sleep / denom) * 100);
}

function setBarWidth(id, pct) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(100, Math.max(0, pct))}%`;
}

/**
 * Collects and validates form values matching StudentData Pydantic schema
 */
function buildAndValidatePayload() {
  clearAllFieldErrors();
  let isValid = true;

  const ageRaw = document.getElementById("Age").value.trim();
  const age = Number(ageRaw);
  if (ageRaw === "" || !Number.isInteger(age) || age < 10 || age > 100) {
    showFieldError("Age", "Age must be an integer between 10 and 100.");
    isValid = false;
  }

  const gender = getRadioValue("Gender");
  if (!["male", "female"].includes(gender)) {
    showFieldError("Gender", "Please select a valid gender.");
    isValid = false;
  }

  const countrySelect = document.getElementById("Country").value;
  let country = countrySelect;
  if (countrySelect === "__custom__") {
    country = document.getElementById("Custom_Country").value.trim();
    if (!country) {
      showFieldError("Country", "Please enter a country name.");
      isValid = false;
    }
  }

  const academicLevel = getRadioValue("Academic_Level");
  if (!["high school", "undergraduate", "graduate"].includes(academicLevel)) {
    showFieldError("Academic_Level", "Select an academic level.");
    isValid = false;
  }

  const platform = document.getElementById("Most_Used_Platform").value;
  const purpose = getRadioValue("Purpose_Of_Use");

  const usage = parseFloat(document.getElementById("Avg_Daily_Usage_Hours").value);
  if (isNaN(usage) || usage < 0 || usage > 24) {
    showFieldError("Avg_Daily_Usage_Hours", "Must be between 0 and 24 hours.");
    isValid = false;
  }

  const unlocksRaw = document.getElementById("Daily_Unlocks").value.trim();
  const unlocks = Number(unlocksRaw);
  if (unlocksRaw === "" || !Number.isInteger(unlocks) || unlocks < 0) {
    showFieldError("Daily_Unlocks", "Daily unlocks must be a whole number >= 0.");
    isValid = false;
  }

  const study = parseFloat(document.getElementById("Study_Hours").value);
  if (isNaN(study) || study < 0 || study > 24) {
    showFieldError("Study_Hours", "Must be between 0 and 24 hours.");
    isValid = false;
  }

  const activity = parseFloat(document.getElementById("Physical_Activity_Hours").value);
  if (isNaN(activity) || activity < 0 || activity > 24) {
    showFieldError("Physical_Activity_Hours", "Must be between 0 and 24 hours.");
    isValid = false;
  }

  const sleep = parseFloat(document.getElementById("Sleep_Hours_Per_Night").value);
  if (isNaN(sleep) || sleep < 0 || sleep > 24) {
    showFieldError("Sleep_Hours_Per_Night", "Must be between 0 and 24 hours.");
    isValid = false;
  }

  const stress = getRadioValue("Stress_Level");
  if (!["Low", "Medium", "High", "Very High"].includes(stress)) {
    showFieldError("Stress_Level", "Select a stress level.");
    isValid = false;
  }

  const payload = {
    Age: age,
    Gender: gender,
    Country: country,
    Academic_Level: academicLevel,
    Most_Used_Platform: platform,
    Purpose_Of_Use: purpose,
    Avg_Daily_Usage_Hours: usage,
    Daily_Unlocks: unlocks,
    Study_Hours: study,
    Physical_Activity_Hours: activity,
    Sleep_Hours_Per_Night: sleep,
    Stress_Level: stress
  };

  return { isValid, payload };
}

/**
 * Checks the prediction service so the user can see whether it is available.
 */
async function checkBackendStatus() {
  const dot = document.getElementById("statusDot");
  const text = document.getElementById("statusText");
  if (!dot || !text) return;

  dot.className = "status-dot";
  text.textContent = "Checking service...";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${API_BASE_URL}/`, {
      method: "GET",
      signal: controller.signal
    });
    clearTimeout(timer);

    if (res.ok) {
      dot.className = "status-dot online";
      text.textContent = "Service ready";
    } else {
      dot.className = "status-dot offline";
      text.textContent = "Service unavailable";
    }
  } catch (err) {
    dot.className = "status-dot offline";
    text.textContent = "Service unavailable";
  }
}

/**
 * Submits the profile to the prediction service.
 */
async function handleFormSubmit(e) {
  e.preventDefault();
  hideErrorBanner();

  const { isValid, payload } = buildAndValidatePayload();
  if (!isValid) {
    showErrorBanner(
      "Validation Error",
      "Please fix the highlighted fields above before trying again."
    );
    return;
  }

  startLoadingState();

  const minLoadingDelay = new Promise((resolve) => setTimeout(resolve, 950));

  try {
    const responsePromise = fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const [response] = await Promise.all([responsePromise, minLoadingDelay]);

    if (response.status === 422) {
      const errData = await response.json();
      stopLoadingState();
      handleFastApiValidationError(errData);
      return;
    }

    if (!response.ok) {
      throw new Error("The prediction service is temporarily unavailable.");
    }

    const result = await response.json();
    stopLoadingState();

    if (typeof result.predicted_mental_health_score !== "number") {
      throw new Error("We received an unexpected result. Please try again.");
    }

    const dot = document.getElementById("statusDot");
    const text = document.getElementById("statusText");
    if (dot && text) {
      dot.className = "status-dot online";
      text.textContent = "Service ready";
    }

    renderPredictionResult(result.predicted_mental_health_score, payload, false);
  } catch (error) {
    await minLoadingDelay;
    stopLoadingState();

    const isNetworkErr = error.name === "TypeError" || error.message.includes("Failed to fetch");
    const msg = isNetworkErr
      ? "We couldn't connect right now. Please check your connection and try again."
      : error.message;

    showErrorBanner("Unable to complete prediction", msg);
  }
}

function handleFastApiValidationError(errData) {
  if (errData && Array.isArray(errData.detail)) {
    errData.detail.forEach((item) => {
      const fieldName = item.loc && item.loc[item.loc.length - 1];
      const msg = item.msg || "Invalid value";
      if (fieldName) {
        showFieldError(fieldName, msg);
      }
    });
    showErrorBanner(
      "Please check your answers",
      "Some responses were not accepted. Review the highlighted fields and try again."
    );
  } else {
    showErrorBanner("Please check your answers", "Review the highlighted fields and try again.");
  }
}

/**
 * Loading animation & rotating sarcastic quips
 */
function startLoadingState() {
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.disabled = true;

  document.getElementById("resultPlaceholder").style.display = "none";
  document.getElementById("resultContent").classList.remove("active");

  const loader = document.getElementById("loadingState");
  const quipEl = document.getElementById("loadingQuipText");
  loader.classList.add("active");

  let idx = Math.floor(Math.random() * LOADING_QUIPS.length);
  quipEl.textContent = `"${LOADING_QUIPS[idx]}"`;

  if (quipInterval) clearInterval(quipInterval);
  quipInterval = setInterval(() => {
    idx = (idx + 1) % LOADING_QUIPS.length;
    quipEl.style.opacity = "0";
    setTimeout(() => {
      quipEl.textContent = `"${LOADING_QUIPS[idx]}"`;
      quipEl.style.opacity = "1";
    }, 200);
  }, 2200);
}

function stopLoadingState() {
  const submitBtn = document.getElementById("submitBtn");
  if (submitBtn) submitBtn.disabled = false;

  if (quipInterval) {
    clearInterval(quipInterval);
    quipInterval = null;
  }
  document.getElementById("loadingState").classList.remove("active");
}

/**
 * Generates a sharp, non-cringe sarcastic verdict tailored to the score & student inputs
 */
function generateSarcasticAnalysis(score, payload) {
  // Normalize score whether model outputs 0-10 or 0-100 scale
  const normScore = score <= 10 ? score * 10 : score;

  let tier = "Moderate Stability";
  let color = "#6366f1";
  let bgBadge = "rgba(99, 102, 241, 0.18)";
  let headlineQuip = "";

  if (normScore >= 80) {
    tier = "Suspiciously Functional";
    color = "#10b981";
    bgBadge = "rgba(16, 185, 129, 0.18)";
    headlineQuip = `A score of ${score}? Either you actually touch grass on schedule, or you just lied to a scikit-learn pickle file to feel validation.`;
  } else if (normScore >= 60) {
    tier = "Holding It Together (Mostly)";
    color = "#3b82f6";
    bgBadge = "rgba(59, 130, 246, 0.18)";
    headlineQuip = `You're operating at acceptable human capacity. A couple more ${payload.Most_Used_Platform} binges and we can easily fix that optimism.`;
  } else if (normScore >= 40) {
    tier = "Academic Battleground";
    color = "#f59e0b";
    bgBadge = "rgba(245, 158, 11, 0.18)";
    headlineQuip = `Your mental battery is flashing yellow, yet here you are unlocking your phone ${payload.Daily_Unlocks} times a day like the answer to inner peace is in the notification tray.`;
  } else {
    tier = "Held Together by Caffeine & Wi-Fi";
    color = "#f43f5e";
    bgBadge = "rgba(244, 63, 94, 0.18)";
    headlineQuip = `With ${payload.Sleep_Hours_Per_Night}h of sleep and "${payload.Stress_Level}" stress, your nervous system is basically running on console warnings and vibes.`;
  }

  // Contextual secondary roast based on specific habit extremes
  let habitNote = "";
  if (payload.Avg_Daily_Usage_Hours >= 7) {
    habitNote = `Spending ${payload.Avg_Daily_Usage_Hours} hours a day on ${payload.Most_Used_Platform} for "${payload.Purpose_Of_Use}" is a bold full-time career move.`;
  } else if (payload.Sleep_Hours_Per_Night < 5.5) {
    habitNote = `Sleeping ${payload.Sleep_Hours_Per_Night} hours a night is a great way to speedrun hallucinations before finals.`;
  } else if (payload.Daily_Unlocks > 100) {
    habitNote = `${payload.Daily_Unlocks} daily unlocks means your thumb gets more cardio than the rest of your body (${payload.Physical_Activity_Hours}h).`;
  } else {
    habitNote = `Using ${payload.Most_Used_Platform} for ${payload.Purpose_Of_Use} while logging ${payload.Study_Hours}h of study—remarkably civilized.`;
  }

  return {
    tier,
    color,
    bgBadge,
    normScore: Math.min(100, Math.max(5, normScore)),
    fullRoast: `${headlineQuip} ${habitNote}`
  };
}

/**
 * Renders the animated SVG gauge and creative result card
 */
function renderPredictionResult(score, payload, isSimulated = false) {
  const placeholder = document.getElementById("resultPlaceholder");
  const content = document.getElementById("resultContent");
  placeholder.style.display = "none";
  content.classList.add("active");

  const analysis = generateSarcasticAnalysis(score, payload);

  // Animate Gauge Circle (Circumference = 2 * PI * 80 = 502.65)
  const circumference = 502.65;
  const gaugeFill = document.getElementById("gaugeFillCircle");
  const offset = circumference - (analysis.normScore / 100) * circumference;

  gaugeFill.style.stroke = analysis.color;
  // Reset briefly for animation re-trigger
  gaugeFill.style.strokeDashoffset = circumference;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      gaugeFill.style.strokeDashoffset = String(offset);
    });
  });

  // Animate Score Counter
  const scoreEl = document.getElementById("scoreDisplayValue");
  scoreEl.style.color = analysis.color;
  animateNumber(scoreEl, score, 750);

  // Update Tier Badge
  const badge = document.getElementById("resultTierBadge");
  badge.textContent = isSimulated ? `${analysis.tier} (Demo Preview)` : analysis.tier;
  badge.style.color = analysis.color;
  badge.style.background = analysis.bgBadge;
  badge.style.border = `1px solid ${analysis.color}55`;

  // Update Sarcastic Box
  const roastBox = document.getElementById("sarcasticBox");
  roastBox.style.borderLeftColor = analysis.color;
  document.getElementById("sarcasticVerdictText").textContent = analysis.fullRoast;
  document.getElementById("sourceModeTag").textContent = isSimulated
    ? "Preview"
    : "Personalised result";

  // Update Mini Metric Breakdown
  const topCountries = ["Other", "India", "USA", "Canada", "Australia", "UK", "Germany", "Mexico", "Turkey", "France"];
  const groupedCountry = topCountries.includes(payload.Country) ? payload.Country : "Other";

  document.getElementById("metaPlatform").textContent = `${payload.Most_Used_Platform} (${payload.Avg_Daily_Usage_Hours}h)`;
  document.getElementById("metaUnlocks").textContent = `${payload.Daily_Unlocks} / day`;
  document.getElementById("metaSleepStudy").textContent = `${payload.Sleep_Hours_Per_Night}h sleep • ${payload.Study_Hours}h study`;
  document.getElementById("metaCountryGroup").textContent = `${payload.Country} → ${groupedCountry}`;
}

function animateNumber(el, target, duration) {
  const start = 0;
  const startTime = performance.now();
  const isFloat = !Number.isInteger(target);

  function tick(now) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * eased;
    el.textContent = isFloat ? current.toFixed(2) : Math.round(current);
    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = Number(target).toFixed(2).replace(/\.00$/, "");
    }
  }
  requestAnimationFrame(tick);
}

/**
 * Error handling helpers
 */
function showFieldError(fieldId, message) {
  const input = document.getElementById(fieldId);
  if (input) input.classList.add("input-error");

  const errEl = document.getElementById(`err-${fieldId}`);
  if (errEl) {
    errEl.textContent = message;
    errEl.classList.add("visible");
  }
}

function clearFieldError(fieldId) {
  const input = document.getElementById(fieldId);
  if (input) input.classList.remove("input-error");

  const errEl = document.getElementById(`err-${fieldId}`);
  if (errEl) {
    errEl.textContent = "";
    errEl.classList.remove("visible");
  }
}

function clearAllFieldErrors() {
  document.querySelectorAll(".input-error").forEach((el) => el.classList.remove("input-error"));
  document.querySelectorAll(".field-error-msg").forEach((el) => {
    el.textContent = "";
    el.classList.remove("visible");
  });
}

function showErrorBanner(title, message) {
  const banner = document.getElementById("errorBanner");
  document.getElementById("errorBannerTitle").textContent = title;
  document.getElementById("errorBannerMsg").textContent = message;
  banner.classList.add("active");
}

function hideErrorBanner() {
  const banner = document.getElementById("errorBanner");
  if (banner) banner.classList.remove("active");
}
