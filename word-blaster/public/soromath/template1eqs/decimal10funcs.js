let decimalTimesTenPreset = {
  id: "decimaltimestenequation",
  diffs: [0,1,2],
  template: "template1equation",
  addproblem: addDecimalTimesTen,
  ontype: decimalTenType,
  getanswer: decimalTimesTenAnswer,
  validate: decimalTenValidate,
  speechText: decimalTimesTenSpeech,
  name: "decimal x 10, 100, 1000",
  settings: {
    preset: "easy",
    presets: {
      easy: { range1: [0.1, 9.9], powersOfTen: [10] },
      medium: { range1: [0.1, 99.99], powersOfTen: [10, 100] },
      hard: { range1: [0.01, 999.999], powersOfTen: [10, 100, 1000] },
      custom: {}
    },
    range1: [0.1, 9.9],
    powersOfTen: [10]
  }
};

let decimalDivideTenPreset = {
  id: "decimaldividetenequation",
  diffs: [0,1,2],
  template: "template1equation",
  addproblem: addDecimalDivideTen,
  ontype: decimalTenType,
  getanswer: decimalDivideTenAnswer,
  validate: decimalTenValidate,
  speechText: decimalDivideTenSpeech,
  name: "decimal / 10, 100, 1000",
  settings: {
    preset: "easy",
    presets: {
      easy: { range1: [0.1, 9.9], powersOfTen: [10] },
      medium: { range1: [0.1, 99.99], powersOfTen: [10, 100] },
      hard: { range1: [0.01, 999.999], powersOfTen: [10, 100, 1000] },
      custom: {}
    },
    range1: [0.1, 9.9],
    powersOfTen: [10]
  }
};

function decimalPlacesForPreset(preset){
  if(preset == "hard") return 3;
  if(preset == "medium") return 2;
  return 1;
}

function randomDecimalForPreset(self){
  let places = decimalPlacesForPreset(self.settings.preset);
  let scale = Math.pow(10, places);
  let min = Math.ceil(self.settings.range1[0] * scale);
  let max = Math.floor(self.settings.range1[1] * scale);
  return Math.floor(Math.random() * (max - min + 1) + min) / scale;
}

function randomPowerOfTen(self){
  let choices = self.settings.powersOfTen || [10];
  return choices[Math.floor(Math.random() * choices.length)];
}

function cleanDecimal(value){
  return Number(Number(value).toFixed(6));
}

function addDecimalTimesTen(main=false, self=decimalTimesTenPreset, name=null){
  let decimal = main ? 0 : randomDecimalForPreset(self);
  let multiplier = main ? 10 : randomPowerOfTen(self);
  problemlist.push([name, [decimal, multiplier]]);
  if(recentduplicate()) return;

  let problem = document.createElement("p");
  problem.innerHTML = decimal + " &times; " + multiplier + " =";
  problem.classList.add("problem");
  if(main) problem.id = "mainproblem";
  document.getElementsByClassName("mainproblems")[0].appendChild(problem);
  return problem;
}

function addDecimalDivideTen(main=false, self=decimalDivideTenPreset, name=null){
  let answer = main ? 0 : randomDecimalForPreset(self);
  let divisor = main ? 10 : randomPowerOfTen(self);
  let dividend = cleanDecimal(answer * divisor);
  problemlist.push([name, [dividend, divisor]]);
  if(recentduplicate()) return;

  let problem = document.createElement("p");
  problem.innerHTML = dividend + " &divide; " + divisor + " =";
  problem.classList.add("problem");
  if(main) problem.id = "mainproblem";
  document.getElementsByClassName("mainproblems")[0].appendChild(problem);
  return problem;
}

function decimalTenType(){
  let input = document.getElementsByClassName("maininput")[0];
  let allowed = "-0123456789.";
  let filtered = "";
  let hasDecimal = false;

  for(let i = 0; i < input.value.length; i++){
    let character = input.value[i];
    if(allowed.indexOf(character) == -1) continue;
    if(character == "."){
      if(hasDecimal) continue;
      hasDecimal = true;
    }
    if(character == "-" && filtered.length > 0) continue;
    filtered += character;
  }
  input.value = filtered;
}

function decimalTimesTenAnswer(problem){
  return cleanDecimal(problem[0] * problem[1]);
}

function decimalDivideTenAnswer(problem){
  return cleanDecimal(problem[0] / problem[1]);
}

function decimalTenValidate(answer, inputnumber){
  let entered = Number(inputnumber);
  return Number.isFinite(entered) && Math.abs(answer - entered) < 0.000001;
}

function decimalTimesTenSpeech(problem){
  return problem[0] + " times " + problem[1];
}

function decimalDivideTenSpeech(problem){
  return problem[0] + " divided by " + problem[1];
}
