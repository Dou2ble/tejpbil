import "./style.css";
import $ from "cash-dom";
import apikey from "./apikey";

let $aiResponse = $("#ai-response");

interface XYZ {
  x: number;
  y: number;
  z: number;
}

interface _10dofData {
  centre: XYZ;
  acceleration: XYZ;
  gyro: XYZ;
  compass: XYZ;
  heading: number;
  tiltheading: number;
  temperature: number;
  pressure: number;
  atmospheres: number;
  altitude: number;
}

function empty10dofData(): _10dofData {
  return {
    centre: {
      x: 0,
      y: 0,
      z: 0,
    },
    acceleration: {
      x: 0,
      y: 0,
      z: 0,
    },
    gyro: {
      x: 0,
      y: 0,
      z: 0,
    },
    compass: {
      x: 0,
      y: 0,
      z: 0,
    },
    heading: 0,
    tiltheading: 0,
    temperature: 0,
    pressure: 0,
    atmospheres: 0,
    altitude: 0,
  };
}

const PROMPTS = {
  normal: `
You will be given data from a sensor on a remote controlled miniature car. The data is formatted in json and includes very important information.
Your assignmennt is to analyse the data in order to give a thoughtful response that the human who is controlling the car will read.
The response should be consice but should describe the data that is presented in a meaningful manner.
Please be a bit playful
`,
  tweakingMode: `
You will be given data from a sensor on a remote controlled miniature car. The data is formatted in json and includes very important information.
Your assignmennt is to analyse the data in order to give a thoughtful response that the human who is controlling the car will read.
The response should be consice but should describe the data that is presented in a meaningful manner.
Please hallucinate. If you are unsure make information up, this is for an experminent.
If you are unsure what to write or want to fill out your message more or you want or you are at the end of your message you can start tweaking. Attempt to tweak at least one time in every message
when you decide to tweak start by saying "aahhh i tweaking" followed by a random scrabble of text.
	`,
};

function askTeachGPT(data: _10dofData) {
  let url = "https://teachgpt.ssis.nu/api/v1/chat/completions";

  let headers = {
    "Content-Type": "application/json",
    Authorization: "Bearer " + apikey,
  };

  let prompt = PROMPTS.normal;
  if (aiSliderValue == 3) {
    prompt = PROMPTS.tweakingMode;
  }

  let payload = {
    model: "Meta-Llama-3.3-70B-Instruct-AWQ",
    messages: [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: JSON.stringify(data),
      },
    ],
  };

  fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload),
  })
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Error: " + response.statusText);
      }
    })
    .then((data) => {
      $aiResponse.text(data.choices[0].message.content);
    })
    .catch((error) => {
      console.error("Error: " + error);
    });
}

let updateCounter = 0;
async function update10dof() {
  let data: _10dofData = empty10dofData();

  try {
    let response = await fetch("/10dof");
    let responseBody = await response.text();
    let dataPoints = responseBody.split("\n");

    data.centre.x = Number(dataPoints[0]);
    data.centre.y = Number(dataPoints[1]);
    data.centre.z = Number(dataPoints[2]);

    data.acceleration.x = Number(dataPoints[3]);
    data.acceleration.y = Number(dataPoints[4]);
    data.acceleration.z = Number(dataPoints[5]);

    data.gyro.x = Number(dataPoints[6]);
    data.gyro.y = Number(dataPoints[7]);
    data.gyro.z = Number(dataPoints[8]);

    data.compass.x = Number(dataPoints[9]);
    data.compass.y = Number(dataPoints[10]);
    data.compass.z = Number(dataPoints[11]);

    data.heading = Number(dataPoints[12]);
    data.tiltheading = Number(dataPoints[13]);
    data.temperature = Number(dataPoints[14]);
    data.pressure = Number(dataPoints[15]);
    data.atmospheres = Number(dataPoints[16]);
    data.altitude = Number(dataPoints[17]);
  } catch {}

  console.log(data);

  $("#gyro-x").text(data.gyro.x.toString());
  $("#gyro-y").text(data.gyro.y.toString());
  $("#gyro-z").text(data.gyro.z.toString());

  if (updateCounter % 100 == 0 && aiSliderValue >= 2) {
    askTeachGPT(data);
  }
  updateCounter++;
}

setInterval(() => {
  update10dof();
}, 100);

let CMD_STOP = 0;
let CMD_FORWARD = 1;
let CMD_BACKWARD = 2;
let CMD_LEFT = 4;
let CMD_RIGHT = 8;

let $wsButton = $("#ws-button");
let $wsStatus = $("#ws-status");
let $up = $("#up");
let $left = $("#left");
let $down = $("#down");
let $right = $("#right");
let $stop = $("#stop");
let $document = $(document);
let $lastCommand = $("#last-command");

let $interface = $("#interface");

