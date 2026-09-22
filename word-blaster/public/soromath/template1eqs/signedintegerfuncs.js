let signedIntegerPreset = {
  id: "signedintegerequation",
  diffs: [0,1,2],
  template: "template1equation",
  addproblem: addSignedIntegerProblem,
  ontype: signedIntegerType,
  getanswer: signedIntegerAnswer,
  validate: signedIntegerValidate,
  answerText: signedIntegerAnswerText,
  speechText: signedIntegerSpeech,
  name: "positive & negative integers",
  settings: {
    preset: "easy",
    presets: {
      easy: { addLimit: 12, factorLimit: 6 },
      medium: { addLimit: 30, factorLimit: 12 },
      hard: { addLimit: 75, factorLimit: 15 },
      custom: {}
    },
    addLimit: 12,
    factorLimit: 6
  }
};

let signedIntegerDeck = [];

function signedIntegerShuffle(items){
  let result = [...items];
  for(let i = result.length - 1; i > 0; i--){
    let j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function signedIntegerRefillDeck(){
  let cases = [];
  let operations = ["+", "-", "*", "/"];
  let signs = [[1,1], [1,-1], [-1,1], [-1,-1]];

  for(let operation of operations){
    for(let pair of signs){
      cases.push({ operation: operation, signs: pair });
    }
  }
  signedIntegerDeck = signedIntegerShuffle(cases);
}

function signedIntegerRandom(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function signedIntegerDisplay(value){
  return value < 0 ? "(" + value + ")" : String(value);
}

function buildSignedIntegerQuestion(self=signedIntegerPreset, forcedCase=null){
  if(signedIntegerDeck.length == 0) signedIntegerRefillDeck();
  let item = forcedCase || signedIntegerDeck.pop();
  let operation = item.operation;
  let sign1 = item.signs[0];
  let sign2 = item.signs[1];
  let first;
  let second;
  let answer;

  if(operation == "/"){
    let divisor = signedIntegerRandom(2, self.settings.factorLimit);
    let quotient = signedIntegerRandom(2, self.settings.factorLimit);
    first = divisor * quotient * sign1;
    second = divisor * sign2;
    answer = first / second;
  }
  else if(operation == "*"){
    first = signedIntegerRandom(2, self.settings.factorLimit) * sign1;
    second = signedIntegerRandom(2, self.settings.factorLimit) * sign2;
    answer = first * second;
  }
  else{
    first = signedIntegerRandom(1, self.settings.addLimit) * sign1;
    second = signedIntegerRandom(1, self.settings.addLimit) * sign2;
    answer = operation == "+" ? first + second : first - second;
  }

  let symbol = operation == "*" ? "&times;" : operation == "/" ? "&divide;" : operation;
  let spokenOperation = operation == "+" ? "plus" : operation == "-" ? "minus" : operation == "*" ? "times" : "divided by";
  let spokenFirst = first < 0 ? "negative " + Math.abs(first) : String(first);
  let spokenSecond = second < 0 ? "negative " + Math.abs(second) : String(second);

  return {
    prompt: signedIntegerDisplay(first) + " " + symbol + " " + signedIntegerDisplay(second) + " =",
    answer: answer,
    speech: spokenFirst + " " + spokenOperation + " " + spokenSecond,
    operation: operation,
    signs: [sign1, sign2]
  };
}

function addSignedIntegerProblem(main=false, self=signedIntegerPreset, name=null){
  let question = main
    ? buildSignedIntegerQuestion(self, { operation: "+", signs: [-1,1] })
    : buildSignedIntegerQuestion(self);

  problemlist.push([name, [question.prompt, question.answer, question.speech, question.operation, question.signs]]);
  if(recentduplicate()) return;

  let problem = document.createElement("p");
  problem.innerHTML = question.prompt;
  problem.classList.add("problem");
  if(main) problem.id = "mainproblem";
  document.getElementsByClassName("mainproblems")[0].appendChild(problem);
  return problem;
}

function signedIntegerType(){
  let input = document.getElementsByClassName("maininput")[0];
  let filtered = "";
  for(let character of input.value){
    if(character >= "0" && character <= "9") filtered += character;
    else if(character == "-" && filtered.length == 0) filtered = "-";
  }
  input.value = filtered;
}

function signedIntegerAnswer(problem){
  return problem[1];
}

function signedIntegerAnswerText(answer){
  return String(answer);
}

function signedIntegerValidate(answer, inputnumber){
  if(!/^-?\d+$/.test(String(inputnumber).trim())) return false;
  return answer == Number(inputnumber);
}

function signedIntegerSpeech(problem){
  return problem[2];
}
