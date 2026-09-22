let areaPerimeterPreset = {
  id: "areaperimeterequation",
  diffs: [0,1,2],
  template: "template1equation",
  addproblem: addAreaPerimeterProblem,
  ontype: areaPerimeterType,
  getanswer: areaPerimeterAnswer,
  validate: areaPerimeterValidate,
  answerText: areaPerimeterAnswerText,
  speechText: areaPerimeterSpeech,
  name: "area & perimeter",
  settings: {
    preset: "easy",
    presets: {
      easy: { level: "easy", dimensionMax: 10 },
      medium: { level: "medium", dimensionMax: 16 },
      hard: { level: "hard", dimensionMax: 25 },
      custom: {}
    },
    level: "easy",
    dimensionMax: 10
  }
};

const areaPerimeterShapes = [
  "square", "rectangle", "triangle", "parallelogram", "trapezium",
  "rhombus", "circle", "semicircle", "quarter circle"
];
let areaPerimeterDecks = { easy: [], medium: [], hard: [] };

function areaPerimeterRandom(min, max){
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function areaPerimeterShuffle(items){
  let result = [...items];
  for(let i = result.length - 1; i > 0; i--){
    let j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function areaPerimeterRefillDeck(level){
  let directions = ["area", "perimeter", "reverse-area", "reverse-perimeter"];
  let cases = [];
  for(let shape of areaPerimeterShapes){
    for(let direction of directions){
      cases.push({ shape: shape, direction: direction });
      if(level == "hard" && direction.indexOf("reverse") == 0){
        cases.push({ shape: shape, direction: direction });
      }
    }
  }
  areaPerimeterDecks[level] = areaPerimeterShuffle(cases);
}

function areaPerimeterClean(value){
  return Number(Number(value).toFixed(6));
}

function areaPerimeterQuestion(prompt, answer, speech, caseName){
  return { prompt: prompt, answer: areaPerimeterClean(answer), speech: speech, caseName: caseName };
}

function areaPerimeterTriangleSides(max){
  let a = areaPerimeterRandom(3, max);
  let b = areaPerimeterRandom(3, max);
  let minC = Math.abs(a - b) + 1;
  let maxC = Math.max(minC, Math.min(a + b - 1, max + 4));
  return [a, b, areaPerimeterRandom(minC, maxC)];
}

function buildAreaPerimeterQuestion(self=areaPerimeterPreset, forcedCase=null){
  let level = self.settings.level || "easy";
  if(areaPerimeterDecks[level] == undefined || areaPerimeterDecks[level].length == 0){
    areaPerimeterRefillDeck(level);
  }
  let item = forcedCase || areaPerimeterDecks[level].pop();
  let shape = item.shape;
  let direction = item.direction;
  let max = self.settings.dimensionMax || 10;
  let min = level == "hard" ? 5 : 2;
  let a;
  let b;
  let h;
  let s;
  let area;
  let perimeter;

  if(shape == "square"){
    s = areaPerimeterRandom(min, max);
    area = s * s;
    perimeter = 4 * s;
    if(direction == "area") return areaPerimeterQuestion("Square A: side " + s + " =", area, "square area with side " + s, "square-area");
    if(direction == "perimeter") return areaPerimeterQuestion("Square P: side " + s + " =", perimeter, "square perimeter with side " + s, "square-perimeter");
    if(direction == "reverse-area") return areaPerimeterQuestion("Square: A " + area + ", side =", s, "square area " + area + ", find the side", "square-reverse-area");
    return areaPerimeterQuestion("Square: P " + perimeter + ", side =", s, "square perimeter " + perimeter + ", find the side", "square-reverse-perimeter");
  }

  if(shape == "rectangle"){
    a = areaPerimeterRandom(min + 1, max);
    b = areaPerimeterRandom(min, Math.max(min, max - 1));
    area = a * b;
    perimeter = 2 * (a + b);
    if(direction == "area") return areaPerimeterQuestion("Rectangle A: l " + a + ", w " + b + " =", area, "rectangle area, length " + a + ", width " + b, "rectangle-area");
    if(direction == "perimeter") return areaPerimeterQuestion("Rectangle P: l " + a + ", w " + b + " =", perimeter, "rectangle perimeter, length " + a + ", width " + b, "rectangle-perimeter");
    if(direction == "reverse-area") return areaPerimeterQuestion("Rectangle: A " + area + ", l " + a + ", w =", b, "rectangle area " + area + ", length " + a + ", find width", "rectangle-reverse-area");
    return areaPerimeterQuestion("Rectangle: P " + perimeter + ", l " + a + ", w =", b, "rectangle perimeter " + perimeter + ", length " + a + ", find width", "rectangle-reverse-perimeter");
  }

  if(shape == "triangle"){
    b = areaPerimeterRandom(min, max);
    h = areaPerimeterRandom(min, max);
    if((b * h) % 2 != 0) h++;
    area = b * h / 2;
    let sides = areaPerimeterTriangleSides(max);
    perimeter = sides[0] + sides[1] + sides[2];
    if(direction == "area") return areaPerimeterQuestion("Triangle A: b " + b + ", h " + h + " =", area, "triangle area, base " + b + ", height " + h, "triangle-area");
    if(direction == "perimeter") return areaPerimeterQuestion("Triangle P: sides " + sides.join(", ") + " =", perimeter, "triangle perimeter, sides " + sides.join(", "), "triangle-perimeter");
    if(direction == "reverse-area") return areaPerimeterQuestion("Triangle: A " + area + ", b " + b + ", h =", h, "triangle area " + area + ", base " + b + ", find height", "triangle-reverse-area");
    return areaPerimeterQuestion("Triangle: P " + perimeter + ", sides " + sides[0] + ", " + sides[1] + ", ? =", sides[2], "triangle perimeter " + perimeter + ", two sides " + sides[0] + " and " + sides[1] + ", find the third", "triangle-reverse-perimeter");
  }

  if(shape == "parallelogram"){
    b = areaPerimeterRandom(min + 1, max);
    h = areaPerimeterRandom(min, Math.max(min, max - 1));
    s = areaPerimeterRandom(min, max);
    area = b * h;
    perimeter = 2 * (b + s);
    if(direction == "area") return areaPerimeterQuestion("Parallelogram A: b " + b + ", h " + h + " =", area, "parallelogram area, base " + b + ", height " + h, "parallelogram-area");
    if(direction == "perimeter") return areaPerimeterQuestion("Parallelogram P: sides " + b + ", " + s + " =", perimeter, "parallelogram perimeter, sides " + b + " and " + s, "parallelogram-perimeter");
    if(direction == "reverse-area") return areaPerimeterQuestion("Parallelogram: A " + area + ", b " + b + ", h =", h, "parallelogram area " + area + ", base " + b + ", find height", "parallelogram-reverse-area");
    return areaPerimeterQuestion("Parallelogram: P " + perimeter + ", side " + b + ", other =", s, "parallelogram perimeter " + perimeter + ", one side " + b + ", find the other", "parallelogram-reverse-perimeter");
  }

  if(shape == "trapezium"){
    let triples = level == "hard" ? [[3,4,5], [5,12,13], [8,15,17]] : [[3,4,5]];
    let triple = triples[areaPerimeterRandom(0, triples.length - 1)];
    a = areaPerimeterRandom(min, Math.max(min, max - 2));
    b = a + 2 * triple[0];
    h = triple[1];
    let leg = triple[2];
    area = (a + b) * h / 2;
    perimeter = a + b + 2 * leg;
    if(direction == "area") return areaPerimeterQuestion("Trapezium A: parallel " + a + ", " + b + "; h " + h + " =", area, "trapezium area, parallel sides " + a + " and " + b + ", height " + h, "trapezium-area");
    if(direction == "perimeter") return areaPerimeterQuestion("Trapezium P: sides " + a + ", " + b + ", " + leg + ", " + leg + " =", perimeter, "trapezium perimeter, sides " + a + ", " + b + ", " + leg + ", " + leg, "trapezium-perimeter");
    if(direction == "reverse-area") return areaPerimeterQuestion("Trapezium: A " + area + ", parallel " + a + ", " + b + ", h =", h, "trapezium area " + area + ", parallel sides " + a + " and " + b + ", find height", "trapezium-reverse-area");
    return areaPerimeterQuestion("Trapezium: P " + perimeter + ", sides " + a + ", " + b + ", " + leg + ", ? =", leg, "trapezium perimeter " + perimeter + ", find the missing side", "trapezium-reverse-perimeter");
  }

  if(shape == "rhombus"){
    let d1 = 2 * areaPerimeterRandom(min, Math.max(min, Math.floor(max / 2)));
    let d2 = areaPerimeterRandom(min, max);
    s = areaPerimeterRandom(min, max);
    area = d1 * d2 / 2;
    perimeter = 4 * s;
    if(direction == "area") return areaPerimeterQuestion("Rhombus A: diagonals " + d1 + ", " + d2 + " =", area, "rhombus area, diagonals " + d1 + " and " + d2, "rhombus-area");
    if(direction == "perimeter") return areaPerimeterQuestion("Rhombus P: side " + s + " =", perimeter, "rhombus perimeter, side " + s, "rhombus-perimeter");
    if(direction == "reverse-area") return areaPerimeterQuestion("Rhombus: A " + area + ", diagonal " + d1 + ", other =", d2, "rhombus area " + area + ", one diagonal " + d1 + ", find the other", "rhombus-reverse-area");
    return areaPerimeterQuestion("Rhombus: P " + perimeter + ", side =", s, "rhombus perimeter " + perimeter + ", find the side", "rhombus-reverse-perimeter");
  }

  let multiplierMax = level == "easy" ? 2 : level == "medium" ? 3 : 4;
  let radius = shape == "quarter circle" ? 14 * areaPerimeterRandom(1, multiplierMax) : 7 * areaPerimeterRandom(1, multiplierMax);
  let pi = 22 / 7;
  if(shape == "circle"){
    area = pi * radius * radius;
    perimeter = 2 * pi * radius;
  }
  else if(shape == "semicircle"){
    area = pi * radius * radius / 2;
    perimeter = pi * radius + 2 * radius;
  }
  else{
    area = pi * radius * radius / 4;
    perimeter = pi * radius / 2 + 2 * radius;
  }

  let title = shape.charAt(0).toUpperCase() + shape.slice(1);
  let perimeterName = shape == "circle" ? "C" : "total P";
  if(direction == "area") return areaPerimeterQuestion(title + " A (pi=22/7): r " + radius + " =", area, shape + " area, pi is twenty two over seven, radius " + radius, shape + "-area");
  if(direction == "perimeter") return areaPerimeterQuestion(title + " " + perimeterName + " (pi=22/7): r " + radius + " =", perimeter, shape + " total perimeter, pi is twenty two over seven, radius " + radius, shape + "-perimeter");
  if(direction == "reverse-area") return areaPerimeterQuestion(title + " (pi=22/7): A " + areaPerimeterClean(area) + ", r =", radius, shape + " area " + areaPerimeterClean(area) + ", find radius", shape + "-reverse-area");
  return areaPerimeterQuestion(title + " (pi=22/7): " + perimeterName + " " + areaPerimeterClean(perimeter) + ", r =", radius, shape + " perimeter " + areaPerimeterClean(perimeter) + ", find radius", shape + "-reverse-perimeter");
}

function addAreaPerimeterProblem(main=false, self=areaPerimeterPreset, name=null){
  let question = main
    ? buildAreaPerimeterQuestion(self, { shape: "square", direction: "area" })
    : buildAreaPerimeterQuestion(self);
  problemlist.push([name, [question.prompt, question.answer, question.speech, question.caseName]]);
  if(recentduplicate()) return;

  let problem = document.createElement("p");
  problem.innerHTML = question.prompt;
  problem.classList.add("problem");
  problem.classList.add("geometryproblem");
  if(main) problem.id = "mainproblem";
  document.getElementsByClassName("mainproblems")[0].appendChild(problem);
  return problem;
}

function areaPerimeterType(){
  let input = document.getElementsByClassName("maininput")[0];
  let filtered = "";
  let hasDecimal = false;
  for(let character of input.value){
    if(character >= "0" && character <= "9") filtered += character;
    else if(character == "." && !hasDecimal){
      filtered += character;
      hasDecimal = true;
    }
  }
  input.value = filtered;
}

function areaPerimeterAnswer(problem){
  return problem[1];
}

function areaPerimeterAnswerText(answer){
  return String(areaPerimeterClean(answer));
}

function areaPerimeterValidate(answer, inputnumber){
  let entered = Number(inputnumber);
  return Number.isFinite(entered) && Math.abs(answer - entered) < 0.000001;
}

function areaPerimeterSpeech(problem){
  return problem[2];
}
