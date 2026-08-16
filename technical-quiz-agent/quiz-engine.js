(function (root, factory) {
  "use strict";
  var engine = factory(typeof module === "object" && module.exports ? require("./questions.js") : root.RCWQuizData);
  if (typeof module === "object" && module.exports) module.exports = engine;
  else root.RCWQuizEngine = engine;
})(typeof self !== "undefined" ? self : this, function (data) {
  "use strict";

  if (!data || !data.topics) throw new Error("Quiz topics are unavailable.");

  function normalize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9+#./-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function shuffled(items, random) {
    var copy = items.slice();
    for (var index = copy.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(random() * (index + 1));
      var temporary = copy[index];
      copy[index] = copy[swapIndex];
      copy[swapIndex] = temporary;
    }
    return copy;
  }

  function topicCatalog() {
    return Object.keys(data.topics).map(function (id) {
      return { id: id, label: data.topics[id].label };
    });
  }

  function detectTopics(text) {
    var normalizedText = " " + normalize(text) + " ";
    if (normalizedText.trim().length === 0) return [];
    return Object.keys(data.topics).filter(function (id) {
      var topic = data.topics[id];
      var terms = [id, topic.label].concat(topic.aliases || []);
      return terms.some(function (term) {
        var normalizedTerm = normalize(term);
        return normalizedTerm && normalizedText.indexOf(" " + normalizedTerm + " ") !== -1;
      });
    });
  }

  function scoreToStars(percent) {
    if (percent >= 90) return 5;
    if (percent >= 75) return 4;
    if (percent >= 60) return 3;
    if (percent >= 40) return 2;
    return 1;
  }

  function validateQuestionBank() {
    var errors = [];
    Object.keys(data.topics).forEach(function (topicId) {
      var topic = data.topics[topicId];
      if (!topic.label || !Array.isArray(topic.questions) || topic.questions.length < 20) {
        errors.push(topicId + " must contain a label and at least 20 questions");
        return;
      }
      topic.questions.forEach(function (question, index) {
        if (!Array.isArray(question) || question.length !== 4) {
          errors.push(topicId + " question " + index + " has an invalid shape");
          return;
        }
        if (![1, 2, 3].includes(question[0])) errors.push(topicId + " question " + index + " has invalid difficulty");
        if (typeof question[1] !== "string" || !question[1].trim()) errors.push(topicId + " question " + index + " has no prompt");
        if (!Array.isArray(question[2]) || question[2].length !== 4) errors.push(topicId + " question " + index + " must have four choices");
        if (!Number.isInteger(question[3]) || question[3] < 0 || question[3] > 3) errors.push(topicId + " question " + index + " has invalid answer");
      });
    });
    return errors;
  }

  function createSession(requestedTopics, settings) {
    settings = settings || {};
    var random = typeof settings.random === "function" ? settings.random : Math.random;
    var total = Number.isInteger(settings.total) ? settings.total : 20;
    var topicIds = Array.from(new Set((requestedTopics || []).filter(function (id) { return Boolean(data.topics[id]); })));
    if (!topicIds.length) throw new Error("Choose at least one supported skill.");
    if (total < 1 || total > 20) throw new Error("Quiz length must be between 1 and 20.");

    var topicPlan = [];
    while (topicPlan.length < total) {
      topicPlan = topicPlan.concat(shuffled(topicIds, random));
    }
    topicPlan = topicPlan.slice(0, total);

    var used = new Set();
    var currentQuestion = null;
    var answered = 0;
    var correct = 0;
    var level = 2;
    var correctStreak = 0;

    function pickQuestion() {
      if (answered >= total) return null;
      var plannedTopic = topicPlan[answered];
      var topic = data.topics[plannedTopic];
      var available = topic.questions.map(function (raw, index) {
        return { id: plannedTopic + "-" + index, raw: raw, index: index };
      }).filter(function (entry) { return !used.has(entry.id); });

      if (!available.length) {
        throw new Error("No unused questions remain for " + topic.label + ".");
      }

      var nearestDistance = Math.min.apply(null, available.map(function (entry) {
        return Math.abs(entry.raw[0] - level);
      }));
      var nearest = available.filter(function (entry) {
        return Math.abs(entry.raw[0] - level) === nearestDistance;
      });
      var selected = nearest[Math.floor(random() * nearest.length)];
      var choices = selected.raw[2].map(function (text, index) {
        return { text: text, correct: index === selected.raw[3] };
      });
      choices = shuffled(choices, random);

      used.add(selected.id);
      currentQuestion = {
        id: selected.id,
        topic: plannedTopic,
        topicLabel: topic.label,
        difficulty: selected.raw[0],
        prompt: selected.raw[1],
        options: choices.map(function (choice) { return choice.text; }),
        correctIndex: choices.findIndex(function (choice) { return choice.correct; })
      };
      return {
        id: currentQuestion.id,
        topic: currentQuestion.topic,
        topicLabel: currentQuestion.topicLabel,
        difficulty: currentQuestion.difficulty,
        prompt: currentQuestion.prompt,
        options: currentQuestion.options.slice()
      };
    }

    function nextQuestion() {
      if (currentQuestion) throw new Error("Answer the current question before requesting another one.");
      return pickQuestion();
    }

    function submitAnswer(selectedIndex) {
      if (!currentQuestion) throw new Error("There is no active question.");
      if (!Number.isInteger(selectedIndex) || selectedIndex < 0 || selectedIndex > 3) {
        throw new Error("Choose one of the four answers.");
      }

      var wasCorrect = selectedIndex === currentQuestion.correctIndex;
      answered += 1;
      if (wasCorrect) {
        correct += 1;
        correctStreak += 1;
        if (correctStreak >= 2 && level < 3) {
          level += 1;
          correctStreak = 0;
        }
      } else {
        correctStreak = 0;
        if (level > 1) level -= 1;
      }
      currentQuestion = null;
      return { correct: wasCorrect, answered: answered, done: answered >= total };
    }

    function getResult() {
      var percent = Math.round((correct / total) * 100);
      return { score: correct, total: total, percent: percent, stars: scoreToStars(percent), complete: answered >= total };
    }

    function getState() {
      return { answered: answered, total: total, level: level, hasCurrentQuestion: Boolean(currentQuestion) };
    }

    return {
      nextQuestion: nextQuestion,
      submitAnswer: submitAnswer,
      getResult: getResult,
      getState: getState,
      topics: topicIds.slice()
    };
  }

  return {
    topicCatalog: topicCatalog,
    detectTopics: detectTopics,
    scoreToStars: scoreToStars,
    validateQuestionBank: validateQuestionBank,
    createSession: createSession
  };
});
