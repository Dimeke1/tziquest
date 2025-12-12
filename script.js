const els = {
  themeToggle: document.getElementById("theme-toggle"),
  progressLabel: document.getElementById("progress-label"),
  scorePill: document.getElementById("score-pill"),
  progressFill: document.getElementById("progress-fill"),
  status: document.getElementById("status"),
  questionBlock: document.getElementById("question-block"),
  questionText: document.getElementById("question-text"),
  optionsForm: document.getElementById("options-form"),
  feedback: document.getElementById("feedback"),
  explanation: document.getElementById("explanation"),
  submitBtn: document.getElementById("submit-btn"),
  nextBtn: document.getElementById("next-btn"),
  summaryCard: document.getElementById("summary-card"),
  summaryTitle: document.getElementById("summary-title"),
  summaryScore: document.getElementById("summary-score"),
  summaryDetail: document.getElementById("summary-detail"),
  statCorrect: document.getElementById("stat-correct"),
  statWrong: document.getElementById("stat-wrong"),
  statAccuracy: document.getElementById("stat-accuracy"),
  restartBtn: document.getElementById("restart-btn"),
};

const state = {
  questions: [], // уже отфильтрованные, перемешанные и с 50 шт.
  index: 0,
  score: 0,
  answered: 0,
  locked: false,
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  attachHandlers();
  loadQuestions();
});

function attachHandlers() {
  els.themeToggle.addEventListener("click", toggleTheme);
  els.submitBtn.addEventListener("click", handleSubmit);
  els.nextBtn.addEventListener("click", handleNext);
  els.restartBtn.addEventListener("click", restart);
}

// === ЗАГРУЗКА И ПОДГОТОВКА ВОПРОСОВ ===
async function loadQuestions() {
  setStatus("Сұрақтар жүктелуде...", "info-muted");
  try {
    const res = await fetch("tzi_questions.csv");
    if (!res.ok) throw new Error("Файлды жүктеу мүмкін болмады");
    const text = await res.text();
    const parsed = parseCsv(text);

    // Фильтруем только валидные вопросы
    const validQuestions = parsed.filter(q => {
      const hasOptions = ["A", "B", "C", "D"].every(letter => q[letter] && q[letter].trim() !== "");
      const hasValidAnswer = ["A", "B", "C", "D"].includes((q.Answer || "").trim().toUpperCase());
      return hasOptions && hasValidAnswer;
    });

    if (!validQuestions.length) throw new Error("Сұрақтар табылмады");

    // Перемешиваем пул и берём 50
    const shuffledPool = shuffle([...validQuestions]);
    const selected = shuffledPool.slice(0, 50);

    // Перемешиваем варианты в каждом вопросе
    state.questions = selected.map(q => shuffleOptions(q));

    // Сбрасываем состояние
    state.index = 0;
    state.score = 0;
    state.answered = 0;

    els.summaryCard.hidden = true;
    els.questionBlock.classList.remove("hidden");
    setStatus("");
    renderQuestion();
  } catch (err) {
    setStatus(
      `Қате: ${err.message}. Файлды сервер арқылы ашыңыз (мысалы, "python -m http.server").`,
      "bad"
    );
    els.questionBlock.classList.add("hidden");
  }
}

// === ПЕРЕМЕШИВАНИЕ ВАРИАНТОВ ОТВЕТОВ ===
function shuffleOptions(question) {
  const letters = ["A", "B", "C", "D"];
  const options = letters.map(letter => ({
    originalLetter: letter,
    text: question[letter].trim(),
  }));

  const shuffled = shuffle([...options]);
  const newQuestion = { ...question };

  // Создаём маппинг: старая буква → новая позиция (новая буква)
  const letterMap = {};
  shuffled.forEach((opt, idx) => {
    const newLetter = letters[idx];
    newQuestion[newLetter] = opt.text;
    letterMap[opt.originalLetter] = newLetter;
  });

  // Обновляем правильный ответ
  const oldAnswer = question.Answer.trim().toUpperCase();
  newQuestion.Answer = letterMap[oldAnswer];

  return newQuestion;
}

// === РЕНДЕР ВОПРОСА ===
function renderQuestion() {
  const q = getCurrent();
  if (!q) return;

  els.questionText.textContent = `${state.index + 1}. ${q.Question}`;
  els.optionsForm.innerHTML = "";

  ["A", "B", "C", "D"].forEach(letter => {
    const text = q[letter];
    if (text === undefined) return; // защита
    const option = buildOption(letter, text);
    els.optionsForm.appendChild(option);
  });

  els.feedback.textContent = "";
  els.feedback.className = "feedback";
  els.explanation.classList.add("hidden");
  els.explanation.textContent = "";

  els.submitBtn.disabled = false;
  els.nextBtn.disabled = true;
  els.nextBtn.textContent = "Келесі сұрақ";
  state.locked = false;

  updateProgress();
}

