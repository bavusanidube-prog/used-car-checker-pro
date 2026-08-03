"use strict";

/* ==========================================================
   USED CAR CHECKER PRO 2.0
========================================================== */

const APP = Object.freeze({
  version: "2.0.0",
  totalSteps: 6,
  storageKey: "used-car-checker-pro-last-result"
});

const AGE_LIMITS = Object.freeze({
  "0-3": [36000, 55000],
  "4-6": [65000, 90000],
  "7-10": [100000, 130000],
  "11-15": [135000, 175000],
  "16-plus": [165000, 210000]
});

const REPAIRS = Object.freeze({
  tyres: ["Tyre replacement", 180, 800, "Price depends on tyre size, brand and quantity."],
  brakes: ["Brake repair", 180, 1400, "Pads, discs, calipers or hydraulic repairs may be required."],
  service: ["Service and maintenance catch-up", 220, 650, "Includes overdue fluids, filters and routine maintenance."],
  body: ["Bodywork or accident-repair assessment", 250, 1800, "Structural or alignment work can cost substantially more."],
  corrosion: ["Corrosion or welding repair", 300, 2500, "Structural corrosion can exceed the value of an older vehicle."],
  warning: ["Warning-light diagnosis", 90, 900, "Read fault codes and test the system before pricing the repair."],
  engineMinor: ["Minor engine-running repair", 150, 700, "Ignition, intake, sensor or routine maintenance work may be involved."],
  engineMajor: ["Major engine or smoke concern", 800, 4500, "Compression, turbocharger, cylinder-head or internal repair may be involved."],
  cooling: ["Cooling-system repair", 180, 1500, "Pressure testing should identify the source before parts are replaced."],
  transmissionMinor: ["Clutch or transmission diagnosis", 180, 900, "Fluid, adaptation, control or mounting issues may be involved."],
  transmissionMajor: ["Major clutch or transmission repair", 750, 4500, "Clutch, flywheel, torque-converter or internal work may be required."],
  suspension: ["Steering or suspension repair", 180, 1400, "Final cost depends on the failed joint, bearing, spring, damper or steering component."],
  electrical: ["Electrical repair", 100, 900, "Circuit testing should identify the cause before any module is replaced."],
  glass: ["Glass, lighting or mirror repair", 60, 600, "Windscreens with cameras or sensors may need calibration."],
  key: ["Replacement or spare key", 120, 450, "Cost depends on coding and the vehicle security system."],
  inspection: ["Independent pre-purchase inspection", 120, 300, "A professional inspection can reduce the risk of a much larger loss."]
});

