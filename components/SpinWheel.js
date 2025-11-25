export class SpinWheel extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    
    // Default state
    this.config = {
      options: [],
      winningIndex: null,
      prize_text: ''
    };
  }

  static get observedAttributes() {
    return ['config'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'config' && oldValue !== newValue) {
      try {
        const parsedConfig = JSON.parse(newValue);
        this.init(parsedConfig);
      } catch (e) {
        console.error('SpinWheel: Invalid JSON in config attribute', e);
      }
    }
  }

  connectedCallback() {
    // Check if we have a config attribute to auto-init
    if (this.hasAttribute('config')) {
        // attributeChangedCallback will handle this
    }
  }

  init(parameters) {
    this.config = {
      options: parameters.options || [],
      winningIndex: parameters.winningIndex ?? null, // Use nullish coalescing
      prize_text: parameters.prize_text || ''
    };
    
    // If prize_text wasn't explicitly set, try to grab it from the winning option
    if (!this.config.prize_text && this.config.winningIndex !== null && this.config.options[this.config.winningIndex]) {
        this.config.prize_text = this.config.options[this.config.winningIndex].prize;
    }

    this.#render();
  }

  #generateWheelSVG() {
    const options = this.config.options;
    if (options.length === 0) return '';

    const optionAngle = 360 / options.length;
    const radius = 125;
    const centerX = 125;
    const centerY = 125;
    
    let svgContent = '';
    
    options.forEach((option, index) => {
      // -90 to start from top (12 o'clock)
      const startAngle = (index * optionAngle - 90) * (Math.PI / 180); 
      const endAngle = ((index + 1) * optionAngle - 90) * (Math.PI / 180);
      
      const x1 = centerX + radius * Math.cos(startAngle);
      const y1 = centerY + radius * Math.sin(startAngle);
      const x2 = centerX + radius * Math.cos(endAngle);
      const y2 = centerY + radius * Math.sin(endAngle);
      
      const largeArcFlag = optionAngle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      // Calculate icon position
      const iconAngle = (index * optionAngle + optionAngle / 2 - 90) * (Math.PI / 180);
      const iconRadius = radius * 0.7;
      const iconX = centerX + iconRadius * Math.cos(iconAngle);
      const iconY = centerY + iconRadius * Math.sin(iconAngle);
      
      svgContent += `
        <path d="${pathData}" fill="${option.color}" stroke-width="0"/>
        <g transform="translate(${iconX - 15}, ${iconY - 15})">
          <rect width="30" height="30" fill="rgba(0,0,0,0.4)" style="
            mask-image: ${option.icon}; 
            -webkit-mask-image: ${option.icon}; 
            mask-size: contain; 
            -webkit-mask-size: contain; 
            mask-repeat: no-repeat; 
            -webkit-mask-repeat: no-repeat; 
            mask-position: center; 
            -webkit-mask-position: center;"/>
        </g>
      `;
    });
    
    return svgContent;
  }

  #render() {
    const svgContent = this.#generateWheelSVG();
    
    this.root.innerHTML = `
    <style>
      /* Host styles to ensure the component has dimensions */
      :host { display: block; }
      
      #wrapper { margin: 0px auto; width: 266px; position: relative; }
      
      /* Wheel Container */
      #wheel {
        width: 250px; height: 250px;
        border-radius: 50%; position: relative; overflow: hidden;
        border: 8px solid #fff;
        box-shadow: rgba(0,0,0,0.2) 0px 0px 10px, rgba(0,0,0,0.05) 0px 3px 0px;
        transform: rotate(0deg);
      }

      #inner-wheel {
        width: 100%; height: 100%; position: relative;
        transition: transform 6s cubic-bezier(0,.99,.44,.99);
      }

      #wheel-svg { width: 100%; height: 100%; position: absolute; top: 0; left: 0; }

      /* Spin Button */
      #spin {
        width: 68px; height: 68px; position: absolute;
        top: 50%; left: 50%; margin: -34px 0 0 -34px;
        border-radius: 50%; background: #fff;
        z-index: 1000; cursor: pointer;
        box-shadow: rgba(0,0,0,0.1) 0px 3px 0px;
        font-family: sans-serif; user-select: none;
      }

      #spin:after {
        content: "SPIN"; text-align: center; line-height: 70px;
        color: #CCC; font-weight: bold; font-size: 1.1em;
        display: block; width: 68px; height: 68px;
      }

      /* The Triangle Pointer */
      #spin:before {
        content: ""; position: absolute;
        width: 0; height: 0;
        border-style: solid;
        border-width: 0 20px 28px 20px;
        border-color: transparent transparent #ffffff transparent;
        top: -12px; left: 14px;
      }

      /* Inner red circle of button */
      #inner-spin {
        width: 54px; height: 54px; position: absolute;
        top: 50%; left: 50%; margin: -27px 0 0 -27px;
        border-radius: 50%; z-index: 999;
        background: radial-gradient(ellipse at center, rgba(255,255,255,1) 0%, rgba(234,234,234,1) 100%);
        box-shadow: rgba(255,255,255,1) 0px -2px 0px inset, rgba(0,0,0,0.4) 0px 0px 5px;
      }

      /* Button Active State */
      #spin:active #inner-spin { box-shadow: rgba(0,0,0,0.4) 0px 0px 5px inset; }
      #spin:active:after { font-size: 15px; }

      /* Utility Classes */
      .disabled-click { pointer-events: none; opacity: 0.9; }
      .noshow { display: none !important; }
      
      /* Result Box */
      #prize-box {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        background: rgba(255, 255, 255, 0.95);
        border-radius: 50%; text-align: center;
        z-index: 2000;
      }
    </style>

    <div id="wrapper">
      <div id="wheel">
        <div id="inner-wheel">
          <svg id="wheel-svg" viewBox="0 0 250 250">
            ${svgContent}
          </svg>
        </div>
        <div id="spin">
          <div id="inner-spin"></div>
        </div>
      </div>
      
      <div id="prize-box" class="noshow">
        <strong>Congratulations!</strong>
        <span style="font-size: 0.9em; margin-top: 5px;">You won</span>
        <h3 id="prize-text" style="margin: 5px 0;"></h3>
      </div>
    </div>
    `;

    this.#attachEvents();
  }

  #attachEvents() {
    const spinBtn = this.root.querySelector('#spin');
    const wheelInner = this.root.querySelector('#inner-wheel');

    spinBtn.addEventListener("click", () => {
      if (this.config.options.length === 0) return;
      
      spinBtn.classList.add("disabled-click");
      
      let targetDegree;
      
      if (this.config.winningIndex !== null) {
        // Deterministic Spin (Backend decided winner)
        const optionAngle = 360 / this.config.options.length;
        const targetAngle = (this.config.winningIndex * optionAngle) + (optionAngle / 2);
        const fullRotations = Math.floor(Math.random() * 3 + 5); // 5-8 spins
        targetDegree = (fullRotations * 360) + (360 - targetAngle);
      } else {
        // Random Spin (Client side logic)
        targetDegree = Math.round(Math.random() * (5760 - 1800) + 1800);
      }
      
      wheelInner.style.transform = 'rotate(' + targetDegree + 'deg)';
    });

    wheelInner.addEventListener('transitionend', (event) => {
      if (event.propertyName !== "transform") return;

      // Calculate result
      let selectedPrize;
      let selectedIndex;

      if (this.config.winningIndex !== null) {
        selectedIndex = this.config.winningIndex;
        selectedPrize = this.config.options[selectedIndex].prize;
      } else {
        // Calculate from rotation if random
        const finalRotation = parseFloat(wheelInner.style.transform.match(/rotate\(([^)]+)deg\)/)[1]) % 360;
        const optionAngle = 360 / this.config.options.length;
        selectedIndex = Math.floor((360 - finalRotation + optionAngle/2) / optionAngle) % this.config.options.length;
        selectedPrize = this.config.options[selectedIndex].prize;
      }
      
      // Show UI
      this.root.querySelector('#prize-text').innerHTML = this.config.prize_text || selectedPrize;
      this.root.querySelector('#prize-box').classList.remove("noshow");
      
      // Dispatch Event for the App to handle (e.g. update user balance)
      this.dispatchEvent(new CustomEvent('game-completed', {
        detail: {
          prize: selectedPrize,
          index: selectedIndex
        },
        bubbles: true,
        composed: true
      }));
    });
  }
}

customElements.define('spin-wheel', SpinWheel);