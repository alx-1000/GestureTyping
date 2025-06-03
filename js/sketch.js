// ジェスチャーの種類
//one, two, three, four, five, zero
function getCode(left_gesture, right_gesture) {
  let code_array = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "zero": 0,
  }
  let left_code = code_array[left_gesture];
  let right_code = code_array[right_gesture];
  // left_codeとright_codeを文字として結合
  let code = String(left_code) + String(right_code);
  return code;
}

// 入力サンプル文章 
let sample_texts = [
  "the quick brown fox jumps over the lazy dog",
];

// ゲームの状態を管理する変数
// notready: ゲーム開始前 （カメラ起動前）
// ready: ゲーム開始前（カメラ起動後）
// playing: ゲーム中
// finished: ゲーム終了後
// ready, playing, finished
let game_mode = {
  now: "notready",
  previous: "notready",
};

let game_start_time = 0;
let gestures_results;
let cam = null;
let p5canvas = null;

let cycling = false;
let cycleChars = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
let cycleIndex = 0;
let cycleInterval = null;
let currentCycleChar = '';

let cycleCharsMap = {
  'one': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
  'two': ['h', 'i', 'j', 'k', 'l', 'm', 'n'],
  'three': ['o', 'p', 'q', 'r', 's', 't', 'u'],
  'four': ['v', 'w', 'x', 'y', 'z'],
};

function startCycle(right_gesture) {
  if (cycling) return;
  cycling = true;
  // サイクル対象文字を決定
  cycleChars = cycleCharsMap[right_gesture] || cycleCharsMap['one'];
  cycleIndex = 0;
  currentCycleChar = cycleChars[cycleIndex];
  // 入力欄の確定済みテキストを保存（未設定時のみ）
  const input = document.querySelector('input');
  if (input && (!input.dataset || !input.dataset.confirmedText)) {
    if (!input.dataset) input.dataset = {};
    input.dataset.confirmedText = input.value;
  }
  updateCycleCharDisplay();
}

function updateCycleOnOneGesture() {
  if (!cycling) return;
  cycleIndex = (cycleIndex + 1) % cycleChars.length;
  currentCycleChar = cycleChars[cycleIndex];
  updateCycleCharDisplay();
}

function stopCycle() {
  cycling = false;
  if (cycleInterval) clearInterval(cycleInterval);
  cycleInterval = null;
  currentCycleChar = '';
  updateCycleCharDisplay();
}

function resetCycle() {
  if (cycling) {
    cycleIndex = 0;
    currentCycleChar = cycleChars[cycleIndex];
    updateCycleCharDisplay();
  }
}

function updateCycleCharDisplay() {
  // 入力欄には確定済み文字列のみ表示
  const input = document.querySelector('input');
  if (input) {
    // サイクル再開時にinput.dataset.confirmedTextが未設定の場合、input.valueを反映
    if (!input.dataset.confirmedText) {
      input.dataset.confirmedText = input.value || '';
    }
    let confirmed = input.dataset ? (input.dataset.confirmedText || '') : '';
    input.value = confirmed;
    input.style.color = 'black';
  }
  // サイクル中の文字はcycleChar要素に大きく赤色で表示
  let elem = document.getElementById('cycleChar');
  if (elem) {
    if (cycling) {
      elem.innerText = currentCycleChar;
      elem.style.color = 'red';
    } else {
      elem.innerText = '';
      elem.style.color = '#0077cc';
    }
  }
  // サイクル状態をコンソールに表示
  console.log('cycling:', cycling, 'currentCycleChar:', currentCycleChar, 'cycleIndex:', cycleIndex);
}