const RULES = Object.freeze({
  identityMatch: {
    yes: { risk: 0, positive: "VIN, V5C and registration details match." },
    "not-checked": { risk: 15, missing: "VIN, V5C and registration details have not been matched.", action: "Check every VIN location against the original V5C." },
    no: { risk: 45, critical: "VIN, V5C or registration details do not match or appear suspicious.", action: "Walk away and do not pay a deposit." }
  },
  historyCheck: {
    clear: { risk: 0, positive: "The vehicle-history check is clear." },
    "not-checked": { risk: 16, missing: "A vehicle-history check has not been completed.", action: "Check finance, theft, write-off and identity records before paying." },
    "category-repaired": { risk: 18, concern: "The vehicle has a recorded insurance write-off category.", action: "Confirm the category, repair quality, valuation and insurance position." },
    "finance-stolen-vin": { risk: 45, critical: "Outstanding finance, stolen status or a VIN concern is recorded.", action: "Do not buy the vehicle." }
  },
  marketPrice: {
    fair: { risk: 0, positive: "The asking price appears consistent with comparable cars." },
    "slightly-low": { risk: 2, positive: "The price is slightly below market without appearing implausible." },
    "suspiciously-low": { risk: 16, concern: "The asking price is suspiciously low.", action: "Confirm identity, legal history and the reason for the low price." },
    high: { risk: 9, concern: "The asking price appears above comparable vehicles.", action: "Use repair and condition evidence to justify a lower offer." },
    unknown: { risk: 6, missing: "Comparable market prices have not been checked.", action: "Compare at least five similar vehicles." }
  },
  serviceHistory: {
    "full-invoices": { risk: 0, positive: "Full service records with invoices support the mileage and maintenance history." },
    "full-stamps": { risk: 4, positive: "A stamped service record is useful, but invoices would provide stronger evidence." },
    partial: { risk: 12, concern: "The service history is incomplete.", repair: "service", action: "Price an immediate service and verify major scheduled maintenance." },
    none: { risk: 25, concern: "No service history is available.", repair: "service", action: "Treat mileage and maintenance claims as unverified." },
    unclear: { risk: 18, concern: "The service record cannot be verified clearly.", action: "Contact recorded garages or request invoices." }
  },
  motStatus: {
    "long-clean": { risk: 0, positive: "A long MOT with a consistent history is a useful positive sign." },
    "long-advisories": { risk: 7, concern: "The current MOT includes advisories that may become repair costs." },
    short: { risk: 10, concern: "The MOT has little time remaining.", action: "Ask the seller to provide a new MOT or reduce the price." },
    "repeat-failures": { risk: 19, concern: "Repeated failures or recurring advisories suggest delayed maintenance." },
    "none-unclear": { risk: 28, concern: "MOT status is missing or unclear.", action: "Do not use the vehicle on the road until its legal status is confirmed." }
  },
  mileageHistory: {
    consistent: { risk: 0, positive: "Mileage appears consistent across MOT and service evidence." },
    "minor-gap": { risk: 8, concern: "There is a small gap in the mileage evidence." },
    "not-checked": { risk: 8, missing: "Mileage progression has not been checked." },
    discrepancy: { risk: 30, critical: "Mileage evidence is inconsistent or suggests a rollback.", action: "Do not proceed until the discrepancy is independently verified." }
  },
  keysDocs: {
    complete: { risk: 0, positive: "Two keys and the handbook improve ownership confidence." },
    "one-key": { risk: 5, concern: "Only one key is supplied.", repair: "key" },
    "missing-docs": { risk: 12, concern: "Keys or supporting documents are missing." }
  },
  bodywork: {
    consistent: { risk: 0, positive: "Panel gaps and paint finish appear consistent." },
    cosmetic: { risk: 5, concern: "Minor cosmetic defects are present.", negotiation: ["Cosmetic bodywork", 150, 600] },
    "repair-signs": { risk: 16, concern: "Paint mismatch, overspray or poor panel gaps suggest previous repair.", repair: "body", action: "Check structure, alignment and repair invoices." },
    "structural-concern": { risk: 32, critical: "Visible distortion, creasing or structural repair concerns are present.", repair: "body", action: "Arrange a body-structure inspection or walk away." }
  },
  corrosion: {
    none: { risk: 0, positive: "No concerning corrosion was reported." },
    surface: { risk: 4, concern: "Light surface corrosion is present." },
    advisory: { risk: 15, concern: "Corrosion advisories or previous welding require close inspection.", repair: "corrosion" },
    structural: { risk: 34, critical: "Structural corrosion or an unsafe repair is suspected.", repair: "corrosion", action: "Do not buy without a professional structural assessment." },
    "not-checked": { risk: 7, missing: "The underbody and corrosion-prone areas were not checked." }
  },
  tyres: {
    good: { risk: 0, positive: "Tyres appear matched and have useful tread remaining." },
    "wear-soon": { risk: 7, concern: "Tyres are legal but likely to require replacement soon.", repair: "tyres", negotiation: ["Tyres approaching replacement", 180, 500] },
    uneven: { risk: 14, concern: "Uneven wear or mismatched tyres may indicate alignment or suspension issues.", repair: "tyres" },
    unsafe: { risk: 32, critical: "A tyre has an unsafe defect or illegal tread.", repair: "tyres", action: "Do not road test or drive the vehicle until repaired." }
  },
  brakesVisible: {
    good: { risk: 0, positive: "Visible brake condition appears serviceable." },
    "wear-soon": { risk: 8, concern: "Brake wear is likely to require attention soon.", repair: "brakes", negotiation: ["Brake wear", 180, 650] },
    corroded: { risk: 13, concern: "Heavy corrosion or an uneven braking surface is visible.", repair: "brakes" },
    "leak-unsafe": { risk: 34, critical: "A brake-fluid leak or visibly unsafe brake condition is present.", repair: "brakes", action: "Do not drive the vehicle." },
    "not-checked": { risk: 5, missing: "Visible brake condition was not checked." }
  },
  glassLights: {
    good: { risk: 0, positive: "Glass, lamps and mirrors appear serviceable." },
    minor: { risk: 4, concern: "Minor glass or lamp damage is present.", repair: "glass" },
    "mot-risk": { risk: 12, concern: "A glass, lamp or mirror defect may affect visibility or the MOT.", repair: "glass" }
  },
  waterIngress: {
    none: { risk: 0, positive: "No damp, staining or water-related odour was reported." },
    minor: { risk: 6, concern: "Minor damp or blocked-drain signs are present." },
    significant: { risk: 18, concern: "Significant water ingress may cause corrosion, mould and electrical faults.", repair: "electrical" },
    "not-checked": { risk: 4, missing: "Footwells, boot and spare-wheel well were not checked for water." }
  },
  coldStartStatus: {
    "cold-observed": { risk: 0, positive: "A genuine cold start was observed." },
    "warm-arrival": { risk: 8, missing: "The engine was warm before inspection, so cold-start faults may be hidden.", action: "Return when the engine is fully cold." },
    "not-started": { risk: 14, missing: "The engine was not started." }
  },
  startingIdle: {
    clean: { risk: 0, positive: "The engine starts promptly and idles smoothly." },
    minor: { risk: 8, concern: "Minor starting, vibration or noise concerns were reported.", repair: "engineMinor" },
    major: { risk: 24, concern: "Hard starting, misfire, knocking or a serious running fault is present.", repair: "engineMajor" },
    "not-checked": { risk: 8, missing: "Starting and idle behaviour were not checked." }
  },
  smoke: {
    normal: { risk: 0, positive: "No persistent abnormal exhaust smoke was observed." },
    brief: { risk: 4, concern: "Brief smoke or vapour requires context from temperature and fuel type." },
    black: { risk: 17, concern: "Persistent black smoke suggests a fuelling, intake, boost or emissions fault.", repair: "engineMajor" },
    "blue-white": { risk: 34, critical: "Persistent blue or dense white smoke indicates potentially serious engine trouble.", repair: "engineMajor", action: "Do not buy without compression, cooling and turbocharger checks." },
    "not-checked": { risk: 6, missing: "Exhaust smoke was not assessed." }
  },
  fluidsLeaks: {
    good: { risk: 0, positive: "Fluid levels and visible condition appear acceptable." },
    "service-due": { risk: 7, concern: "Fluids appear overdue or poorly maintained.", repair: "service" },
    "minor-leak": { risk: 12, concern: "A minor oil or coolant leak is present.", repair: "cooling" },
    "major-leak": { risk: 32, critical: "A major fluid leak, contamination or dangerously low level is present.", repair: "engineMajor", action: "Do not drive until the source and severity are confirmed." },
    "not-checked": { risk: 6, missing: "Fluid levels and visible leaks were not checked." }
  },
  cooling: {
    normal: { risk: 0, positive: "Temperature, fan and heater behaviour appear normal." },
    uncertain: { risk: 7, missing: "The cooling system was not fully proven at operating temperature." },
    "coolant-loss": { risk: 18, concern: "Coolant loss, weak heater output or fan concerns require diagnosis.", repair: "cooling" },
    overheating: { risk: 36, critical: "Overheating, steam or severe cooling-system pressure was reported.", repair: "engineMajor", action: "Do not buy or continue driving without an engine and cooling assessment." }
  },
  drivetrain: {
    normal: { risk: 0, positive: "Clutch or automatic-transmission operation appears normal." },
    minor: { risk: 9, concern: "A minor clutch, shift or drivetrain concern is present.", repair: "transmissionMinor" },
    major: { risk: 23, concern: "Slip, delayed engagement, harsh shifting or judder indicates significant repair risk.", repair: "transmissionMajor" },
    unsafe: { risk: 35, critical: "Drive loss, severe slip or a major transmission leak is present.", repair: "transmissionMajor", action: "Do not drive or buy without specialist assessment." },
    "not-checked": { risk: 7, missing: "Clutch or transmission operation was not checked." }
  },
  warningLights: {
    normal: { risk: 0, positive: "Required warning lights prove out and extinguish normally." },
    amber: { risk: 15, concern: "An amber warning remains illuminated.", repair: "warning", action: "Read fault codes before discussing price." },
    "red-flashing": { risk: 33, critical: "A red or flashing warning remains illuminated.", repair: "warning", action: "Do not drive until the warning is understood." },
    tampered: { risk: 36, critical: "A required warning lamp may have been disabled or tampered with.", action: "Treat the vehicle and seller explanation as high risk." },
    "not-checked": { risk: 7, missing: "Dashboard warning-light prove-out was not checked." }
  },
  electrics: {
    "all-good": { risk: 0, positive: "Tested electrical equipment operates correctly." },
    minor: { risk: 4, concern: "One minor electrical accessory fault is present.", repair: "electrical" },
    multiple: { risk: 13, concern: "Multiple electrical faults may indicate wiring, battery or module issues.", repair: "electrical" },
    "not-checked": { risk: 5, missing: "Electrical equipment was not fully tested." }
  },
  performance: {
    normal: { risk: 0, positive: "Engine performance is smooth and predictable." },
    minor: { risk: 8, concern: "Slight hesitation or weak response was reported.", repair: "engineMinor" },
    major: { risk: 23, concern: "Misfire, severe power loss, smoke or limp mode occurred during the drive.", repair: "engineMajor" },
    "not-tested": { risk: 10, missing: "Engine performance was not tested on the road." }
  },
  steering: {
    normal: { risk: 0, positive: "The vehicle tracks straight and steering feels controlled." },
    minor: { risk: 7, concern: "A slight pull, vibration or off-centre steering wheel is present.", repair: "suspension" },
    major: { risk: 18, concern: "Wandering, heavy steering or severe vibration requires inspection.", repair: "suspension" },
    unsafe: { risk: 34, critical: "Steering control is unpredictable or severely loose.", repair: "suspension", action: "Do not continue the test drive." },
    "not-tested": { risk: 8, missing: "Steering and directional stability were not road tested." }
  },
  braking: {
    normal: { risk: 0, positive: "The car stops straight with a firm, predictable brake pedal." },
    minor: { risk: 6, concern: "Minor brake noise or vibration is present.", repair: "brakes" },
    major: { risk: 19, concern: "Pulling, grinding, weak or spongy braking requires urgent inspection.", repair: "brakes" },
    unsafe: { risk: 36, critical: "Braking is unsafe or unpredictable.", repair: "brakes", action: "Stop the test drive and arrange recovery or repair." },
    "not-tested": { risk: 10, missing: "Brake performance was not road tested." }
  },
  suspension: {
    normal: { risk: 0, positive: "Suspension control and road noise appear normal." },
    minor: { risk: 6, concern: "A minor knock or road-noise concern is present.", repair: "suspension" },
    major: { risk: 16, concern: "Repeated knocking, bouncing or bearing noise requires repair.", repair: "suspension" },
    "not-tested": { risk: 6, missing: "Suspension behaviour was not fully road tested." }
  },
  transmissionDrive: {
    normal: { risk: 0, positive: "The transmission operates normally under road load." },
    minor: { risk: 8, concern: "A minor clutch or shift concern is present under load.", repair: "transmissionMinor" },
    major: { risk: 22, concern: "Slip, crunch, harsh shifting or delayed engagement is present.", repair: "transmissionMajor" },
    unsafe: { risk: 35, critical: "Drive delivery is lost or unpredictable.", repair: "transmissionMajor", action: "Do not continue driving." },
    "not-tested": { risk: 8, missing: "Transmission behaviour under load was not tested." }
  },
  driveWarnings: {
    normal: { risk: 0, positive: "Temperature remained stable and no new warnings appeared." },
    amber: { risk: 14, concern: "An amber warning appeared during the test drive.", repair: "warning" },
    hot: { risk: 22, concern: "Temperature rose or a coolant concern developed during the drive.", repair: "cooling" },
    red: { risk: 36, critical: "A red warning, overheating or smoke occurred during the drive.", repair: "engineMajor", action: "Stop the vehicle immediately." },
    "not-tested": { risk: 8, missing: "Temperature and warning behaviour were not proven during a road test." }
  },
  sellerBehaviour: {
    good: { risk: 0, positive: "The seller provides clear answers without applying pressure." },
    minor: { risk: 7, concern: "Some seller answers or records remain incomplete." },
    pressure: { risk: 20, concern: "Pressure selling or an inconsistent story increases buying risk.", action: "Do not allow urgency to replace verification." },
    "identity-concern": { risk: 36, critical: "Seller identity or ownership evidence is questionable.", action: "Do not pay until ownership is verified." }
  },
  inspectionStatus: {
    completed: { risk: -4, positive: "An independent inspection has been completed with acceptable findings." },
    booked: { risk: 0, positive: "The seller is allowing an independent inspection." },
    "not-arranged": { risk: 6, missing: "An independent inspection has not been arranged.", repair: "inspection" },
    refused: { risk: 26, critical: "The seller refuses an independent inspection.", action: "Walk away unless there is a credible and verifiable reason." }
  },
  paymentPosition: {
    none: { risk: 0, positive: "No deposit has been paid before completing the checks." },
    protected: { risk: 2, concern: "A deposit has been paid; retain written refund conditions." },
    pressure: { risk: 17, concern: "The seller is applying pressure for immediate payment." },
    untraceable: { risk: 30, critical: "An untraceable payment method is being requested.", action: "Do not transfer money until identity, ownership and payment protection are clear." }
  }
});

