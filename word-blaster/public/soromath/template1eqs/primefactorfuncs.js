let primefactorpreset = {
  id: "primefactorequation",
  diffs: [0,1,2],
  template: "template1equation",
  addproblem: addprimefactorproblem,
  ontype: primefactortype,
  getanswer: primefactoranswer,
  validate: primefactorvalidate,
  answerText: primefactoranswertext,
  speechText: primefactorspeech,
  name: "prime factorisation",
  settings: {
    preset: "easy",
    presets:{
      "easy":{ range1: [2,99], range2: [0,0], range3: [] },
      "medium":{ range1: [2,149], range2: [0,0], range3: [] },
      "hard":{ range1: [2,199], range2: [0,0], range3: [] },
      "custom":{}
    },
    range1: [2,99],
    range2: [0,0],
    range3: []
  }
};

function primefactorlist(num){
  let factors = [];
  let current = Math.abs(num);
  let divisor = 2;

  while(current > 1 && divisor * divisor <= current){
    while(current % divisor == 0){
      factors.push(divisor);
      current = current / divisor;
    }
    divisor++;
  }

  if(current > 1) factors.push(current);
  return factors;
}

function addprimefactorproblem(main=false, self=primefactorpreset, name=null){
  let min = Math.max(2, self.settings.range1[0]);
  let max = Math.min(199, self.settings.range1[1]);
  if(min > max) [min, max] = [max, min];

  let num = Math.floor(Math.random() * (max - min + 1) + min);

  if(main) num = 12;
  if(main == false) problemlist.push([name, [num]]);
  else problemlist.push([name, [num]]);

  if(recentduplicate()) return;

  let problem = document.createElement("p");
  problem.innerHTML = "factor " + num + " =";
  problem.classList.add("problem");

  if(main) problem.id = "mainproblem";

  let problems = document.getElementsByClassName("mainproblems")[0];
  problems.appendChild(problem);

  return problem;
}

function primefactorspeech(problem){
  return "prime factorisation of " + problem[0];
}

function primefactortype(e){
  let input = document.getElementsByClassName("maininput")[0];
  let allowed = "0123456789*xX ";
  let filtered = "";

  for(var i = 0; i < input.value.length; i++){
    if(allowed.indexOf(input.value[i]) != -1) filtered += input.value[i];
  }

  input.value = filtered;
}

function primefactoranswer(problem){
  return primefactorlist(problem[0]);
}

function primefactoranswertext(answer){
  return answer.join(" * ");
}

function primefactorparse(input){
  let parts = String(input)
    .toLowerCase()
    .replace(/x/g, "*")
    .split(/[\*\s]+/)
    .map((part) => parseInt(part))
    .filter((part) => !Number.isNaN(part));

  return parts.sort((a, b) => a - b);
}

function primefactorvalidate(answer, inputnumber){
  let parsed = primefactorparse(inputnumber);
  if(parsed.length != answer.length) return false;

  let sorted = [...answer].sort((a, b) => a - b);
  for(var i = 0; i < sorted.length; i++){
    if(parsed[i] != sorted[i]) return false;
  }

  return true;
}