function setup() {
  p5canvas = createCanvas(320, 240);
  p5canvas.parent('#canvas');

  // 画面にサイクル中の文字を表示する要素を追加
  if (!document.getElementById('cycleChar')) {
    let charElem = document.createElement('div');
    charElem.id = 'cycleChar';
    charElem.style.position = 'fixed'; // fixedで常に画面下部中央
    charElem.style.bottom = '150px'; // 以前より上に表示
    charElem.style.left = '50%';
    charElem.style.transform = 'translateX(-50%)';
    charElem.style.fontSize = '64px';
    charElem.style.fontWeight = 'bold';
    charElem.style.color = 'red';
    charElem.style.background = 'rgba(255,255,255,0.8)';
    charElem.style.padding = '8px 32px';
    charElem.style.borderRadius = '16px';
    charElem.style.zIndex = '9999';
    document.body.appendChild(charElem);
  }

  let lastLeftFive = false;
  let lastRightOne = false;
  let lastLeftZero = false;
  let rightOneStartTime = 0;
  let lastCycleUpdateTime = 0;
  let lastBothFive = false;
  let bothFiveStartTime = 0;
  let lastBothTwo = false;
  let bothTwoStartTime = 0;

  gotGestures = function (results) {
    gestures_results = results;
    let left_gesture = null;
    let right_gesture = null;
    if (results.gestures.length == 2) {
      if (results.handedness[0][0].categoryName == "Left") {
        left_gesture = results.gestures[0][0].categoryName;
        right_gesture = results.gestures[1][0].categoryName;
      } else {
        left_gesture = results.gestures[1][0].categoryName;
        right_gesture = results.gestures[0][0].categoryName;
      }
    }
    // 右手one～four & 左手zeroでサイクル開始・維持
    let rightCycleGestures = ['one', 'two', 'three', 'four'];
    if (rightCycleGestures.includes(right_gesture) && left_gesture === 'zero') {
      if (!lastRightOne || !lastLeftZero || cycleChars !== cycleCharsMap[right_gesture]) {
        startCycle(right_gesture);
        currentCycleChar = cycleChars[cycleIndex];
        rightOneStartTime = millis();
        lastCycleUpdateTime = millis();
      } else {
        let now = millis();
        if (now - lastCycleUpdateTime >= 400) { // 0.4秒周期に変更
          updateCycleOnOneGesture();
          lastCycleUpdateTime = now;
        }
      }
      lastRightOne = true;
      lastLeftZero = true;
    } else {
      // five/oneで確定した直後はstopCycleしない
      // 左手がnoneの場合はサイクルを止めない
      if (left_gesture !== 'five' && left_gesture !== 'one' && left_gesture !== 'none' && (lastRightOne || lastLeftZero)) {
        stopCycle();
      }
      lastRightOne = false;
      lastLeftZero = false;
    }
    // 左手fiveで確定（サイクル中のみ）
    if (left_gesture === 'five') {
      if (!lastLeftFive && cycling) {
        const charToInput = currentCycleChar;
        console.log('charToInput:', charToInput);
        typeChar(charToInput);
        // fiveで確定したときだけstopCycle
        stopCycle();
      }
      lastLeftFive = true;
    } else {
      lastLeftFive = false;
    }
    // 両手fiveで1秒続いたらスペース
    if (left_gesture === 'five' && right_gesture === 'five') {
      if (!lastBothFive) {
        bothFiveStartTime = millis();
      } else {
        if (millis() - bothFiveStartTime >= 1000) {
          typeChar(' ');
          bothFiveStartTime = millis(); // 連続でスペースを打つ場合はリセット
        }
      }
      lastBothFive = true;
    } else {
      lastBothFive = false;
    }
    // 両手twoで1秒続いたらbackspace
    if (left_gesture === 'two' && right_gesture === 'two') {
      if (!lastBothTwo) {
        bothTwoStartTime = millis();
      } else {
        if (millis() - bothTwoStartTime >= 1000) {
          typeChar('backspace');
          bothTwoStartTime = millis(); // 連続で消す場合はリセット
        }
      }
      lastBothTwo = true;
    } else {
      lastBothTwo = false;
    }

    if (results.gestures.length == 2) {
      if (game_mode.now == "ready" && game_mode.previous == "notready") {
        // ゲーム開始前の状態から、カメラが起動した後の状態に変化した場合
        game_mode.previous = game_mode.now;
        game_mode.now = "playing";
        const input = document.querySelector('input');
        if (input) {
          input.value = "";
          input.dataset.confirmedText = '';
          input.style.color = 'black';
        }
        game_start_time = millis(); // ゲーム開始時間を記録
      }
      // getCode, getCharacterの呼び出しを削除
      // let code = getCode(left_gesture, right_gesture);
      // let c = getCharacter(code);

      // let now = millis();
      // if (c === lastChar) {
      //   if (now - lastCharTime > 1000) {
      //     // 1秒以上cが同じ値である場合の処理
      //     typeChar(c);
      //     lastCharTime = now;
      //   }
      // } else {
      //   lastChar = c;
      //   lastCharTime = now;
      // }
    }

  }
}

// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// ここから下は課題制作にあたって編集してはいけません。
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// 入力欄に文字を追加する場合は必ずこの関数を使用してください。
function typeChar(c) {
  if (c === "") {
    console.warn("Empty character received, ignoring.");
    return;
  }
  // inputにフォーカスする
  document.querySelector('input').focus();
  // 入力欄に文字を追加または削除する関数
  const input = document.querySelector('input');
  if (c === "backspace") {
    input.value = input.value.slice(0, -1);
  } else {
    input.value += c;
  }

  // ここで確定済みテキストも更新
  if (input.dataset) {
    input.dataset.confirmedText = input.value;
  }

  let inputValue = input.value;
  // #messageのinnerTextを色付けして表示
  const messageElem = document.querySelector('#message');
  const target = messageElem.innerText;
  let matchLen = 0;
  for (let i = 0; i < Math.min(inputValue.length, target.length); i++) {
    if (inputValue[i] === target[i]) {
      matchLen++;
    } else {
      break;
    }
  }
  const matched = target.slice(0, matchLen);
  const unmatched = target.slice(matchLen);
  console.log(`Matched: ${matched}, Unmatched: ${unmatched}`);
  messageElem.innerHTML =
    `<span style="background-color:lightgreen">${matched}</span><span style="background-color:transparent">${unmatched}</span>`;




  // もしvalueの値がsample_texts[0]と同じになったら、[0]を削除して、次のサンプル文章に移行する。配列長が0になったらゲームを終了する
  if (document.querySelector('input').value == sample_texts[0]) {
    sample_texts.shift(); // 最初の要素を削除
    console.log(sample_texts.length);
    if (sample_texts.length == 0) {
      // サンプル文章がなくなったらゲーム終了
      game_mode.previous = game_mode.now;
      game_mode.now = "finished";
      document.querySelector('input').value = "";
      const elapsedSec = ((millis() - game_start_time) / 1000).toFixed(2);
      document.querySelector('#message').innerText = `Finished: ${elapsedSec} sec`;
    } else {
      // 次のサンプル文章に移行
      document.querySelector('input').value = "";
      document.querySelector('#message').innerText = sample_texts[0];
    }
  }

}