const dom = {
  form: document.getElementById("used-car-form"),
  steps: Array.from(document.querySelectorAll(".checker-step")),
  indicators: Array.from(document.querySelectorAll("[data-step-indicator]")),
  nextButtons: Array.from(document.querySelectorAll("[data-next-step]")),
  backButtons: Array.from(document.querySelectorAll("[data-previous-step]")),
  progressFill: document.getElementById("progress-fill"),
  progressStatus: document.getElementById("progress-status"),
  progressBar: document.querySelector(".progress-track"),
  resultSection: document.getElementById("result-section"),
  resultTitle: document.getElementById("result-title"),
  resultSummary: document.getElementById("result-summary"),
  resultScore: document.getElementById("result-score"),
  resultRiskLabel: document.getElementById("result-risk-label"),
  verdictBanner: document.getElementById("verdict-banner"),
  verdictBadge: document.getElementById("verdict-badge"),
  verdictTitle: document.getElementById("verdict-title"),
  verdictCopy: document.getElementById("verdict-copy"),
  metricCritical: document.getElementById("metric-critical"),
  metricConcerns: document.getElementById("metric-concerns"),
  metricPositives: document.getElementById("metric-positives"),
  metricConfidence: document.getElementById("metric-confidence"),
  repairBudget: document.getElementById("repair-budget"),
  negotiationAmount: document.getElementById("negotiation-amount"),
  maximumOffer: document.getElementById("maximum-offer"),
  criticalList: document.getElementById("critical-list"),
  concernList: document.getElementById("concern-list"),
  positiveList: document.getElementById("positive-list"),
  missingList: document.getElementById("missing-list"),
  negotiationList: document.getElementById("negotiation-list"),
  actionList: document.getElementById("action-list"),
  notesSection: document.getElementById("buyer-notes-result"),
  notesCopy: document.getElementById("buyer-notes-copy"),
  copyReport: document.getElementById("copy-report"),
  printReport: document.getElementById("print-report"),
  editCheck: document.getElementById("edit-check"),
  newCheck: document.getElementById("start-new-check"),
  listTemplate: document.getElementById("list-item-template"),
  negotiationTemplate: document.getElementById("negotiation-item-template"),
  step2Message: document.getElementById("step-2-message"),
  step6Message: document.getElementById("step-6-message")
};

