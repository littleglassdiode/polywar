var KEY = {D: 68, W: 87, A: 65, S:83, RIGHT:39, UP:38, LEFT:37, DOWN:40, SPACE:32};
var INPUTS = {UP: 0x01, DOWN: 0x02, LEFT: 0x04, RIGHT: 0x08};
var input = 0;

function press(evt) {
    var code = evt.keyCode;
    var send = true;
    switch (code) {
        case KEY.RIGHT:
        case KEY.D: input |= INPUTS.RIGHT; break;
        
        case KEY.UP:
        case KEY.W: input |= INPUTS.UP; break;
        
        case KEY.LEFT:
        case KEY.A: input |= INPUTS.LEFT; break;
        
        case KEY.DOWN: 
        case KEY.S: input |= INPUTS.DOWN; break;

        default: send = false; break;
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

        default: send = false; break;
    }
    if (send)
        server.sendPacket(0x01, [input]);
}

function Player(fill, stroke) {
    this.pos = [0, 0];
    this.angle = 0;
    this.fill = "rgb("+fill[0]+","+fill[1]+","+fill[2]+")";
    this.stroke = "rgb("+stroke[0]+","+stroke[1]+","+stroke[2]+")";
}

Player.prototype.draw = function(ctx) {
    // Save the state because we're gonna be doing transformations
    ctx.save();

    // Set style
    ctx.fillStyle = this.fill;
    ctx.strokeStyle = this.stroke;
    ctx.lineWidth = 2;

    // Transform according to the location and rotation of the player
    ctx.translate(this.pos[0], this.pos[1]);
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

// Connect to the server
var server = new WebSocket("ws://" + window.location.host + "/polywar-server");
// Players will be stored here
var players = {};
// The ID of the guy playing on this client will be stored here
var my_id;

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
                var id, vars, position;
                while (offset < msg.byteLength) {
                    id = (new Uint8Array(msg, offset, 1))[0];
                    offset += 1;
                    vars = new Uint8Array(msg, offset, 1);
                    offset += 1;
                    if (vars[0] & 0x01) {
                        position = new DataView(msg, offset, 2);
                        offset += 2;
                    if (players[id])
                        players[id].pos[0] = position.getInt16(0)/4;
                    }
                    if (vars[0] & 0x02) {
                        position = new DataView(msg, offset, 2);
                        offset += 2;
                    if (players[id])
                        players[id].pos[1] = position.getInt16(0)/4;
                    }
                    if (vars[0] & 0x04) {
                    if (players[id])
                        players[id].angle = (new Uint8Array(msg, offset, 1))[0];
                        offset += 1;
                    }
                }
                break;
        }

        // Redraw
        // TODO: don't make this happen every time we got a message from the
        // server
        // Get the canvas and a context for it
        var c = document.getElementById("polywarCanvas");
        var ctx = c.getContext("2d");

        // Clear the canvas
        c.width = c.width;
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
    document.addEventListener("keydown", press, true);
    document.addEventListener("keyup", release, true);
}
