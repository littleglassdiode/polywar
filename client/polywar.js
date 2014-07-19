var KEY = {D: 68, W: 87, A: 65, S:83, RIGHT:39, UP:38, LEFT:37, DOWN:40, SPACE:32};
var INPUTS = {UP: 0x01, DOWN: 0x02, LEFT: 0x04, RIGHT: 0x08, SPACE: 0x10};
var input = 0;

function press(evt) {
    var code = evt.keyCode;
    var send = false;
    switch (code) {
        case KEY.RIGHT:
        case KEY.D:
            if (!(input & INPUTS.RIGHT)) {
                input |= INPUTS.RIGHT;
                send = true;
            }
            break;
        
        case KEY.UP:
        case KEY.W:
            if (!(input & INPUTS.UP)) {
                input |= INPUTS.UP;
                send = true;
            }
            break;
        
        case KEY.LEFT:
        case KEY.A:
            if (!(input & INPUTS.LEFT)) {
                input |= INPUTS.LEFT;
                send = true;
            }
            break;
        
        case KEY.DOWN: 
        case KEY.S:
            if (!(input & INPUTS.DOWN)) {
                input |= INPUTS.DOWN;
                send = true;
            }
            break;

        case KEY.SPACE:
            if (!(input & INPUTS.SPACE)) {
                input |= INPUTS.SPACE;
                server.sendPacket(0x02, []);
                send = false;
            }
            break;
    }
    if (send)
        server.sendPacket(0x01, [input]);
}

function release(evt) {
    var code = evt.keyCode;
    var send = true;
    switch (code) {
        case KEY.RIGHT:
        case KEY.D: input &= ~INPUTS.RIGHT; break;
        
        case KEY.UP:
        case KEY.W: input &= ~INPUTS.UP; break;
        
        case KEY.LEFT:
        case KEY.A: input &= ~INPUTS.LEFT; break;
        
        case KEY.DOWN: 
        case KEY.S: input &= ~INPUTS.DOWN; break;

        case KEY.SPACE: input &= ~INPUTS.SPACE; send = false; break;

        default: send = false; break;
    }
    if (send)
        server.sendPacket(0x01, [input]);
}

function Player(fill, stroke) {
    this.position = [0, 0];
    this.angle = 0;
    this.fill = "rgb("+fill[0]+","+fill[1]+","+fill[2]+")";
    this.stroke = "rgb("+stroke[0]+","+stroke[1]+","+stroke[2]+")";
    this.shots = [];
}

Player.prototype.killShot = function(id) {
    for (s in this.shots) {
        if (id == this.shots[s].id) {
            this.shots.splice(s, 1);
            return;
        }
    }
}

Player.prototype.draw = function(ctx) {
    // Save the state because we're gonna be doing transformations
    ctx.save();

    // Set style
    ctx.fillStyle = this.fill;
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = 2;

    // Transform according to the location and rotation of the player
    ctx.translate(this.position[0], this.position[1]);
    ctx.rotate(this.angle * Math.PI/128);

    // Draw the triangle
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(10, 10);
    ctx.lineTo(-10, 10);
    // At this point, we can fill
    ctx.fill();
    // Redraw the first two points so the outline will be complete and pointy
    ctx.lineTo(0, -15);
    ctx.lineTo(10, 10);
    ctx.stroke();

    // Undo our transformations
    ctx.restore();
}

function Shot(data) {
    this.id = data.getUint8(1);
    this.position = [data.getInt16(2)/4, data.getInt16(4)/4];
    this.angle = data.getInt8(6);
    this.speed = data.getInt8(7);
    this.velocity = [
        this.speed * Math.sin(this.angle * Math.PI/128),
        -this.speed * Math.cos(this.angle * Math.PI/128)
    ];
}

Shot.prototype.update = function() {
    this.position[0] += this.velocity[0];
    this.position[1] += this.velocity[1];
}

Shot.prototype.draw = function(ctx) {
    ctx.fillStyle = "#0f0";
    ctx.strokeStyle = "#070";
    ctx.beginPath();
    ctx.arc(this.position[0], this.position[1], 3, 0, 2*Math.PI);
    ctx.fill();
    ctx.stroke();
}

// Connect to the server
var server = new WebSocket("ws://" + window.location.host + "/polywar-server");
// Players will be stored here
var players = {};
// The ID of the guy playing on this client will be stored here
var my_id;

var c, ctx;

// Convenience function to send a packet with an opcode and an array of bytes
WebSocket.prototype.sendPacket = function(opcode, bytes) {
    var msg = new ArrayBuffer(bytes.length + 1);
    var data = new Uint8Array(msg, 0, bytes.length + 1);
    data[0] = opcode;
    data.set(bytes, 1);
    server.send(msg);
}

// Send the introduction packet when the connection is complete
server.onopen = function(event) {
    server.sendPacket(0x00, []);
}

// When we get a message from the server, react accordingly
server.onmessage = function drawGame(event) {
    var reader = new FileReader();
    reader.addEventListener("loadend", function() {
        // reader.result contains the contents of blob as a typed array
        var msg = reader.result;
        // If somehow a 0 byte message was sent, ignore it
        if (msg.byteLength === 0) {
            return;
        }
        var opcode = new Uint8Array(msg, 0, 1);
        switch (opcode[0]) {
            // New player information
            case 0x00:
                var id = (new Uint8Array(msg, 1, 1))[0];
                var fill = new Uint8Array(msg, 2, 3);
                var stroke = new Uint8Array(msg, 5, 3);
                if (JSON.stringify(players) === "{}")
                    my_id = id;
                players[id] = new Player(fill, stroke);
                break;
            // Player disconnected
            case 0x01:
                var id = (new Uint8Array(msg, 1, 1))[0];
                delete players[id];
                break;
            // Player update(s)
            case 0x02:
                var offset = 1;
                var id, position;
                while (offset < msg.byteLength) {
                    id = (new Uint8Array(msg, offset, 1))[0];
                    offset += 1;
                    position = new DataView(msg, offset, 2);
                    offset += 2;
                    if (players[id])
                        players[id].position[0] = position.getInt16(0)/4;
                    position = new DataView(msg, offset, 2);
                    offset += 2;
                    if (players[id])
                        players[id].position[1] = position.getInt16(0)/4;
                    if (players[id])
                        players[id].angle = (new Uint8Array(msg, offset, 1))[0];
                    offset += 1;
                }
                break;
            // Shot fired
            case 0x03:
                var data = new DataView(msg, 1, 8);
                players[data.getUint8(0)].shots.push(new Shot(data));
                break;
            // Shot ended
            case 0x04:
                var data = new DataView(msg, 1, 2);
                players[data.getUint8(0)].killShot(data.getUint8(1));
                break;
        }

        // Redraw
        // TODO: don't make this happen every time we got a message from the
        // server

        // Clear the canvas
        c.width = c.width;

        // Draw all the shots
        for (var p in players) {
            for (var s in players[p].shots) {
                players[p].shots[s].draw(ctx);
                players[p].shots[s].update();
            }
        }
        // Draw all the players but me
        for (var p in players) {
            if (p == my_id)
                continue;
            players[p].draw(ctx);
        }
        // Draw myself
        players[my_id].draw(ctx);
    });
    reader.readAsArrayBuffer(event.data);
}

window.onload = function() {
    // Get the canvas and a context for it
    c = document.getElementById("polywarCanvas");
    ctx = c.getContext("2d");

    document.addEventListener("keydown", press, true);
    document.addEventListener("keyup", release, true);
}
