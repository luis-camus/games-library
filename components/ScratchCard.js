export class ScratchCard extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    this.scratching = false;
    this.hasWon = false;
    
    // Default Config
    this.config = {
      pre_text: "Scratch here",
      post_text: "You won!",
      bg: "", // Image under the scratch layer (the prize)
      fg: "", // Image to be scratched away (the cover)
      clear_percentage: 50
    };
  }

  static get observedAttributes() {
    return ['config'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'config' && oldValue !== newValue) {
      try {
        const parsed = JSON.parse(newValue);
        this.init(parsed);
      } catch (e) {
        console.error('ScratchCard: Invalid JSON config', e);
      }
    }
  }

  connectedCallback() {
    if (!this.root.innerHTML) {
        this.#renderStructure();
    }
  }

  init(parameters) {
    this.config = { ...this.config, ...parameters };
    this.hasWon = false;
    
    // Re-render if structure exists, or wait for connectedCallback
    if (this.root.querySelector('.scratch-card')) {
        this.#setupGame();
    }
  }

  #renderStructure() {
    this.root.innerHTML = `
      <style>
        :host { display: block; }
        .scratch-panel {
          display: flex; align-items: center; gap: 20px; flex-direction: column;
        }
        .scratch-card {
          height: 250px; width: 250px; position: relative;
          user-select: none; -webkit-user-select: none;
        }
        .scratch-code, .scratch-image {
          height: 100%; width: 100%; position: absolute;
          top: 0; left: 0; border-radius: 7px;
        }
        .scratch-code {
          background-size: contain; background-position: center;
          background-repeat: no-repeat;
          box-shadow: rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px;
          display: flex; align-items: center; justify-content: center;
        }
        .scratch-image {
          cursor: pointer;
          touch-action: none; /* Prevent scrolling while scratching */
        }
        .helper-text {
          flex: 1 1 auto; font-size: 0.9em; width: 250px; text-align: center;
          font-family: inherit;
        }
        .pre-text { display: block; }
        .post-text { display: none; font-weight: bold; }
        
        /* Reveal State */
        .reveal .pre-text { display: none; }
        .reveal .post-text { display: block; }
        .noshow { display: none !important; }
      </style>
      <div class="scratch-panel">
        <div class="scratch-card">
          <div class="scratch-code"></div>
          <canvas class="scratch-image"></canvas>
        </div>
        <div class="helper-text">
          <span class="pre-text"></span>
          <span class="post-text"></span>
        </div>
      </div>
    `;
    this.#setupGame();
  }

  #setupGame() {
    const codeDiv = this.root.querySelector('.scratch-code');
    const preText = this.root.querySelector('.pre-text');
    const postText = this.root.querySelector('.post-text');
    const helperText = this.root.querySelector('.helper-text');
    
    // Reset State
    helperText.classList.remove('reveal');
    codeDiv.classList.remove('noshow');
    
    // Apply Config
    if (this.config.bg) {
        codeDiv.style.backgroundImage = `url("${this.config.bg}")`;
    } else {
        codeDiv.innerText = this.config.post_text; // Fallback if no image
    }
    
    preText.innerHTML = this.config.pre_text;
    postText.innerHTML = this.config.post_text;

    // Setup Canvas
    const canvas = this.root.querySelector('canvas');
    // Ensure canvas is visible (in case it was removed in previous game)
    if (!canvas.parentNode) {
        this.root.querySelector('.scratch-card').appendChild(document.createElement('canvas'));
        this.#setupGame(); // Restart setup with new canvas
        return;
    }

    const rect = this.root.querySelector('.scratch-card').getBoundingClientRect();
    canvas.width = rect.width || 250;
    canvas.height = rect.height || 250;
    canvas.className = 'scratch-image'; // Ensure class is kept

    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.globalCompositeOperation = 'source-over';

    // Load Overlay Image
    const image = new Image();
    image.crossOrigin = "Anonymous";
    image.src = this.config.fg || 'https://demo.moneythor.com/img/scratch.png'; // Default gray scratch texture
    
    image.onload = () => {
      const xFactor = canvas.width / image.naturalWidth;
      const yFactor = canvas.height / image.naturalHeight;
      context.scale(xFactor, yFactor);
      const ptrn = context.createPattern(image, 'repeat');
      context.fillStyle = ptrn;
      context.fillRect(0, 0, image.naturalWidth, image.naturalHeight);
      context.scale(1 / xFactor, 1 / yFactor);
      
      this.#attachEvents(canvas);
    };
  }

  #attachEvents(canvas) {
    const start = (e) => { this.scratching = true; this.#scratch(e, canvas); };
    const end = () => { this.scratching = false; };
    const move = (e) => { if (this.scratching) { e.preventDefault(); this.#scratch(e, canvas); } };

    canvas.onmousedown = start;
    canvas.ontouchstart = start;
    
    window.addEventListener('mouseup', end);
    window.addEventListener('touchend', end);
    
    canvas.onmousemove = move;
    canvas.ontouchmove = move;
  }

  #getMouse(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  #scratch(event, canvas) {
    const pos = this.#getMouse(event, canvas);
    const context = canvas.getContext('2d');
    
    context.globalCompositeOperation = "destination-out";
    context.beginPath();
    // Brush size
    context.arc(pos.x, pos.y, 20, 0, Math.PI * 2);
    context.fill();
    
    this.#checkWin(canvas);
  }

  #checkWin(canvas) {
    if (this.hasWon) return;

    // Optimization: Don't check every single pixel on every move, maybe throttle this in production
    const context = canvas.getContext('2d');
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    let transparent = 0;
    
    // Alpha channel is every 4th byte
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) transparent++;
    }

    const percentage = (transparent / (pixels.length / 4)) * 100;
    
    if (percentage >= this.config.clear_percentage) {
      this.hasWon = true;
      this.#triggerWin(canvas);
    }
  }

  #triggerWin(canvas) {
    // Visual update
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 0.5s';
    this.root.querySelector(".helper-text").classList.add("reveal");
    
    // Remove canvas after fade to allow clicking the prize underneath if needed
    setTimeout(() => {
        canvas.remove();
    }, 500);

    // Dispatch Event
    this.dispatchEvent(new CustomEvent('game-completed', {
      detail: { result: 'won' },
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define('scratch-card', ScratchCard);