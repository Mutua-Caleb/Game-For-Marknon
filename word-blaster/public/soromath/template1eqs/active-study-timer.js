const activeStudyStorageKey = "soromath-active-study-v2";
const activeStudyEventKey = "soromath-progress-events-v2";
const activeStudyStudentKey = "soromath-student-name";
let activeStudyLastHostPost = 0;

let activeStudy = {
  activeMs: 0,
  lastTick: Date.now(),
  lastActivity: 0,
  targetMs: 10 * 60 * 1000,
  idleGraceMs: 6000,
  running: false,
  solved: 0,
  correct: 0,
  wrong: 0,
  student: "marknon"
};

function activeStudyInit(){
  activeStudyLoad();
  activeStudy.lastTick = Date.now();
  activeStudy.lastActivity = 0;
  activeStudyRender();

  document.addEventListener("visibilitychange", activeStudyRender);
  window.addEventListener("blur", activeStudyRender);
  window.addEventListener("focus", activeStudyMarkActivity);
  document.addEventListener("keydown", (event) => {
    if(event.key.length == 1 || event.key == "Backspace" || event.key == "Enter"){
      activeStudyMarkActivity();
    }
  });
  document.addEventListener("pointerdown", activeStudyMarkActivity);
  window.addEventListener("beforeunload", () => {
    activeStudySave();
    activeStudyLogEvent("session_snapshot");
  });

  setInterval(activeStudyTick, 250);
  setInterval(activeStudySave, 5000);
}

function activeStudyHostMode(){
  try{
    return Array.isArray(currentmode) ? currentmode.join(", ") : String(currentmode || "unknown");
  }
  catch(error){
    return "unknown";
  }
}

function activeStudyPostHost(eventType="progress", force=false){
  try{
    if(window.parent == window) return;

    let now = Date.now();
    if(!force && now - activeStudyLastHostPost < 2000) return;
    activeStudyLastHostPost = now;

    window.parent.postMessage({
      source: "soromath-active-study",
      eventType: eventType,
      activeMs: Math.floor(activeStudy.activeMs),
      solved: activeStudy.solved,
      correct: activeStudy.correct,
      wrong: activeStudy.wrong,
      running: activeStudy.running,
      mode: activeStudyHostMode()
    }, window.location.origin);
  }
  catch(error){
    // Host reporting is best-effort; never interrupt practice.
  }
}

function activeStudyToday(){
  return new Date().toISOString().slice(0, 10);
}

function activeStudyLoad(){
  try{
    let saved = JSON.parse(localStorage.getItem(activeStudyStorageKey) || "{}");
    let savedStudent = localStorage.getItem(activeStudyStudentKey);
    if(savedStudent) activeStudy.student = savedStudent;

    if(saved.day == activeStudyToday()){
      activeStudy.activeMs = saved.activeMs || 0;
      activeStudy.solved = saved.solved || 0;
      activeStudy.correct = saved.correct || 0;
      activeStudy.wrong = saved.wrong || 0;
    }
  }
  catch(error){
    console.warn("Could not load active study state", error);
  }
}

function activeStudySave(){
  try{
    localStorage.setItem(activeStudyStudentKey, activeStudy.student);
    localStorage.setItem(activeStudyStorageKey, JSON.stringify({
      day: activeStudyToday(),
      activeMs: activeStudy.activeMs,
      solved: activeStudy.solved,
      correct: activeStudy.correct,
      wrong: activeStudy.wrong,
      updatedAt: new Date().toISOString()
    }));
  }
  catch(error){
    console.warn("Could not save active study state", error);
  }
}

function activeStudyResetToday(){
  if(!confirm("Reset today's active focus timer?")) return;

  activeStudy.activeMs = 0;
  activeStudy.lastTick = Date.now();
  activeStudy.lastActivity = 0;
  activeStudy.running = false;
  activeStudy.solved = 0;
  activeStudy.correct = 0;
  activeStudy.wrong = 0;
  activeStudySave();
  activeStudyLogEvent("manual_reset");
  activeStudyRender();
  activeStudyPostHost("manual_reset", true);
}

function activeStudyReset(){
  activeStudy.lastTick = Date.now();
  activeStudy.running = false;
  activeStudySave();
  activeStudyRender();
}

function activeStudyStart(){
  activeStudy.lastTick = Date.now();
  activeStudyMarkActivity();
}

function activeStudyMarkActivity(){
  activeStudy.lastActivity = Date.now();
  activeStudyRender();
}

