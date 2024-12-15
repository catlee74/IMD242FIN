//손 감지와 도형잡기는 아래 강의를 참고했습니다
//p5.js Coding Tutorial | Interactive Fridge Magnets (with ml5.js - handPose)
//유튜브 링크: https://youtu.be/72pAzuD8tqE?si=manU6aHcHfp1_1N3

// 종횡비를 고정하고 싶을 경우: 아래 두 변수를 0이 아닌 원하는 종, 횡 비율값으로 설정.
// 종횡비를 고정하고 싶지 않을 경우: 아래 두 변수 중 어느 하나라도 0으로 설정.
const aspectW = 4;
const aspectH = 3;
// html에서 클래스명이 container-canvas인 첫 엘리먼트: 컨테이너 가져오기.
const container = document.body.querySelector('.container-canvas');
// 필요에 따라 이하에 변수 생성.

const { Engine, Composites, Common, Composite, Bodies, Body, Vector } = Matter;
let anyEngine, world;
let stack,
  walls = [];

let video;
let handPose;
let hands = [];

//손가락 잡는 거
let holding = false;
let heldBody = null;

let reverseGravity = false;

function preload() {
  handPose = ml5.handPose({ flipped: true });
}

function setup() {
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  if (aspectW === 0 || aspectH === 0) {
    createCanvas(containerW, containerH).parent(container);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 클 경우:
  // 컨테이너의 세로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else if (containerW / containerH > aspectW / aspectH) {
    createCanvas((containerH * aspectW) / aspectH, containerH).parent(
      container
    );
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스를 생성하고, 컨테이너의 자녀로 설정.
  else {
    createCanvas(containerW, (containerW * aspectH) / aspectW).parent(
      container
    );
  }
  init();
  // createCanvas를 제외한 나머지 구문을 여기 혹은 init()에 작성.

  video = createCapture(VIDEO, { flipped: true });
  video.size(width, height);
  video.hide();

  anyEngine = Engine.create();
  world = anyEngine.world;

  //matter 도형 추가
  stack = Composites.stack(width * 0.25, 20, 8, 4, 0, 0, function (x, y) {
    //도형이 배치될 x좌표,도형이 배치될 y좌표,x축으로 배치될 도형 개수, y축으로 배치될 도형 개수, 도형간의 x축 간격, 도형간의 y축 간격
    let sides = Math.round(Common.random(1, 8));
    //도형 몇개의 변 가질지 랜덤으로 정함

    //matter.js 코드 정리를 하고 p5js코드에 넣으니 오류가 나서 코드를 변형해달라고 gpt에게 부탁, if문 3개로 나눠놓은 코드를 제시하길래 else if, else로 정리했습니다.
    let chamfer = null;
    //도형 모서리 둥글게 만들기 위한 변수수. 초기값은 null
    if (sides > 2 && Common.random() > 0.7) {
      //삼각형 이상일 때, 30%의 확률로
      chamfer = {
        radius: 10,
        //모서리 둥글게
      };
    } else if (Math.round(Common.random(0, 1))) {
      //50%의 확률
      return Bodies.rectangle(
        x,
        y,
        Common.random(70, 100),
        Common.random(70, 100),
        { chamfer: chamfer }
        //조건이 참이면 사각형
      );
    } else {
      return Bodies.polygon(x, y, sides, Common.random(40, 60), {
        //기존 (25,50)
        chamfer: chamfer,
        //조건 거짓이면 다각형
      });
    }
  });
  Composite.add(world, stack);

  //상하좌우 벽
  //교수님 올려주신 동영상을 보고 했습니다.
  walls.push(
    Bodies.rectangle(width * 0.5, height, 10000, 50, { isStatic: true })
  );
  walls.push(Bodies.rectangle(width * 0.5, 0, 10000, 50, { isStatic: true }));
  walls.push(
    Bodies.rectangle(width, height * 0.5, 50, 10000, { isStatic: true })
  );
  walls.push(Bodies.rectangle(0, height, 50, 10000, { isStatic: true }));
  Composite.add(world, walls);

  //비디오를 통해 실시간으로 손 감지
  handPose.detectStart(video, gotHands);
}

// windowResized()에서 setup()에 준하는 구문을 실행해야할 경우를 대비해 init이라는 명칭의 함수를 만들어 둠.
function init() {}

function draw() {
  // clear();

  image(video, 0, 0, width, height);
  background(0, 150);
  Engine.update(anyEngine);

  //gpt 사용
  noStroke();
  for (let body of stack.bodies) {
    if (body.circleRadius) {
      // 원

      fill('#E85234');
      // fill('#FF855A');
    } else if (body.vertices && body.vertices.length === 3) {
      // 세모
      fill('#96ADD6');
    } else if (body.vertices && body.vertices.length === 4) {
      // 네모
      fill('#E8E4C8');
    } else if (body.vertices) {
      // 다각형
      fill('#F9B8AF');
    }

    drawBody(body);
  }
  // 벽 그리기
  for (let wall of walls) {
    fill('#F2EEE9');
    drawBody(wall);
  }

  if (hands.length > 0) {
    let hand0 = hands[0];
    let hand1 = hands[1];
    if (hand0) {
      //검지
      let index0 = hands[0].keypoints[8];
      //엄지
      let thumb0 = hands[0].keypoints[4];

      //여기서부터 patt vira의 강의에서 나온 코드를 복사한 후
      //gpt에게 엄지와 검지가 닿을 때 텍스트 박스를 잡을 수 있는 원리를 분석해 달라고 하고,
      //지금 p5js에 나온 코드에 적용할 수 있게 변환해달라고 했습니다.
      let fingerX = (index0.x + thumb0.x) / 2;
      let fingerY = (index0.y + thumb0.y) / 2;
      //두 손가락 중앙 위치 계산
      let distBetweenFingers = dist(index0.x, index0.y, thumb0.x, thumb0.y);

      if (index0.y < height / 3) {
        reverseGravity = true; // 상단에 있으면 중력 반전
      } else if (index0.y > (height * 2) / 3) {
        reverseGravity = false; // 하단에 있으면 원래 중력으로
      }

      //엄지 검지 사이 거리 계산
      for (let body of stack.bodies) {
        let bodyX = body.position.x;
        let bodyY = body.position.y;

        let distToBody = dist(fingerX, fingerY, bodyX, bodyY);

        // 손가락 닿음 조건
        if (distBetweenFingers < 40 && distToBody < 40) {
          if (!holding) {
            holding = true;
            heldBody = body;
          }
        }
        if (holding && heldBody) {
          Body.setPosition(heldBody, { x: fingerX, y: fingerY });
        }

        // 손가락을 떼면 도형을 놓음
        //손가락 사이 거리 45px 이상일 때때
        if (distBetweenFingers > 45 && holding) {
          holding = false;
          heldBody = null;
        }
      }

      //검지
      fill(255, 0, 0, 100);
      stroke(255, 0, 0);
      strokeWeight(2);
      ellipse(index0.x, index0.y, 16, 16);

      //엄지
      //gpt사용
      if (distBetweenFingers < 40) {
        fill(255, 0, 0, 100);
        stroke(255, 0, 0);
      } else {
        fill(255, 100);
        stroke(255);
      }
      strokeWeight(2);
      ellipse(thumb0.x, thumb0.y, 16, 16);
    }

    //두 번째 손가락의 검지의 y위치에 따라 중력이 바뀌도록 함
    //gpt사용
    if (hand1) {
      let index1 = hand1.keypoints[8];
      if (index1.y < height * 0.5) {
        reverseGravity = true;
      } else {
        reverseGravity = false;
      }
      if (reverseGravity) {
        anyEngine.world.gravity.y = -1;
      } else {
        anyEngine.world.gravity.y = 1;
      }
      fill(0, 255, 0, 100);
      stroke(0, 255, 0);
      strokeWeight(2);
      ellipse(index1.x, index1.y, 16, 16);
    }
  }
}

//gpt사용
//matter도형 그리기
function drawBody(body) {
  const vertices = body.vertices;
  beginShape();
  for (let v of vertices) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);
}

