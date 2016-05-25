# Polywar

Polywar is an open-source top-down shooter game. It will have many different
weapon types, varying from fast, short range bullets to slow bombs that explode
on contact. It is written entirely in JavaScript: the server is written with
Node.js and the client is made to run in a modern HTML5-compliant web browser.

## Running the Server

Ensure that Node.js 6.2.0 is installed.  Other versions may work, but this is
the version on which development is done, so it is almost sure to work
properly.  Once this is installed, the server can be run by `cd`-ing into the
root of the repository and running:

    $ node server

This will start the server, by default on port 8080.  This can be set by
changing the value of `HTTP_PORT` in `server/variables.js`.

## Joining the Game

You can join the game by navigating to http://localhost:8080/ (or whatever port
you chose instead of 8080) in a web browser.  On other computers, you or your
friends can connect by substituting your computer's IP address for localhost.
As for what web browser to use, Chrom[e|ium] should work well.  Firefox should
also work, though it tends to have a lower framerate on slow computers.  If you
use Linux, GNOME Web (a.k.a. Epiphany) works about as well as Google's browsers,
so I recommend it over Firefox.

## Controls

|       Key | Action                |
|----------:|:----------------------|
|    W / Up | Drive forward         |
|  S / Down | Drive backward        |
|  A / Left | Turn counterclockwise |
| D / Right | Turn clockwise        |
|     Space | Shoot                 |
|         1 | Zoom close            |
|         2 | Zoom medium           |
|         3 | Zoom far              |
|         R | Toggle view rotation  |