const state = {
  currentStep: 1,
  latestResult: null,
  reportText: ""
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function currency(value) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0
  }).format(value);
}

function data() {
  return Object.fromEntries(new FormData(dom.form).entries());
}

function showStep(step) {
  state.currentStep = clamp(Number(step), 1, APP.totalSteps);

  dom.steps.forEach((panel) => {
    panel.hidden = Number(panel.dataset.step) !== state.currentStep;
  });

  dom.indicators.forEach((item) => {
    const number = Number(item.dataset.stepIndicator);
    item.classList.toggle("active", number === state.currentStep);
    item.classList.toggle("complete", number < state.currentStep);
  });

  const progress = ((state.currentStep - 1) / (APP.totalSteps - 1)) * 100;
  dom.progressFill.style.width = `${progress}%`;
  dom.progressStatus.textContent = `Step ${state.currentStep} of ${APP.totalSteps}`;
  dom.progressBar.setAttribute("aria-valuenow", String(state.currentStep));

  const active = dom.steps.find((panel) => Number(panel.dataset.step) === state.currentStep);
  active?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function message(element, text) {
  element.textContent = text;
  element.hidden = false;
  element.focus();
}

function clearMessage(element) {
  element.textContent = "";
  element.hidden = true;
}

function validateHistory() {
  clearMessage(dom.step2Message);

  if (!dom.form.querySelector('input[name="identityMatch"]:checked') ||
      !dom.form.querySelector('input[name="historyCheck"]:checked')) {
    message(dom.step2Message, "Please answer both identity and vehicle-history questions before continuing.");
    return false;
  }

  return true;
}

function validateFinal() {
  clearMessage(dom.step6Message);

  if (!document.getElementById("limitations-confirmed").checked) {
    message(dom.step6Message, "Please confirm that you understand the checker’s limitations.");
    return false;
  }

  return true;
}

function mileageRule(age, mileage) {
  const limits = AGE_LIMITS[age];

  if (!limits || !mileage) {
    return { risk: 8, missing: "Mileage was not entered, reducing assessment confidence." };
  }

  if (mileage <= limits[0]) {
    return { risk: 0, positive: "Mileage is within a broadly reasonable range for the selected age." };
  }

  if (mileage <= limits[1]) {
    return { risk: 6, concern: "Mileage is above the broad expected range, although maintenance matters more than mileage alone." };
  }

  return { risk: 14, concern: "Mileage is high for the selected age, increasing wear and maintenance exposure." };
}

function apply(rule, result) {
  if (!rule) return;

  result.risk += rule.risk || 0;
  if (rule.critical) result.critical.push(rule.critical);
  if (rule.concern) result.concerns.push(rule.concern);
  if (rule.positive) result.positives.push(rule.positive);
  if (rule.missing) result.missing.push(rule.missing);
  if (rule.action) result.actions.push(rule.action);
  if (rule.repair) result.repairKeys.add(rule.repair);

  if (rule.negotiation) {
    result.negotiation.push({
      title: rule.negotiation[0],
      min: rule.negotiation[1],
      max: rule.negotiation[2],
      copy: rule.concern || "Use this verified repair exposure during negotiation."
    });
  }
}

function repairBudget(keys) {
  const items = [...keys].map((key) => REPAIRS[key]).filter(Boolean);
  const min = items.reduce((sum, item) => sum + item[1], 0);
  const max = items.reduce((sum, item) => sum + item[2], 0);

  return {
    min,
    max,
    items,
    label: items.length ? `${currency(min)}–${currency(max)}` : "£0–£250 contingency"
  };
}

function verdict(score, criticalCount, concernCount) {
  if (criticalCount > 0) {
    return {
      code: "walk-away",
      badge: "WALK AWAY",
      title: "Critical legal, identity or safety evidence is present",
      copy: "The score has been overridden. Do not pay a deposit or continue driving until every critical issue is independently resolved.",
      label: "Critical override"
    };
  }

  if (score >= 82 && concernCount <= 3) {
    return {
      code: "buy",
      badge: "BUY",
      title: "Strong candidate subject to final verification",
      copy: "The entered evidence is broadly positive. Complete any missing legal and mechanical checks before committing funds.",
      label: "Lower buying risk"
    };
  }

  if (score >= 65) {
    return {
      code: "negotiate",
      badge: "NEGOTIATE",
      title: "Potentially worthwhile at the right price",
      copy: "The identified repairs, missing evidence or seller concerns should affect the price and purchase conditions.",
      label: "Moderate buying risk"
    };
  }

  if (score >= 45) {
    return {
      code: "inspect",
      badge: "INSPECT FIRST",
      title: "High uncertainty or repair exposure",
      copy: "Arrange an independent inspection, written quotations and complete all missing history checks before buying.",
      label: "High buying risk"
    };
  }

  return {
    code: "walk-away",
    badge: "WALK AWAY",
    title: "The combined evidence is too risky",
    copy: "The number and severity of concerns make another vehicle the safer option.",
    label: "Very high buying risk"
  };
}

function calculate() {
  const form = data();

  const result = {
    risk: 0,
    critical: [],
    concerns: [],
    positives: [],
    missing: [],
    actions: [],
    repairKeys: new Set(),
    negotiation: []
  };

  Object.entries(RULES).forEach(([field, rules]) => apply(rules[form[field]], result));
  apply(mileageRule(form.age, Number(form.mileage || 0)), result);

  const budget = repairBudget(result.repairKeys);

  budget.items.forEach((item) => {
    if (!result.negotiation.some((entry) => entry.title === item[0])) {
      result.negotiation.push({ title: item[0], min: item[1], max: item[2], copy: item[3] });
    }
  });

  result.risk = clamp(Math.round(result.risk + Math.min(result.missing.length * 2, 14)), 0, 100);
  result.score = 100 - result.risk;
  result.confidence = clamp(Math.round(((30 - result.missing.length) / 30) * 100), 35, 98);
  result.verdict = verdict(result.score, result.critical.length, result.concerns.length);
  result.budget = budget;

  const riskAllowance = result.concerns.length * 75 + result.missing.length * 40;
  result.negotiationAmount = Math.max(Math.round(budget.min * 1.15), riskAllowance);

  const asking = Number(form.askingPrice || 0);
  result.maximumOffer = asking ? Math.max(0, asking - result.negotiationAmount) : null;
  result.form = form;
  result.notes = form.notes?.trim() || "";

  return result;
}

function list(element, items, fallback) {
  element.textContent = "";
  (items.length ? items : [fallback]).forEach((text) => {
    const node = dom.listTemplate.content.cloneNode(true);
    node.querySelector("li").textContent = text;
    element.appendChild(node);
  });
}

function negotiation(items) {
  dom.negotiationList.textContent = "";

  if (!items.length) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No specific repair item was selected. Negotiate only from verified evidence.";
    dom.negotiationList.appendChild(p);
    return;
  }

  items.forEach((item) => {
    const node = dom.negotiationTemplate.content.cloneNode(true);
    node.querySelector("[data-negotiation-title]").textContent = item.title;
    node.querySelector("[data-negotiation-copy]").textContent = item.copy;
    node.querySelector("[data-negotiation-cost]").textContent = `${currency(item.min)}–${currency(item.max)}`;
    dom.negotiationList.appendChild(node);
  });
}