function startWebcam() {
  // If the function setCameraStreamToMediaPipe is defined in the window object, the camera stream is set to MediaPipe.
  if (window.setCameraStreamToMediaPipe) {
    cam = createCapture(VIDEO);
    cam.hide();
    cam.elt.onloadedmetadata = function () {
      window.setCameraStreamToMediaPipe(cam.elt);
    }
    p5canvas.style('width', '100%');
    p5canvas.style('height', 'auto');
  }

  if (game_mode.now == "notready") {
    game_mode.previous = game_mode.now;
    game_mode.now = "ready";
    document.querySelector('#message').innerText = sample_texts[0];
    game_start_time = millis();
  }
}


function draw() {
  background(127);
  if (cam) {
    image(cam, 0, 0, width, height);
  }
  // 各頂点座標を表示する
  // 各頂点座標の位置と番号の対応は以下のURLを確認
  // https://developers.google.com/mediapipe/solutions/vision/hand_landmarker
  if (gestures_results) {
    if (gestures_results.landmarks) {
      for (const landmarks of gestures_results.landmarks) {
        for (let landmark of landmarks) {
          noStroke();
          fill(100, 150, 210);
          circle(landmark.x * width, landmark.y * height, 10);
        }
      }
    }

    // ジェスチャーの結果を表示する
    for (let i = 0; i < gestures_results.gestures.length; i++) {
      noStroke();
      fill(255, 0, 0);
      textSize(10);
      let name = gestures_results.gestures[i][0].categoryName;
      let score = gestures_results.gestures[i][0].score;
      let right_or_left = gestures_results.handednesses[i][0].hand;
      let pos = {
        x: gestures_results.landmarks[i][0].x * width,
        y: gestures_results.landmarks[i][0].y * height,
      };
      textSize(20);
      fill(0);
      textAlign(CENTER, CENTER);
      text(name, pos.x, pos.y);
    }
  }

  if (game_mode.now == "notready") {
    // 文字の後ろを白で塗りつぶす
    let msg = "Press the start button to begin";
    textSize(18);
    let tw = textWidth(msg) + 20;
    let th = 32;
    let tx = width / 2;
    let ty = height / 2;
    rectMode(CENTER);
    fill(255, 100);
    noStroke();
    rect(tx, ty, tw, th, 8);
    fill(0);
    textAlign(CENTER, CENTER);
    text(msg, tx, ty);
  }
  else if (game_mode.now == "ready") {
    let msg = "Waiting for gestures to start";
    textSize(18);
    let tw = textWidth(msg) + 20;
    let th = 32;
    let tx = width / 2;
    let ty = height / 2;
    rectMode(CENTER);
    fill(255, 100);
    noStroke();
    rect(tx, ty, tw, th, 8);
    fill(0);
    textAlign(CENTER, CENTER);
    text(msg, tx, ty);
  }
  else if (game_mode.now == "playing") {
    // ゲーム中のメッセージ
    let elapsedSec = ((millis() - game_start_time) / 1000).toFixed(2);
    let msg = `${elapsedSec} [s]`;
    textSize(18);
    let tw = textWidth(msg) + 20;
    let th = 32;
    let tx = width / 2;
    let ty = th;
    rectMode(CENTER);
    fill(255, 100);
    noStroke();
    rect(tx, ty, tw, th, 8);
    fill(0);
    textAlign(CENTER, CENTER);
    text(msg, tx, ty);
  }
  else if (game_mode.now == "finished") {
    // ゲーム終了後のメッセージ
    let msg = "Game finished!";
    textSize(18);
    let tw = textWidth(msg) + 20;
    let th = 32;
    let tx = width / 2;
    let ty = height / 2;
    rectMode(CENTER);
    fill(255, 100);
    noStroke();
    rect(tx, ty, tw, th, 8);
    fill(0);
    textAlign(CENTER, CENTER);
    text(msg, tx, ty);
  }

}