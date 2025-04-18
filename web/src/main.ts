import "./style.css";
import $ from "cash-dom";

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

  $("#compass-x").text(data.compass.x.toString());
  $("#compass-y").text(data.compass.y.toString());
  $("#compass-z").text(data.compass.z.toString());
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

$aiSlider.on("input", () => {
  switch ($aiSlider.val() as string) {
    case "0":
      $aiInfo.text("no ai");
      break;
    case "1":
      $aiInfo.text("elon musk self driving");
      break;
    case "2":
      $aiInfo.text("openai self driving");
      break;
    case "3":
      $aiInfo.text(
        "Autonomous Intelligent Adaptive Machine Learning System for Enhanced Predictive Analytics and Real-Time Decision-Making in Dynamic Environments (self driving)",
      );
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