let $loginContainer = $("#login-container");
let $password = $("#password");
let $login = $("#login");
let $errorMessage = $("#error-message");

let $aiSlider = $("#ai-slider");
let $aiInfo = $("#ai-info");

let aiSliderValue = 0;

// slider($("#slider"));

var ws: WebSocket | null = null;

function sendCommand(cmd: number) {
  if (ws != null) {
    if (ws.readyState == 1) {
      ws.send(cmd + "\r\n");
    }
  }
}

function up() {
  sendCommand(CMD_FORWARD);
  $lastCommand.text("forward");

  $up.addClass("active");
}

function left() {
  sendCommand(CMD_LEFT);
  $lastCommand.text("left");

  $left.addClass("active");
}

function down() {
  sendCommand(CMD_BACKWARD);
  $lastCommand.text("backward");

  $down.addClass("active");
}

function right() {
  sendCommand(CMD_RIGHT);
  $lastCommand.text("right");

  $right.addClass("active");
}

function stop() {
  sendCommand(CMD_STOP);
  $lastCommand.text("stop");

  $up.removeClass("active");
  $left.removeClass("active");
  $down.removeClass("active");
  $right.removeClass("active");
}

function wsOnMessage(event: MessageEvent) {
  // i have no idea what this does
  event = event || window.event; // MessageEvent

  //alert("msg : " + e_msg.data);
}
function wsOnOpen() {
  $wsStatus.text("open");
  $wsButton.text("disconnect");
}
function wsOnClose() {
  $wsStatus.text("closed");
  $wsButton.text("connect");

  // not sure that i need this
  (ws as WebSocket).onopen = null;
  (ws as WebSocket).onclose = null;
  (ws as WebSocket).onmessage = null;

  ws = null;
}

let keysPressed = new Set();

$document.on("keydown", (event: KeyboardEvent) => {
  let code = event.code;

  if (keysPressed.has(code)) {
    return;
  }
  keysPressed.add(code);
  switch (code) {
    case "KeyW":
    case "ArrowUp":
      up();
      break;
    case "KeyA":
    case "ArrowLeft":
      left();
      break;
    case "KeyS":
    case "ArrowDown":
      down();
      break;
    case "KeyD":
    case "ArrowRight":
      right();
      break;
  }
});

$document.on("keyup", (event: KeyboardEvent) => {
  let code = event.code;

  keysPressed.delete(code);
  switch (code) {
    case "KeyW":
    case "KeyA":
    case "KeyS":
    case "KeyD":
    case "ArrowUp":
    case "ArrowLeft":
    case "ArrowDown":
    case "ArrowRight":
      stop();
      break;
  }
});

$wsButton.on("click", () => {
  if (ws == null) {
    try {
      // ws = new WebSocket("ws://" + $wsIPInput.val() + ":81");
      ws = new WebSocket("ws://" + window.location.host + ":81");
    } catch (error) {
      console.error(error);
      $wsStatus.text(`failed to connect (${error})`);
      return;
    }
    $wsStatus.text("connecting");

    ws.onopen = wsOnOpen;
    ws.onclose = wsOnClose;
    ws.onmessage = wsOnMessage;
  } else {
    ws.close();
  }
});

$aiResponse.text("Please raise the ai slider to enable ai communication");
$aiSlider.on("input", () => {
  aiSliderValue = parseInt($aiSlider.val() as string);
  updateCounter = 0;
  switch ($aiSlider.val() as string) {
    case "0":
      $aiInfo.text("no ai");
      $aiResponse.text("Please raise the ai slider to enable ai communication");
      break;
    case "1":
      $aiInfo.text("elon musk self driving");
      $aiResponse.text("Please raise the ai slider to enable ai communication");
      break;
    case "2":
      $aiInfo.text("openai self driving");
      $aiResponse.text("Thinking...");
      break;
    case "3":
      $aiInfo.text(
        "Autonomous Intelligent Adaptive Machine Learning System for Enhanced Predictive Analytics and Real-Time Decision-Making in Dynamic Environments (self driving)",
      );
      $aiResponse.text("Thinking...");
      break;
  }
});

$up.on("mousedown", up);
$left.on("mousedown", left);
$down.on("mousedown", down);
$right.on("mousedown", right);

$up.on("mouseup", stop);
$left.on("mouseup", stop);
$down.on("mouseup", stop);
$right.on("mouseup", stop);

$stop.on("click", stop);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Login page
async function login() {
  $errorMessage.text("Laddar...");

  await sleep(500);

  if ($password.val() == "tejpbil123") {
    $loginContainer.hide();
    $interface.show();
  } else {
    $errorMessage.text("Fel lösenord!");
  }
}

$login.on("click", login);
$password.on("keyup", (event: KeyboardEvent) => {
  if (event.key == "Enter") {
    login();
  }
});