//gotHands는 matter그린 다음에 있어야 충돌이 안생겨서
//손 감지될 때 도형이 안보이고 하는 문제가 안생긴다
function gotHands(results) {
  //이 친구가 있어야 손 데이터를 받아서 화면에 표시 가능
  hands[0] = results[0];
  hands[1] = results[1];
  // hands = results;
}

function windowResized() {
  // 컨테이너의 현재 위치, 크기 등의 정보 가져와서 객체구조분해할당을 통해 너비, 높이 정보를 변수로 추출.
  const { width: containerW, height: containerH } =
    container.getBoundingClientRect();
  // 종횡비가 설정되지 않은 경우:
  // 컨테이너의 크기와 일치하도록 캔버스 크기를 조정.
  if (aspectW === 0 || aspectH === 0) {
    resizeCanvas(containerW, containerH);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 클 경우:
  // 컨테이너의 세로길이에 맞춰 종횡비대로 캔버스 크기를 조정.
  else if (containerW / containerH > aspectW / aspectH) {
    resizeCanvas((containerH * aspectW) / aspectH, containerH);
  }
  // 컨테이너의 가로 비율이 설정한 종횡비의 가로 비율보다 작거나 같을 경우:
  // 컨테이너의 가로길이에 맞춰 종횡비대로 캔버스 크기를 조정.
  else {
    resizeCanvas(containerW, (containerW * aspectH) / aspectW);
  }
  // 위 과정을 통해 캔버스 크기가 조정된 경우, 다시 처음부터 그려야할 수도 있다.
  // 이런 경우 setup()의 일부 구문을 init()에 작성해서 여기서 실행하는게 편리하다.
  // init();

  Body.setPosition(walls[0], Vector.create(width * 0.5, height));
  Body.setPosition(walls[2], Vector.create(width, height * 0.5));
}
