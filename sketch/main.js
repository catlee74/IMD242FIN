// 종횡비를 고정하고 싶을 경우: 아래 두 변수를 0이 아닌 원하는 종, 횡 비율값으로 설정.
// 종횡비를 고정하고 싶지 않을 경우: 아래 두 변수 중 어느 하나라도 0으로 설정.
const aspectW = 4;
const aspectH = 3;
// html에서 클래스명이 container-canvas인 첫 엘리먼트: 컨테이너 가져오기.
const container = document.body.querySelector('.container-canvas');
// 필요에 따라 이하에 변수 생성.

// const { Engine, Render, Runner, Composites, Common, Composite, Bodies } =
//   Matter;
const { Engine, Composites, Common, Composite, Bodies, Body, Vector } = Matter;
let anyEngine, world;
let stack,
  walls = [];

let video;
let handPose;
let hands = [];

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
  video.hide();

  anyEngine = Engine.create();
  world = anyEngine.world;

  //matter 도형 추가
  stack = Composites.stack(width * 0.25, 20, 10, 5, 0, 0, function (x, y) {
    //도형이 배치될 x좌표,도형이 배치될 y좌표,x축으로 배치될 도형 개수, y축으로 배치될 도형 개수, 도형간의 x축 간격, 도형간의 y축 간격
    let sides = Math.round(Common.random(1, 8));
    //도형 몇개의 변 가질지 랜덤으로 정함

    //도형 모서리 둥글게 만들기
    let chamfer = null;
    if (sides > 2 && Common.random() > 0.7) {
      //삼각형 이상일 때
      chamfer = {
        radius: 10,
      };
    }

    if (Math.round(Common.random(0, 1)) === 0) {
      return Bodies.rectangle(
        x,
        y,
        Common.random(50, 100),
        Common.random(50, 100),
        // Common.random(25, 50),
        // Common.random(25, 50),
        { chamfer: chamfer }
      );
    } else {
      return Bodies.polygon(x, y, sides, Common.random(40, 60), {
        //기존 (25,50)
        chamfer: chamfer,
      });
    }
  });
  Composite.add(world, stack);

  //벽
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
  background(220);
  image(video, 0, 0, width, height);

  Engine.update(anyEngine);
  // drawMatterObjects();

  noStroke();
  for (let body of stack.bodies) {
    if (body.circleRadius) {
      // 원
      // fill('#FD5523');
      fill('#FF855A');
    } else if (body.vertices && body.vertices.length === 3) {
      // 세모
      fill('#D1D175');
    } else if (body.vertices && body.vertices.length === 4) {
      // 네모
      fill('#FFF4C5');
    } else if (body.vertices) {
      // 그 외의 다각형
      fill('#A5B7E5');
    }

    drawBody(body);
  }

  if (hands.length > 0) {
    //검지
    let index = hands[0].keypoints[8];
    //엄지
    let thumb = hands[0].keypoints[4];

    //검지 좌표 조정
    //기존에 640*480비율에서 작업하던 것을 옮겨오니 원래는 괜찮았는데 여기에서 실행하니 손이랑 원이 따로 논다.
    //그래서 gpt사용하여 원의 위치 조정함
    let indexX = (index.x * width) / video.width;
    let indexY = (index.y * height) / video.height;

    //엄지 좌표 조정
    let thumbX = (thumb.x * width) / video.width;
    let thumbY = (thumb.y * height) / video.height;

    let fingerX = (indexX + thumbX) / 2;
    let fingerY = (indexY + thumbY) / 2;
    let distBetweenFingers = dist(indexX, indexY, thumbX, thumbY);
    for (let body of stack.bodies) {
      let bodyX = body.position.x;
      let bodyY = body.position.y;

      // 중간 지점과 도형 중심 간 거리
      let distToBody = dist(fingerX, fingerY, bodyX, bodyY);

      // 손가락 닿음 조건 (두 손가락이 가까워지고 도형 중심과 손가락 중간 지점이 가까움)
      if (distBetweenFingers < 50 && distToBody < 50) {
        Body.setPosition(body, { x: fingerX, y: fingerY });
      }
    }

    //검지
    fill(255, 0, 0, 100);
    stroke(255, 0, 0);
    strokeWeight(2);
    ellipse(indexX, indexY, 16, 16);
    // text('index', index.x, index.y);

    //엄지
    fill(255, 100);
    stroke(255);
    strokeWeight(2);
    ellipse(thumbX, thumbY, 16, 16);
    // text('thumb', thumb.x, thumb.y);
  }
  // 벽 그리기
  for (let wall of walls) {
    fill('#F7F6EB');
    drawBody(wall);
  }
}

//gpt사용
function drawBody(body) {
  const vertices = body.vertices;
  beginShape();
  for (let v of vertices) {
    vertex(v.x, v.y);
  }
  endShape(CLOSE);
}

//gotHands는 matter다 그리고 그 후에 있어야 충돌이 안생겨서
//손 감지될 때 도형이 안보이고 하는 문제가 안생긴다
function gotHands(results) {
  //이 친구가 있어야 손 데이터를 받아서 화면에 표시 가능
  hands = results;
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
