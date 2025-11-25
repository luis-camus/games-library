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

  connectedCallback() {
      // Init is handled by attributeChangedCallback when config is present
  }

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

    // FIX 1: Reduced count from 300 to 120 so they don't blob together
    const totalBalls = 120; 

    for (let i = 0; i < totalBalls; i++) {
        const colorIndex = i % this.config.options.length;
        const option = this.config.options[colorIndex];
        
        this.gameState.gumballs.push({
          color: option.color,
          prize: option.prize,
          isWinning: false,
          // FIX 2: Adjusted positions to keep balls strictly inside the dome
          left: Math.random() * 88, // 0% to 88% (prevents right overflow)
          top: Math.random() * 88,  // 0% to 88% (prevents bottom overflow)
          zIndex: Math.floor(Math.random() * 50)
        });
    }
    
    // Set the winner
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
    const crankHandle = this.root.querySelector('.crank-handle');
    if(crankHandle) {
        crankHandle.addEventListener('click', () => this.#handleCrankClick());
    }
  }

  #handleCrankClick() {
    if (this.gameState.isDispensing || this.gameState.gameWon) return;

    this.gameState.isDispensing = true;
    this.#animateCrank();
    this.#dispenseGumball();
  }

  #animateCrank() {
    const crankHandle = this.root.querySelector('.crank-handle');
    crankHandle.style.animation = 'crankTurn 1s ease-out';
    setTimeout(() => { crankHandle.style.animation = ''; }, 1000);
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
      dispensedGumball.style.animation = 'gumballAppear 1s ease-out';
      
      dispensedGumball.style.cursor = 'pointer';
      dispensedGumball.onclick = () => this.#popGumball(dispensedGumball);
      
    }, 1000); 
  }

  #popGumball(gumballElement) {
    if (this.gameState.gameWon) return;
    
    gumballElement.classList.add('popping');
    
    setTimeout(() => {
      gumballElement.style.display = 'none';
      this.#showPrize();
    }, 300);
  }

  #showPrize() {
    const winningOption = this.config.options[this.config.winningIndex];
    const prizeBox = this.root.querySelector('#prize-box');
    const prizeText = this.root.querySelector('#prize-text');
    
    prizeText.textContent = this.config.prize_text || winningOption.prize;
    prizeBox.classList.remove('hidden');
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
        z-index: ${gumball.zIndex};
      "></div>
    `).join('');
    
    this.root.innerHTML = `
      <style>
        :host { display: block; font-family: sans-serif; }
        .game-container {
          width: 250px; height: 450px; margin: 20px auto;
          text-align: center; position: relative; padding: 20px;
          box-shadow: rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px;
          border-radius: 20px;
          background: linear-gradient(135deg, #f8f9fa, #e9ecef);
          overflow: hidden;
        }

        .game-title { font-size: 20px; font-weight: bold; margin-bottom: 5px; color: #2c3e50; position: relative; z-index: 10; }
        .game-subtitle { font-size: 12px; color: #34495e; margin-bottom: 15px; position: relative; z-index: 10; }

        .gumball-machine {
          position: relative; width: 200px; height: 320px; margin: 0 auto;
        }

        /* Dome */
        .dome {
          width: 200px; height: 200px; border-radius: 50%;
          background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.3), rgba(200,200,200,0.5));
          border: 3px solid #bdc3c7;
          box-shadow: inset 20px -20px 40px rgba(255,255,255,0.4), inset -20px 20px 40px rgba(0,0,0,0.1), 0 8px 20px rgba(0,0,0,0.2);
          overflow: hidden;
          position: relative; 
        }

        .dome.jiggling { animation: domeJiggle 0.1s ease-in-out infinite; }
        @keyframes domeJiggle {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(1px); }
          75% { transform: translateX(-1px); }
        }

        /* Gumball - FIX 3: Smaller size (15px) for better realism */
        .gumball {
          position: absolute;
          width: 15px; height: 15px; 
          border-radius: 50%;
          box-shadow: 1px 1px 2px rgba(0,0,0,0.3);
        }
        .gumball::before {
          content: ''; position: absolute; top: 3px; left: 3px; width: 5px; height: 3px;
          background: rgba(255,255,255,0.6); border-radius: 50%; transform: rotate(-45deg);
        }

        /* Base & Crank */
        .machine-base { position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); filter: drop-shadow(0 8px 16px rgba(0,0,0,0.2)); }
        .crank-handle { cursor: pointer; transition: transform 0.2s ease; transform-origin: 140px 80px; }
        .crank-handle:hover { transform: scale(1.05); }
        @keyframes crankTurn { 
            0% { transform: rotate(0deg); } 
            100% { transform: rotate(360deg); } 
        }

        #dispensed-gumball {
          position: absolute; left: 50%; top: 300px; transform: translateX(-50%);
          width: 30px; height: 30px; border-radius: 50%; display: none; z-index: 100;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3); transition: transform 0.1s; cursor: pointer;
        }
        #dispensed-gumball.popping { animation: popAnimation 0.3s ease-out forwards; }
        @keyframes gumballAppear {
          0% { opacity: 0; transform: translateX(-50%) translateY(-10px) scale(0.5); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes popAnimation {
          0% { transform: translateX(-50%) scale(1); }
          100% { transform: translateX(-50%) scale(0); opacity: 0; }
        }

        #prize-box {
          position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
          width: 80%; background: #fffff0; border: 4px solid #f39c12;
          border-radius: 20px; padding: 20px; text-align: center;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1000;
          animation: prizeAppear 0.5s ease-out;
        }
        @keyframes prizeAppear {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }

        .hidden { display: none !important; }
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
            <g class="crank-handle" style="transform-origin: 140px 80px;">
              <circle cx="140" cy="80" r="6" fill="#a93226" stroke="#7d2419" stroke-width="1"/>
              <rect x="140" y="77" width="25" height="6" rx="3" fill="url(#crankGrad)" stroke="#b7950b" stroke-width="1"/>
              <circle cx="165" cy="80" r="6" fill="#d68910" stroke="#b7950b" stroke-width="1"/>
            </g>
          </svg>
          
          <div id="dispensed-gumball"></div>
        </div>
        
        <div id="prize-box" class="hidden">
          <h3 style="margin: 10px 0; color: #f39c12;">🎉 Congratulations 🎉</h3>
          <p style="margin: 10px 0;">You have won</p>
          <p id="prize-text" style="font-weight: bold; color: #2c3e50; margin: 10px 0; font-size: 16px;"></p>
        </div>
      </div>
    `;
  }
}

customElements.define('gumball-machine', GumballMachine);