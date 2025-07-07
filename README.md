# Spin the Wheel

A dynamic, customizable spin wheel web app for raffles, giveaways, classroom activities, and more. Built with vanilla JavaScript, HTML5 Canvas, and styled with Tailwind CSS for a modern, responsive UI.

## Features

- 🎨 **Interactive Wheel:** Visually appealing, animated spin wheel rendered on canvas.
- ➕ **Custom Options:** Add, remove, and edit up to 16 options dynamically.
- ⚖️ **Weighted Probabilities:** Assign custom weights to each option for probability-based outcomes.
- 🖱️ **Responsive UI:** Works seamlessly on desktop and mobile devices.
- 🏆 **Result Modal:** Displays the winning option in a stylish modal popup.
- 🧑‍💻 **No Dependencies:** Pure HTML, CSS, and JS (Tailwind via CDN).

## Demo

![Spin the Wheel Screenshot](screenshot.png)  
*Add a screenshot of your app here!*

## Getting Started

### 1. Clone or Download

```bash
git clone https://github.com/yourusername/spin-the-wheel.git
cd spin-the-wheel
```

Or simply download and extract the ZIP.

### 2. Open in Browser

Just open `index.html` in your favorite browser. No build step required.

## Usage

1. **Add Options:**  
   Enter a label in the input and click "Add Option". Repeat for up to 16 options.

2. **Edit Probabilities:**  
   Click the percentage next to an option to set its weight (higher weight = higher chance).

3. **Remove Options:**  
   Click the trash icon next to an option to remove it.

4. **Spin the Wheel:**  
   Click the "SPIN!" button. The wheel will animate and land on a randomly selected option, weighted by your settings.

5. **View Result:**  
   The winning option is shown in a modal. Click "Awesome!" to close.

## Customization

- **Colors:**  
  Edit the `colors` array in `script.js` to change segment colors.
- **Styling:**  
  Modify `style.css` or extend Tailwind classes in `index.html` for further customization.

## File Structure
.
├── index.html # Main HTML file
├── style.css # Custom styles
├── script.js # Wheel logic and interactivity
└── README.md # Project documentation

## Accessibility & Responsiveness

- Fully keyboard accessible (tab to input, enter to add, etc.)
- Responsive layout adapts to all screen sizes.

## License

MIT License.  
Feel free to use, modify, and share!

## Credits

- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling.
- [Google Fonts - Inter](https://fonts.google.com/specimen/Inter) for typography.

---

*Created by [Aaditya Kumar](https://github.com/AadityaGeek). Contributions welcome!*
