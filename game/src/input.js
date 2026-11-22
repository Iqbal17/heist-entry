// VAULTBREAK — keyboard and mouse state. This file only records what is held,
// what was just pressed and where the player clicked; the world and the main
// loop poll the Input object each frame.

var GAME_KEYS = {
  ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1,
  KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyE: 1,
  ShiftLeft: 1, ShiftRight: 1
};

var Input = {
  down: {},      // code -> true while the key is held
  pressed: {},   // code -> true only on the frame the key went down
  clicks: [],    // queued {x, y} clicks in canvas coordinates

  init: function (canvas) {
    var self = this;
    window.addEventListener('keydown', function (e) {
      if (GAME_KEYS[e.code]) e.preventDefault();
      if (!e.repeat && !self.down[e.code]) self.pressed[e.code] = true;
      self.down[e.code] = true;
    });
    window.addEventListener('keyup', function (e) {
      self.down[e.code] = false;
    });
    window.addEventListener('blur', function () {
      self.down = {};
    });
    canvas.addEventListener('mousedown', function (e) {
      var r = canvas.getBoundingClientRect();
      self.clicks.push({
        x: (e.clientX - r.left) * (canvas.width / r.width),
        y: (e.clientY - r.top) * (canvas.height / r.height)
      });
    });
  },

  // Called by the main loop at the end of every frame.
  clearPressed: function () { this.pressed = {}; },

  drainClicks: function () {
    var c = this.clicks;
    this.clicks = [];
    return c;
  }
};
