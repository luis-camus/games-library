export class GumballMachine extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: 'open' });
    
    this.config = {
      options: [],
      winningIndex: 0,
      prize_text: ''
    };

    this.gameState = {
      gumballs: [],
      isDispensing: false,
      gameWon: false
    };
  }

  static get observedAttributes() {
    return ['config'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'config' && oldValue !== newValue) {
      try {
        this.init(JSON.parse(newValue));
      } catch (e) {
        console.error('GumballMachine: Invalid config', e);
      }
    }
  }

  connectedCallback() { }

  init(parameters) {
    this.config = {
      options: parameters.options || [
        { color: '#ff6b6b', prize: 'Red Prize!' },
        { color: '#4ecdc4', prize: 'Teal Prize!' },
        { color: '#45b7d1', prize: 'Blue Prize!' },
        { color: '#f9ca24', prize: 'Yellow Prize!' },
        { color: '#9b59b6', prize: 'Purple Prize!' },
        { color: '#e67e22', prize: 'Orange Prize!' }
      ],
      winningIndex: parameters.winningIndex ?? 0,
      prize_text: parameters.prize_text || ''
    };

    this.gameState = {
      gumballs: [],
      isDispensing: false,
      gameWon: false
    };

    this.#createGumballData();
    this.#render();
    this.#setupEventListeners();
  }

  #createGumballData() {
    this.gameState.gumballs = [];
    if (this.config.options.length === 0) return;

    // --- PHYSICS PACKING ALGORITHM ---
    // Instead of random placement, we stack them layer by layer from the bottom
    
    const domeRadius = 100; // Dome is 200px wide
    const ballSize = 18;    // Size of gumball
    const overlap = 0.85;   // 85% height for hexagonal nesting
    
    let currentY = 190;     // Start at the very bottom of the 200px dome
    let row = 0;
    let ballCount = 0;

    // Loop upwards until we reach the middle of the dome
    while (currentY > 80) {
        
        // Calculate how wide the dome is at this specific Y height (Circle chord math)
        // dy is distance from center (100)
        const dy = Math.abs(100 - currentY);
        const chordWidth = 2 * Math.sqrt((domeRadius * domeRadius) - (dy * dy));
        
        // Calculate how many balls fit in this row
        const ballsInRow = Math.floor(chordWidth / ballSize);
        
        // Calculate starting X to center the row
        const startX = 100 - (ballsInRow * ballSize / 2);

        for (let i = 0; i < ballsInRow; i++) {
            const colorIndex = ballCount % this.config.options.length;
            const option = this.config.options[colorIndex];
            
            // Offset every other row for "brick wall" nesting effect
            const rowOffset = (row % 2 === 0) ? 0 : (ballSize / 2);
            
            // Add tiny randomness so it looks like a pile, not a grid
            const jitterX = (Math.random() * 4) - 2;
            const jitterY = (Math.random() * 4) - 2;

            this.gameState.gumballs.push({
                color: option.color,
                prize: option.prize,
                isWinning: false,
                // Convert to Percentages for CSS
                left: ((startX + (i * ballSize) + rowOffset + jitterX) / 200) * 100,
                top: ((currentY + jitterY) / 200) * 100,
                size: 15 + Math.random() * 2, // Slight size variance
                zIndex: row // Lower rows are behind higher rows
            });
            ballCount++;
        }
        
        // Move up for next row
        currentY -= (ballSize * overlap);
        row++;
    }
    
    // Set winning ball
    const winningGumballIndex = Math.floor(Math.random() * this.gameState.gumballs.length);
    const winningOption = this.config.options[this.config.winningIndex];
    
    if (winningOption) {
        this.gameState.gumballs[winningGumballIndex] = {
          ...this.gameState.gumballs[winningGumballIndex],
          color: winningOption.color,
          prize: winningOption.prize,
          isWinning: true
        };
    }
  }

  #setupEventListeners() {
    const crankHandle = this.root.querySelector('.crank-group');
    if(crankHandle) {
        crankHandle.addEventListener('click', () => this.#handleCrankClick());
    }
  }

  #handleCrankClick() {
    if (this.gameState.isDispensing || this.gameState.gameWon) return;

    this.gameState.isDispensing = true;
    
    const crankGroup = this.root.querySelector('.crank-group');
    crankGroup.style.opacity = '0.7';
    crankGroup.style.cursor = 'not-allowed';

    this.#animateCrank();
    this.#dispenseGumball();
  }

  #animateCrank() {
    const crankHandle = this.root.querySelector('.crank-handle');
    crankHandle.style.animation = 'none';
    crankHandle.offsetHeight; 
    crankHandle.style.animation = 'crankTurn 0.8s cubic-bezier(0.45, 0.05, 0.55, 0.95)';
  }

  #dispenseGumball() {
    const dome = this.root.querySelector('.dome');
    dome.classList.add('jiggling');
    
    setTimeout(() => {
      dome.classList.remove('jiggling');
      
      const winningGumball = this.gameState.gumballs.find(g => g.isWinning) || this.gameState.gumballs[0];
      const dispensedGumball = this.root.querySelector('#dispensed-gumball');
      
      dispensedGumball.style.background = `radial-gradient(circle at 30% 30%, ${this.#lightenColor(winningGumball.color, 40)}, ${winningGumball.color})`;
      dispensedGumball.style.display = 'block';
      dispensedGumball.style.animation = 'dropBounce 0.8s ease-out forwards';
      dispensedGumball.style.cursor = 'pointer';
      dispensedGumball.title = "Click to open!";
      
      dispensedGumball.onclick = () => this.#popGumball(dispensedGumball);
      
    }, 800); 
  }

  #popGumball(gumballElement) {
    if (this.gameState.gameWon) return;
    
    gumballElement.style.pointerEvents = 'none';
    gumballElement.classList.add('popping');
    
    setTimeout(() => {
      gumballElement.style.display = 'none';
      this.#showPrize();
    }, 250);
  }

  #showPrize() {
    const winningOption = this.config.options[this.config.winningIndex];
    const prizeBox = this.root.querySelector('#prize-box');
    const prizeText = this.root.querySelector('#prize-text');
    
    prizeText.textContent = this.config.prize_text || winningOption.prize;
    prizeBox.classList.remove('hidden');
    prizeBox.classList.add('enter');
    
    this.gameState.gameWon = true;

    this.dispatchEvent(new CustomEvent('game-completed', {
      detail: { 
        prize: prizeText.textContent,
        color: winningOption.color 
      },
      bubbles: true,
      composed: true
    }));
  }

  #lightenColor(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  #render() {
    const gumballsHTML = this.gameState.gumballs.map(gumball => `
      <div class="gumball" style="
        background: radial-gradient(circle at 30% 30%, ${this.#lightenColor(gumball.color, 60)}, ${gumball.color});
        left: ${gumball.left}%;
        top: ${gumball.top}%;
        width: ${gumball.size}px;
        height: ${gumball.size}px;
        z-index: ${gumball.zIndex};
      "></div>
    `).join('');
    
    this.root.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; }
        .game-container {
          width: 250px; height: 450px; margin: 20px auto;
          text-align: center; position: relative; padding: 20px;
          box-shadow: rgba(0, 0, 0, 0.1) 0px 10px 15px -3px, rgba(0, 0, 0, 0.05) 0px 4px 6px -2px;
          border-radius: 24px;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          overflow: hidden;
          transition: transform 0.2s;
        }

        .game-title { font-size: 20px; font-weight: 800; margin-bottom: 5px; color: #2c3e50; position: relative; z-index: 10; }
        .game-subtitle { font-size: 12px; color: #6c757d; margin-bottom: 15px; position: relative; z-index: 10; }

        .gumball-machine {
          position: relative; width: 200px; height: 320px; margin: 0 auto;
        }

        .dome {
          width: 200px; height: 200px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,255,255,0.2));
          border: 4px solid #e0e0e0;
          box-shadow: inset 10px -10px 20px rgba(255,255,255,0.5), inset -10px 10px 20px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.1);
          overflow: hidden;
          position: relative; 
          z-index: 2;
        }

        .dome.jiggling { animation: domeShake 0.1s infinite; }
        @keyframes domeShake { 
          0% { transform: translate(0,0) rotate(0deg); } 
          25% { transform: translate(2px, 1px) rotate(1deg); } 
          75% { transform: translate(-1px, -2px) rotate(-1deg); } 
        }

        .gumball {
          position: absolute;
          border-radius: 50%;
          box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
        }
        .gumball::before {
          content: ''; position: absolute; top: 20%; left: 20%; width: 30%; height: 20%;
          background: rgba(255,255,255,0.6); border-radius: 50%; transform: rotate(-45deg);
        }

        .machine-base { 
          position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); 
          filter: drop-shadow(0 10px 15px rgba(0,0,0,0.2));
          z-index: 1;
        }

        .crank-group { transition: opacity 0.2s; cursor: pointer; }
        .crank-group:hover .crank-handle circle { filter: brightness(1.15); }
        .crank-group:hover .crank-handle rect { filter: brightness(1.1); }
        .crank-handle { transform-origin: 140px 80px; }

        @keyframes crankTurn { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }

        #dispensed-gumball {
          position: absolute; left: 50%; top: 300px; transform: translateX(-50%);
          width: 30px; height: 30px; border-radius: 50%; 
          display: none; z-index: 100;
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        #dispensed-gumball:hover { transform: translateX(-50%) scale(1.1); filter: brightness(1.1); }

        @keyframes dropBounce {
          0% { transform: translateX(-50%) translateY(-100px); opacity: 0; }
          40% { transform: translateX(-50%) translateY(0); opacity: 1; }
          60% { transform: translateX(-50%) translateY(-15px); }
          80% { transform: translateX(-50%) translateY(0); }
          90% { transform: translateX(-50%) translateY(-5px); }
          100% { transform: translateX(-50%) translateY(0); }
        }

        #dispensed-gumball.popping { animation: popAnimation 0.25s ease-out forwards; }
        @keyframes popAnimation {
          0% { transform: translateX(-50%) scale(1); opacity: 1; }
          100% { transform: translateX(-50%) scale(1.6); opacity: 0; }
        }

        #prize-box {
          position: absolute; top: 0; left: 0;
          width: 100%; height: 100%;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(4px);
          display: flex; flex-direction: column; 
          align-items: center; justify-content: center;
          z-index: 1000;
          opacity: 0; pointer-events: none;
          transition: opacity 0.3s;
        }
        #prize-box.hidden { display: none; }
        #prize-box.enter { opacity: 1; pointer-events: all; }
        #prize-box.enter .content { animation: scaleIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        .prize-card {
            background: white; padding: 20px; border-radius: 15px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            text-align: center; width: 80%; border: 2px solid #f39c12;
        }
        @keyframes scaleIn {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
      </style>

      <div class="game-container">
        <h2 class="game-title">🍬 Gumball Machine</h2>
        <div class="game-subtitle">Turn the crank to get your prize!</div>
        
        <div class="gumball-machine">
          <div class="dome">${gumballsHTML}</div>
          
          <svg class="machine-base" width="200" height="140" viewBox="0 0 200 140">
            <defs>
              <linearGradient id="baseGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#e74c3c;stop-opacity:1" />
                <stop offset="100%" style="stop-color:#c0392b;stop-opacity:1" />
              </linearGradient>
              <linearGradient id="coinSlotGrad"><stop offset="0%" stop-color="#2c3e50"/><stop offset="100%" stop-color="#34495e"/></linearGradient>
              <linearGradient id="crankGrad"><stop offset="0%" stop-color="#f39c12"/><stop offset="100%" stop-color="#d68910"/></linearGradient>
            </defs>

            <rect x="20" y="20" width="160" height="120" rx="15" fill="url(#baseGrad)" stroke="#a93226" stroke-width="2"/>
            <rect x="30" y="60" width="140" height="2" fill="#a93226" opacity="0.5"/>
            <rect x="30" y="100" width="140" height="2" fill="#a93226" opacity="0.5"/>
            <rect x="80" y="110" width="40" height="15" rx="7" fill="url(#coinSlotGrad)"/>
            <rect x="70" y="35" width="60" height="15" rx="7" fill="#34495e"/>
            <text x="100" y="46" text-anchor="middle" fill="white" font-size="8" font-weight="bold">GUMBALL</text>

            <g class="crank-group">
                <rect x="130" y="65" width="60" height="40" fill="transparent" />
                <g class="crank-handle">
                  <circle cx="140" cy="80" r="9" fill="#a93226" stroke="#7d2419" stroke-width="1"/>
                  <rect x="140" y="76" width="35" height="8" rx="4" fill="url(#crankGrad)" stroke="#b7950b" stroke-width="1"/>
                  <circle cx="175" cy="80" r="9" fill="#d68910" stroke="#b7950b" stroke-width="1"/>
                </g>
            </g>
          </svg>
          
          <div id="dispensed-gumball"></div>
        </div>
        
        <div id="prize-box" class="hidden">
          <div class="content prize-card">
              <h3 style="margin: 10px 0; color: #f39c12;">🎉 Congratulations!</h3>
              <p style="margin: 5px 0; color: #666;">You won:</p>
              <p id="prize-text" style="font-weight: bold; color: #2c3e50; margin: 10px 0; font-size: 18px;"></p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('gumball-machine', GumballMachine);