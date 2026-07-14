let difficultybuttons = ["easybutton", "mediumbutton", "hardbutton", "custombutton"];
let difficultynames = ["easy", "medium", "hard", "custom"];

let optiontimebuttons = ["15sbuttontime", "60sbuttontime", "120sbuttontime"];
let optiontimenames = [15000, 60000, 120000];

let problemmode = "timed";

function setdifficulty(difficulty){
  if(difficulty == "custom"){
    let keys = Object.keys(modes);
    for(let i = 0; i < keys.length; i++){
      if(modes[keys[i]].settingsgui != undefined && modes[keys[i]].settings.presets != undefined){
        if(modes[keys[i]].settingsgui.doneinit == false){
          modes[keys[i]].settingsgui.init(modes[keys[i]], false);
        }
        modes[keys[i]].settingsgui.setpreset(modes[keys[i]], "custom");
      }
    }
    selecteddifficulties = ["custom"];
    matchdifficulty();
    savedifficulty();
    init();
    return;
  }

  if(["easy", "medium", "hard"].indexOf(difficulty) == -1) return;
  if(selecteddifficulties.indexOf("custom") != -1) selecteddifficulties = [];

  let selectedIndex = selecteddifficulties.indexOf(difficulty);
  if(selectedIndex == -1){
    selecteddifficulties.push(difficulty);
  }
  else if(selecteddifficulties.length > 1){
    selecteddifficulties.splice(selectedIndex, 1);
  }

  matchdifficulty();
  savedifficulty();
  init();
}

function matchdifficulty(){
  let additionOnly = currentmode.length == 1 && currentmode[0] == "addition";
  if(additionOnly){
    selecteddifficulties = selecteddifficulties.filter(difficulty => difficulty != "easy");
    if(selecteddifficulties.length == 0) selecteddifficulties = ["medium"];
  }

  for(let i = 0; i < 3; i++){
    let button = document.getElementById(difficultybuttons[i]);
    if(button == null) continue;
    let selected = selecteddifficulties.indexOf(difficultynames[i]) != -1;
    button.classList.toggle("textselected", selected);
    button.setAttribute("aria-pressed", selected ? "true" : "false");
    button.disabled = additionOnly && difficultynames[i] == "easy";
  }

  let customButton = document.getElementById("custombutton");
  if(customButton != null){
    let customSelected = selecteddifficulties.indexOf("custom") != -1;
    customButton.classList.toggle("textselected", customSelected);
    customButton.setAttribute("aria-pressed", customSelected ? "true" : "false");
  }

  currentdifficulty = selecteddifficulties.join(" + ");
}


function settime(elem, time){

  if(problemmode == "timed"){
    console.log("YH");
    totaltime = time;
    totalproblems = null;
  }
  else{
    console.log("NH")
    totaltime = null;
    totalproblems = time;
  }


  let current = document.getElementById("timeselected");
  current.id = "";
  current.classList.remove("textselected");

  elem.id = "timeselected";
  elem.classList.add("textselected");

  if(elem.classList.contains("customtimebutton") == false){

    let yar = document.getElementsByClassName("customtimebutton")[0];
    yar.innerHTML = "custom";

  }


  init();

}

function customtimetype(event){

  let nums = "0123456789"

  let filtered = "";

  for(var i =0 ; i < event.target.value.length; i++){

    if(nums.indexOf(event.target.value[i]) != -1){
      filtered += event.target.value[i];
    }

  }

  event.target.value = filtered;

}

function customtimeblur(event){

  let value = parseInt(event.target.value);

  if(value == 0 || value+"" == "NaN"){

    event.target.value = "";

  }
  else if(problemmode == "problems" && value == 1){
    event.target.value = "";
  }
  else{
    event.target.value = value;
  }

}

function switchtime(mode){

  let buttons = ["customtimetimed", "customtimeproblems" ];

  let input = document.getElementById("customtimeinp");

  if(mode == "timed"){

    document.getElementById(buttons[1]).classList.remove("textselected");
    document.getElementById(buttons[0]).classList.add("textselected");

    input.setAttribute("placeholder", "Seconds...");

  }

  if(mode == "problems"){

    document.getElementById(buttons[0]).classList.remove("textselected");
    document.getElementById(buttons[1]).classList.add("textselected");

    input.setAttribute("placeholder", "Problems...");

  }

  problemmode = mode;

}


function showcustomtime(){

  let container = document.getElementById("customtimecontainer")

  container.style.display = "";


}

function closetimecontainer(event){

  if(event.target.id == "customtimecontainer"){
    customtimedone();
  }

}

function customtimedone(userInput=true){

  let input = document.getElementById("customtimeinp");

  let timevalue = null

  if(userInput){
    if(input.value == ""){
      switchtime("timed")
      timevalue = 15;
    }
    else{
      timevalue = parseInt(input.value);
    }
  }
  else{

    if(problemmode == "timed") timevalue = totaltime / 1000;
    else timevalue = totalproblems;

  }


  document.getElementById("customtimecontainer").style.display = "none"



  if(problemmode == "timed"){


    timevalue *= 1000;

    if(optiontimenames.indexOf(timevalue) != -1){
      let name = optiontimebuttons[optiontimenames.indexOf(timevalue)];
      let elem = document.getElementsByClassName(name)[0];
      settime(elem, timevalue);
    }
    else{
      let elem = document.getElementsByClassName("customtimebutton")[0];
      settime(elem, timevalue);

      let text = "custom\n" + (timevalue / 1000) +"s";

      if(text.length > 11){
        text = "custom"
      }

      elem.innerHTML = text;

    }
  }
  else{

    let elem = document.getElementsByClassName("customtimebutton")[0];
    settime(elem, timevalue);

    let text = "custom\n" + (timevalue);

    if(text.length > 11){
      text = "custom"
    }

    elem.innerHTML = text;

  }

}
