var WebSocketServer = require('ws').Server;

function start(hs) {
    var wss = new WebSocketServer({server: hs, path: "/polywar-server"});

    function Player(position) {
        this.position = position;
        this.angle = 0;
        this.color = '#'+Math.floor(Math.random()*16777215).toString(16);
        this.lineColor = '#'+Math.floor(Math.random()*16777215).toString(16);
    }

    Player.prototype.rotate = function(dir) {
        this.angle += dir;
    }

    Player.prototype.drive = function(speed) {
        this.position[0] += speed * Math.sin(this.angle);
        this.position[1] -= speed * Math.cos(this.angle);
    }

    wss.on('connection', function(ws) {
        ws.on('message', function(message) {
            console.log('received: %s', message);
            this.input = JSON.parse(message);
        });

        ws.on('close', function() {
            console.log('client disconnected');
            clearInterval(this.interval);
            wss.players[this.player_id] = "no";
        });

        console.log('client connected');
        this.players = this.players || [];
        ws.player_id = this.players.length;
        this.players.push(new Player([100, 100]));
        console.log(JSON.stringify(this.players));

        ws.interval = setInterval(function(ws) {
            ws.send(JSON.stringify(wss.players));

            if (!ws.input)
                return;
            if (ws.input.right) {
                wss.players[ws.player_id].rotate(Math.PI/30);
            }
            if (ws.input.left) {
                wss.players[ws.player_id].rotate(-Math.PI/30);
            }
            if (ws.input.up) {
                wss.players[ws.player_id].drive(6);
            }
            if (ws.input.down) {
                wss.players[ws.player_id].drive(-4);
            }
        }, 100/3, ws);
    });
}

exports.start = start;
