(function () {
  "use strict";

  var engine = window.RCWQuizEngine;
  var catalog = engine.topicCatalog();
  var selectedTopics = new Set();
  var session = null;
  var activeQuestion = null;
  var locked = false;

  var setupScreen = document.getElementById("setupScreen");
  var quizScreen = document.getElementById("quizScreen");
  var resultScreen = document.getElementById("resultScreen");
  var skillsInput = document.getElementById("skillsInput");
  var skillChips = document.getElementById("skillChips");
  var setupError = document.getElementById("setupError");
  var progressCopy = document.getElementById("progressCopy");
  var progressBar = document.getElementById("progressBar");
  var topicBadge = document.getElementById("topicBadge");
  var agentPrompt = document.getElementById("agentPrompt");
  var agentMessage = document.getElementById("agentMessage");
  var questionKicker = document.getElementById("questionKicker");
  var questionText = document.getElementById("questionText");
  var answers = document.getElementById("answers");
  var recordingStatus = document.getElementById("recordingStatus");

  function showOnly(screen) {
    setupScreen.hidden = screen !== setupScreen;
    quizScreen.hidden = screen !== quizScreen;
    resultScreen.hidden = screen !== resultScreen;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderChips() {
    skillChips.textContent = "";
    catalog.forEach(function (topic) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "chip";
      button.textContent = topic.label;
      button.dataset.topic = topic.id;
      button.setAttribute("aria-pressed", selectedTopics.has(topic.id) ? "true" : "false");
      button.addEventListener("click", function () {
        if (selectedTopics.has(topic.id)) selectedTopics.delete(topic.id);
        else selectedTopics.add(topic.id);
        button.setAttribute("aria-pressed", selectedTopics.has(topic.id) ? "true" : "false");
        setupError.hidden = true;
      });
      skillChips.appendChild(button);
    });
  }

  function chosenTopicIds() {
    var typedTopics = engine.detectTopics(skillsInput.value);
    return Array.from(new Set(Array.from(selectedTopics).concat(typedTopics)));
  }

  function startQuiz() {
    var topicIds = chosenTopicIds();
    if (!topicIds.length) {
      setupError.textContent = "Please enter a recognized skill or choose at least one skill above.";
      setupError.hidden = false;
      skillsInput.focus();
      return;
    }

    try {
      session = engine.createSession(topicIds, { total: 20 });
    } catch (problem) {
      setupError.textContent = problem.message || "The quiz could not start. Please choose your skills again.";
      setupError.hidden = false;
      return;
    }

    setupError.hidden = true;
    showOnly(quizScreen);
    renderNextQuestion();
  }

  function agentCopy(questionNumber) {
    if (questionNumber === 1) return ["Let’s begin.", "Choose the best answer. Your score appears after question 20."];
    if (questionNumber === 6) return ["Good pace.", "I’m adjusting the next questions as you continue."];
    if (questionNumber === 11) return ["Halfway point.", "Keep choosing the best technical answer."];
    if (questionNumber === 16) return ["Final stretch.", "Five questions remain after this one."];
    if (questionNumber === 20) return ["Last question.", "Choose your answer to see the final score and star rating."];
    return ["Next question.", "Choose the best answer to continue."];
  }

  function renderNextQuestion() {
    activeQuestion = session.nextQuestion();
    locked = false;
    recordingStatus.textContent = "";
    var state = session.getState();
    var questionNumber = state.answered + 1;
    var copy = agentCopy(questionNumber);

    progressCopy.textContent = "Question " + questionNumber + " of " + state.total;
    progressBar.style.width = Math.round((questionNumber / state.total) * 100) + "%";
    topicBadge.textContent = activeQuestion.topicLabel;
    agentPrompt.textContent = copy[0];
    agentMessage.textContent = copy[1];
    questionKicker.textContent = activeQuestion.topicLabel + " question";
    questionText.textContent = activeQuestion.prompt;
    answers.textContent = "";

    activeQuestion.options.forEach(function (option, index) {
      var button = document.createElement("button");
      var letter = document.createElement("span");
      var copySpan = document.createElement("span");
      button.type = "button";
      button.className = "answer";
      button.dataset.index = String(index);
      letter.className = "letter";
      letter.textContent = String.fromCharCode(65 + index);
      copySpan.textContent = option;
      button.appendChild(letter);
      button.appendChild(copySpan);
      button.addEventListener("click", function () { recordAnswer(button, index); });
      answers.appendChild(button);
    });
    questionText.focus({ preventScroll: true });
  }

  function recordAnswer(selectedButton, selectedIndex) {
    if (locked) return;
    locked = true;
    Array.from(answers.querySelectorAll("button")).forEach(function (button) {
      button.disabled = true;
    });
    selectedButton.classList.add("selected");

    var answerState;
    try {
      answerState = session.submitAnswer(selectedIndex);
    } catch (problem) {
      recordingStatus.textContent = problem.message || "Please choose an answer again.";
      locked = false;
      return;
    }

    recordingStatus.textContent = answerState.done ? "Answer recorded. Preparing your result…" : "Answer recorded. Raju is choosing your next question…";
    window.setTimeout(function () {
      if (answerState.done) showResult();
      else renderNextQuestion();
    }, 450);
  }

  function showResult() {
    var result = session.getResult();
    document.getElementById("finalScore").textContent = result.score + " / " + result.total;
    document.getElementById("finalPercent").textContent = result.percent + "%";
    var stars = document.getElementById("stars");
    stars.textContent = "";
    stars.setAttribute("aria-label", result.stars + " out of 5 stars");
    for (var index = 1; index <= 5; index += 1) {
      var star = document.createElement("span");
      star.className = "star" + (index <= result.stars ? " on" : "");
      star.textContent = "★";
      star.setAttribute("aria-hidden", "true");
      stars.appendChild(star);
    }
    document.getElementById("starNote").textContent = result.stars + " out of 5 stars";
    showOnly(resultScreen);
    document.getElementById("restartButton").focus({ preventScroll: true });
  }

  function restartQuiz() {
    session = null;
    activeQuestion = null;
    locked = false;
    showOnly(setupScreen);
    skillsInput.focus({ preventScroll: true });
  }

  document.getElementById("startButton").addEventListener("click", startQuiz);
  document.getElementById("restartButton").addEventListener("click", restartQuiz);
  skillsInput.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") startQuiz();
  });

  renderChips();
})();
