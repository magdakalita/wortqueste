// Keyboard + touch input. Keys typed into form fields never reach the game.

const KEYMAP = {
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  ArrowUp: "jump", KeyW: "jump", Space: "jump",
};

export class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set(); // keys pressed since last frame
    this.enabled = false;

    window.addEventListener("keydown", (e) => {
      if (isTyping(e.target)) return;
      const k = KEYMAP[e.code];
      if (!k || !this.enabled) return;
      e.preventDefault();
      if (!this.down.has(k)) this.pressed.add(k);
      this.down.add(k);
    });
    window.addEventListener("keyup", (e) => {
      const k = KEYMAP[e.code];
      if (k) this.down.delete(k);
    });
    window.addEventListener("blur", () => this.reset());
  }

  bindTouch(container) {
    for (const btn of container.querySelectorAll("button[data-key]")) {
      const k = btn.dataset.key;
      const on = (e) => {
        e.preventDefault();
        if (!this.enabled) return;
        if (!this.down.has(k)) this.pressed.add(k);
        this.down.add(k);
      };
      const off = (e) => {
        e.preventDefault();
        this.down.delete(k);
      };
      btn.addEventListener("pointerdown", on);
      btn.addEventListener("pointerup", off);
      btn.addEventListener("pointerleave", off);
      btn.addEventListener("pointercancel", off);
    }
  }

  wasPressed(k) {
    return this.pressed.has(k);
  }

  endFrame() {
    this.pressed.clear();
  }

  reset() {
    this.down.clear();
    this.pressed.clear();
  }
}

function isTyping(el) {
  return el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}
