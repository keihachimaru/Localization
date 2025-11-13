// server.js
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

// store observations: map[fromId][observedId] => latest distance (meters)
const obs = {}; // { fromId: { observedId: distance } }

function setObs(from, observed, distance) {
  obs[from] = obs[from] || {};
  obs[from][observed] = distance;
}

// helper: get all unique nodes
function getNodes() {
  const nodes = new Set();
  for (const a of Object.keys(obs)) {
    nodes.add(a);
    for (const b of Object.keys(obs[a])) nodes.add(b);
  }
  return Array.from(nodes);
}

// simple triangulation: average distance for each pair
function angle(AB, AC, BC) {
    return arccos((AB**2+AC**2+BC**2)/(2*AB*AC));
}


function printDistancesAndAngles() {
  const nodes = getNodes();
  const n = nodes.length;
  if (n < 2) return;

  for (let i = 0; i < n; i++) {
    const origin = nodes[i];
    console.log('FROM '+origin)
    let others = [];
    for (let j = 0; j < n; j++) {
      const dest = nodes[j];
      if(j==i) continue
      console.log('TO '+b+' : '+obs[origin]?.[dest]+' m');
      others.push(dest)
      console.log('---------------------');
    }
    if (n >= 3) {
      // trivial angle: assume points on x-axis separated by avgDist
      const AB = obs[origin][others[0]];
      const AC = obs[origin][others[1]];
      const BC = obs[others[0]][others[1]];
      const angle = angle(AB, AC, BC)
      console.log('VERTEX ANGLE '+angle);
    }

  }
  console.log("=====================");
}

wss.on("connection", (ws) => {
  console.log("ws connected");

  ws.on("message", (msg) => {
    try {
      const obj = JSON.parse(msg);
      if (obj.type === "observation") {
        const { fromId, observedDeviceId, distanceMeters } = obj.payload;
        setObs(fromId, observedDeviceId, distanceMeters);
      }
    } catch (e) {
      console.warn("ws parse error", e);
    }
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on ${PORT}`);
});


setInterval(() => {
    console.clear();
    printDistancesAndAngles();
}, 1000)
