var WebSocketServer = require('ws').Server;

function randomColor24() {
    var color = "" + Math.floor(Math.random() * 16777215).toString(16);
    while (color.length < 6) {
        color = "0" + color;
    }
    return "#" + color;
}

function randomColor12() {
    var color = "" + Math.floor(Math.random() * 4095).toString(16);
    while (color.length < 3) {
        color = "0" + color;
    }
    return "#" + color;
}

function Player(position) {
    this.pos = position;
    this.angle = 0;
    this.fill = randomColor12();
    this.stroke = randomColor12();
}

Player.prototype.rotate = function(dir) {
    this.angle += dir;
}

Player.prototype.drive = function(speed) {
    this.pos[0] += speed * Math.sin(this.angle * Math.PI/180);
    this.pos[1] -= speed * Math.cos(this.angle * Math.PI/180);

    // XXX This is just for reducing network traffic
    this.pos[0] = parseFloat(this.pos[0].toFixed(2));
    this.pos[1] = parseFloat(this.pos[1].toFixed(2));
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
                ws.player.rotate(6);
            }
            if (ws.input.left) {
                ws.player.rotate(-6);
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