function actions(result) {
  const items = [...result.actions];

  if (result.missing.length) {
    items.push("Complete every missing identity, history and inspection check before agreeing to buy.");
  }

  if (result.budget.max > 250) {
    items.push("Obtain written repair quotations and compare the adjusted total cost with better examples.");
  }

  if (result.form.inspectionStatus !== "completed") {
    items.push("Arrange an independent pre-purchase inspection before paying the balance.");
  }

  items.push("Match the original V5C, registration, visible VIN and seller identity immediately before payment.");
  items.push("Use a traceable payment method and obtain a dated receipt.");

  return [...new Set(items)].slice(0, 8);
}

function vehicleLabel(form) {
  const text = [
    form.registration?.toUpperCase(),
    [form.make, form.model].filter(Boolean).join(" "),
    form.mileage ? `${Number(form.mileage).toLocaleString("en-GB")} miles` : ""
  ].filter(Boolean);

  return text.length ? text.join(" • ") : "the vehicle assessed";
}

function render(result) {
  state.latestResult = result;

  dom.resultTitle.textContent = `Recommendation for ${vehicleLabel(result.form)}`;
  dom.resultSummary.textContent = `Based on ${result.positives.length} positive findings, ${result.concerns.length} concerns, ${result.critical.length} critical issues and ${result.missing.length} missing checks.`;
  dom.resultScore.textContent = `${result.score}/100`;
  dom.resultRiskLabel.textContent = result.verdict.label;

  dom.verdictBanner.dataset.verdict = result.verdict.code;
  dom.verdictBadge.textContent = result.verdict.badge;
  dom.verdictTitle.textContent = result.verdict.title;
  dom.verdictCopy.textContent = result.verdict.copy;

  dom.metricCritical.textContent = result.critical.length;
  dom.metricConcerns.textContent = result.concerns.length;
  dom.metricPositives.textContent = result.positives.length;
  dom.metricConfidence.textContent = `${result.confidence}%`;

  dom.repairBudget.textContent = result.budget.label;
  dom.negotiationAmount.textContent = result.negotiationAmount ? currency(result.negotiationAmount) : "Evidence-led only";
  dom.maximumOffer.textContent = result.maximumOffer !== null ? currency(result.maximumOffer) : "Enter asking price";

  list(dom.criticalList, result.critical, "No critical stop sign was selected. Continue to verify independently.");
  list(dom.concernList, result.concerns, "No significant concern was selected.");
  list(dom.positiveList, result.positives, "No strong positive evidence was recorded.");
  list(dom.missingList, result.missing, "No major inspection category was left unchecked.");
  list(dom.actionList, actions(result), "Complete a professional inspection before buying.");
  negotiation(result.negotiation);

  dom.notesSection.hidden = !result.notes;
  dom.notesCopy.textContent = result.notes;

  state.reportText = textReport(result);

  sessionStorage.setItem(APP.storageKey, JSON.stringify({
    version: APP.version,
    savedAt: new Date().toISOString(),
    result
  }));

  dom.resultSection.hidden = false;
  dom.resultSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function textReport(result) {
  return [
    "USED CAR CHECKER PRO",
    "Motor Vehicle Expert",
    "",
    `Generated: ${new Date().toLocaleString("en-GB")}`,
    `Vehicle: ${vehicleLabel(result.form)}`,
    `Recommendation: ${result.verdict.badge}`,
    `Buying score: ${result.score}/100`,
    `Evidence confidence: ${result.confidence}%`,
    `Likely immediate spend: ${result.budget.label}`,
    `Suggested negotiation leverage: ${result.negotiationAmount ? currency(result.negotiationAmount) : "Evidence-led only"}`,
    `Suggested maximum offer: ${result.maximumOffer !== null ? currency(result.maximumOffer) : "Asking price not entered"}`,
    "",
    "CRITICAL STOP SIGNS",
    ...(result.critical.length ? result.critical.map((x) => `- ${x}`) : ["- None selected"]),
    "",
    "CONCERNS",
    ...(result.concerns.length ? result.concerns.map((x) => `- ${x}`) : ["- None selected"]),
    "",
    "POSITIVE EVIDENCE",
    ...(result.positives.length ? result.positives.map((x) => `- ${x}`) : ["- None recorded"]),
    "",
    "MISSING CHECKS",
    ...(result.missing.length ? result.missing.map((x) => `- ${x}`) : ["- No major category left unchecked"]),
    "",
    "NEXT ACTIONS",
    ...actions(result).map((x, i) => `${i + 1}. ${x}`),
    "",
    "BUYER NOTES",
    result.notes || "None entered.",
    "",
    "Guidance only. Confirm legal history, identity and mechanical condition independently."
  ].join("\n");
}

async function copyReport() {
  if (!state.reportText) {
    alert("Generate a buyer report first.");
    return;
  }

  try {
    await navigator.clipboard.writeText(state.reportText);
    alert("Buyer report copied.");
  } catch {
    const area = document.createElement("textarea");
    area.value = state.reportText;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
    alert("Buyer report copied.");
  }
}

function resetApp() {
  dom.form.reset();
  state.latestResult = null;
  state.reportText = "";
  sessionStorage.removeItem(APP.storageKey);
  dom.resultSection.hidden = true;
  clearMessage(dom.step2Message);
  clearMessage(dom.step6Message);
  showStep(1);
}

function bind() {
  dom.nextButtons.forEach((button) => button.addEventListener("click", () => {
    if (state.currentStep === 2 && !validateHistory()) return;
    showStep(button.dataset.nextStep);
  }));

  dom.backButtons.forEach((button) => button.addEventListener("click", () => {
    showStep(button.dataset.previousStep);
  }));

  dom.form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateFinal()) return;
    render(calculate());
  });

  dom.copyReport.addEventListener("click", copyReport);
  dom.printReport.addEventListener("click", () => window.print());
  dom.editCheck.addEventListener("click", () => {
    dom.resultSection.hidden = true;
    showStep(1);
  });
  dom.newCheck.addEventListener("click", resetApp);
}

function initialise() {
  bind();
  showStep(1);
}

document.addEventListener("DOMContentLoaded", initialise, { once: true });
