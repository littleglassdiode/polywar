var WebSocketServer = require('ws').Server;

function randomColor() {
    var color = "" + Math.floor(Math.random() * 16777215).toString(16);
    while (color.length < 6) {
        color = "0" + color;
    }
    return "#" + color;
}

function Player(position) {
    this.position = position;
    this.angle = 0;
    this.color = randomColor();
    this.lineColor = randomColor();
}

Player.prototype.rotate = function(dir) {
    this.angle += dir;
}

Player.prototype.drive = function(speed) {
    this.position[0] += speed * Math.sin(this.angle);
    this.position[1] -= speed * Math.cos(this.angle);
}

function start(hs) {
    var wss = new WebSocketServer({server: hs, path: "/polywar-server"});

    wss.on('connection', function(ws) {
        ws.on('message', function(message) {
            console.log('received: %s', message);
            this.input = JSON.parse(message);
        });

        ws.on('close', function() {
            console.log('client disconnected');
            clearInterval(this.interval);
        });

        console.log('client connected');
        ws.player = new Player([100, 100]);
        console.log(JSON.stringify(wss.clients.map(function(s) {return s.player;})));

        ws.interval = setInterval(function(ws) {
            try {
                ws.send(JSON.stringify(wss.clients.map(function(s) {return s.player;})));
            } catch (Error) {
                console.log('error caught');
            }

            if (!ws.input)
                return;
            if (ws.input.right) {
                ws.player.rotate(Math.PI/30);
            }
            if (ws.input.left) {
                ws.player.rotate(-Math.PI/30);
            }
            if (ws.input.up) {
                ws.player.drive(6);
            }
            if (ws.input.down) {
                ws.player.drive(-4);
            }
        }, 100/3, ws);
    });
}

exports.start = start;