function activeStudyProblemComplete(correct=false){
  activeStudy.solved++;
  if(correct) activeStudy.correct++;
  else activeStudy.wrong++;

  activeStudyMarkActivity();
  activeStudySave();
  activeStudyLogEvent("problem_complete", {
    correct: correct === true,
    mode: Array.isArray(currentmode) ? currentmode.join(", ") : String(currentmode || "unknown"),
    template: currenttemplate || "unknown"
  });
  activeStudyPostHost("problem_complete", true);
}

function activeStudyShouldRun(now){
  if(document.hidden) return false;
  if(currenttab != "flashproblems") return false;

  let finishscreen = document.getElementById("finishscreen");
  if(finishscreen != null && finishscreen.style.display != "none") return false;

  let hasStartedTemplate = typeof teststarted != "undefined" && teststarted > 0;
  let templateInput = document.getElementById("template1input");
  let templateAnswering = hasStartedTemplate && templateInput != null && document.activeElement == templateInput;
  let flashInput = document.getElementById("flashinput");
  let flashAnswering = flashInput != null && flashInput.style.display != "none" && flashInput.disabled == false && document.activeElement == flashInput;

  if(!templateAnswering && !flashAnswering) return false;
  return now - activeStudy.lastActivity <= activeStudy.idleGraceMs;
}

function activeStudyTick(){
  let now = Date.now();
  let dt = now - activeStudy.lastTick;
  activeStudy.lastTick = now;

  activeStudy.running = activeStudyShouldRun(now);
  if(activeStudy.running){
    activeStudy.activeMs += dt;
  }

  activeStudyRender();
}

function activeStudyFormat(ms){
  let totalSeconds = Math.floor(ms / 1000);
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function activeStudyLocalEvents(){
  try{
    return JSON.parse(localStorage.getItem(activeStudyEventKey) || "[]");
  }
  catch(error){
    return [];
  }
}

function activeStudySaveLocalEvent(event){
  try{
    let events = activeStudyLocalEvents();
    events.push(event);
    if(events.length > 1000) events = events.slice(events.length - 1000);
    localStorage.setItem(activeStudyEventKey, JSON.stringify(events));
  }
  catch(error){
    console.warn("Could not save local progress event", error);
  }
}

function activeStudyLogEvent(type, extra={}){
  let event = {
    type: type,
    student: activeStudy.student,
    at: new Date().toISOString(),
    day: activeStudyToday(),
    activeMs: Math.floor(activeStudy.activeMs),
    solved: activeStudy.solved,
    correctTotal: activeStudy.correct,
    wrongTotal: activeStudy.wrong,
    ...extra
  };

  activeStudySaveLocalEvent(event);

  if(location.protocol == "file:") return;

  fetch("/.netlify/functions/progress", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(event),
    keepalive: true
  }).catch(() => {});
}

function activeStudyRender(){
  let root = document.getElementById("activeStudyTimer");
  if(root == null) return;

  let now = Date.now();
  let idleFor = activeStudy.lastActivity == 0 ? Infinity : now - activeStudy.lastActivity;
  let percent = Math.min(100, activeStudy.activeMs / activeStudy.targetMs * 100);
  let isGoalMet = activeStudy.activeMs >= activeStudy.targetMs;

  root.classList.toggle("active", activeStudy.running);
  root.classList.toggle("paused", !activeStudy.running);
  root.classList.toggle("complete", isGoalMet);

  document.getElementById("activeStudyTime").textContent = activeStudyFormat(activeStudy.activeMs);
  document.getElementById("activeStudyGoal").textContent = `/ ${activeStudyFormat(activeStudy.targetMs)}`;
  document.getElementById("activeStudySolved").textContent = `${activeStudy.solved} solved`;
  document.getElementById("activeStudyAccuracy").textContent = `${activeStudy.correct} right / ${activeStudy.wrong} wrong`;
  document.getElementById("activeStudyFill").style.width = `${percent}%`;

  let status = "Paused";
  if(isGoalMet) status = "Goal met";
  else if(activeStudy.running) status = "Counting";
  else if(document.hidden) status = "Paused: page hidden";
  else if(currenttab != "flashproblems") status = "Paused: off task";
  else if(document.activeElement != document.getElementById("template1input") && document.activeElement != document.getElementById("flashinput")) status = "Paused: answer box not focused";
  else if(idleFor > activeStudy.idleGraceMs) status = "Paused: idle";

  document.getElementById("activeStudyStatus").textContent = status;
  activeStudyPostHost("progress");
}

window.addEventListener("load", activeStudyInit);