function buildOption(letter, text) {
  const label = document.createElement("label");
  label.className = "option";
  const input = document.createElement("input");
  input.type = "radio";
  input.name = "answer";
  input.value = letter;
  input.required = true;
  const badge = document.createElement("span");
  badge.className = "letter";
  badge.textContent = letter;
  const body = document.createElement("span");
  body.className = "option-body";
  body.textContent = text;
  label.appendChild(input);
  label.appendChild(badge);
  label.appendChild(body);
  return label;
}

// === ОБРАБОТКА ОТВЕТА ===
function handleSubmit() {
  if (state.locked) return;

  const checked = els.optionsForm.querySelector('input[name="answer"]:checked');
  if (!checked) {
    setStatus("Алдымен жауапты таңдаңыз.", "bad");
    return;
  }

  const q = getCurrent();
  const correct = (q.Answer || "").trim().toUpperCase();
  const chosen = checked.value;

  // Подсветка
  const options = els.optionsForm.querySelectorAll(".option");
  options.forEach(opt => {
    const val = opt.querySelector("input").value;
    opt.querySelector("input").disabled = true;
    if (val === correct) opt.classList.add("correct");
    else if (val === chosen && chosen !== correct) opt.classList.add("incorrect");
  });

  if (chosen === correct) {
    state.score += 1;
    els.feedback.textContent = "Дұрыс! Жақсы жұмыс.";
    els.feedback.classList.add("ok");
  } else {
    els.feedback.textContent = `Қате. Дұрыс жауап: ${correct}.`;
    els.feedback.classList.add("bad");
  }

  // Пояснение
  const explanation = q.Explanation || "";
  if (explanation.trim()) {
    els.explanation.textContent = `Түсіндірме: ${explanation}`;
    els.explanation.classList.remove("hidden");
  }

  state.answered += 1;
  els.scorePill.textContent = `Ұпай: ${state.score}`;
  els.submitBtn.disabled = true;

  const isLast = state.index >= state.questions.length - 1;
  els.nextBtn.textContent = isLast ? "Нәтижені көру" : "Келесі сұрақ";
  els.nextBtn.disabled = false;
  state.locked = true;
  setStatus("");
}

function handleNext() {
  if (state.index >= state.questions.length - 1) {
    showSummary();
    return;
  }
  state.index += 1;
  renderQuestion();
}

function showSummary() {
  els.questionBlock.classList.add("hidden");
  els.summaryCard.hidden = false;

  const total = state.questions.length;
  const wrong = total - state.score;
  const accuracy = total ? Math.round((state.score / total) * 100) : 0;

  els.summaryTitle.textContent = "Қорытынды";
  els.summaryScore.textContent = `${state.score}/${total}`;
  els.summaryDetail.textContent = "Барлық сұрақтар аяқталды. Қайта бастау үшін төмендегі батырманы басыңыз.";
  els.statCorrect.textContent = state.score;
  els.statWrong.textContent = wrong;
  els.statAccuracy.textContent = `${accuracy}%`;

  updateProgress(1); // принудительно 100%
}

function restart() {
  loadQuestions();
}

// === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
function getCurrent() {
  return state.questions[state.index];
}

function setStatus(message, tone = "") {
  els.status.textContent = message;
  els.status.className = tone ? `info ${tone}` : "info";
}

function updateProgress(forcedRatio) {
  const total = state.questions.length;
  const current = state.index + 1;
  const ratio = forcedRatio !== undefined ? forcedRatio : total ? current / total : 0;
  els.progressLabel.textContent = `${Math.min(current, total)}/${total} сұрақ`;
  els.progressFill.style.width = `${Math.min(ratio * 100, 100)}%`;
  els.scorePill.textContent = `Ұпай: ${state.score}`;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// === ТЕМА ===
function initTheme() {
  const saved = localStorage.getItem("tzi-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = saved ? saved === "dark" : prefersDark;
  document.documentElement.classList.toggle("dark", dark);
  updateThemeButton(dark);
}

function toggleTheme() {
  const dark = !document.documentElement.classList.contains("dark");
  document.documentElement.classList.toggle("dark", dark);
  localStorage.setItem("tzi-theme", dark ? "dark" : "light");
  updateThemeButton(dark);
}

function updateThemeButton(isDark) {
  els.themeToggle.querySelector(".icon").textContent = isDark ? "☀️" : "🌙";
  els.themeToggle.querySelector(".label").textContent = isDark ? "Жарық режимі" : "Қараңғы режим";
}

// === CSV ===
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (cells[i] || "").replace(/^"|"$/g, "").trim();
    });
    return obj;
  });
}

function splitCsvLine(line) {
  const out = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;

}

