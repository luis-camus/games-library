# 🎮 Mini Games Web Component Library

A lightweight, dependency-free library of interactive mini-games built as standard Web Components. These components are designed for portability, allowing "one-line" implementation into any web application (Vanilla, React, Vue, etc.).

## 🚀 Quick Start

### 1. Import the Library
You can import the entire library or specific components via JavaScript modules.

```html
<script type="module" src="./index.js"></script>
<script type="module" src="./components/Gumball.js"></script>
```

### 2. Add the Component to HTML

Add the custom element tag and pass the configuration as a JSON string in the config attribute.

<gumball-machine config='{ "winningIndex": 0, "options": [...] }'></gumball-machine>




### 🧩 Components & Configuration
## 1. Spin Wheel (<spin-wheel>)

A rotating wheel of fortune with configurable segments.

Usage:

HTML

<spin-wheel config='{
  "winningIndex": 2,
  "options": [
    { "icon": "url(star.png)", "color": "#16a085", "prize": "100 Points" },
    { "icon": "url(gift.png)", "color": "#2980b9", "prize": "Mystery Box" },
    { "icon": "url(coin.png)", "color": "#f39c12", "prize": "$20 Credit" }
  ]
}'></spin-wheel>


## 2. Scratch Card (<scratch-card>)

A canvas-based scratch-off ticket.

Usage:

HTML
<scratch-card config='{
  "pre_text": "Scratch to win!",
  "post_text": "You won 100 Points",
  "bg": "[https://path.to/prize-image.jpg](https://path.to/prize-image.jpg)",
  "fg": "[https://path.to/overlay-image.png](https://path.to/overlay-image.png)",
  "clear_percentage": 50
}'></scratch-card>


⚠️ CORS Warning: Since this component uses HTML5 Canvas manipulation, images loaded from external domains must allow Cross-Origin Resource Sharing (CORS), otherwise the component will throw a "Tainted Canvas" security error.

## 3. Gumball Machine (<gumball-machine>)

A dispensing machine simulation. Supports two visual modes: CSS Generated Pile (randomly scattered DOM elements) or Static Image.

Usage:

HTML
<gumball-machine config='{
  "winningIndex": 1,
  "prize_text": "Teal Prize!",
  "options": [
    { "color": "#ff6b6b", "prize": "Red Prize" },
    { "color": "#4ecdc4", "prize": "Teal Prize" }
  ]
}'></gumball-machine>

### 📢 Handling Events
All components dispatch a standard DOM event named game-completed when the game finishes (wheel stops, scratch revealed, or ball dispensed).

You can listen for this event at the document body level or on the specific element.

JavaScript
document.body.addEventListener('game-completed', (event) => {
    const result = event.detail;
    
    console.log("Game Over!");
    console.log("Prize:", result.prize);
    console.log("Color/Index:", result.color || result.index);
    
    // Example: Send data to backend
    // api.claimReward(result.prize);
});


### 🎨 Customization & Styling
These components use Shadow DOM to encapsulate styles, meaning global CSS does not affect them directly. However, they are designed to be self-contained.

To resize the components, you can wrap them in a container div and use CSS transform: scale(...) if strictly necessary, but they are built with fixed dimensions optimized for mobile/widget views:

Spin Wheel: 266px width

Scratch Card: 250px width

Gumball Machine: 250px width


### 📂 Project Structure
Plaintext
/
├── index.html            # Demo usage
├── index.js              # Library export file
├── components/
│   ├── SpinWheel.js      # Logic for Wheel
│   ├── ScratchCard.js    # Logic for Canvas Scratch
│   └── Gumball.js        # Logic for CSS/Image Gumball