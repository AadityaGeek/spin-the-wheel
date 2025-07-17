const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const optionInput = document.getElementById("optionInput");
const addOptionBtn = document.getElementById("addOptionBtn");
const spinBtn = document.getElementById("spinBtn");
const optionList = document.getElementById("optionList");
const resultModal = document.getElementById("resultModal");
const resultText = document.getElementById("resultText");
const modalTitle = document.getElementById("modalTitle");
const closeModalBtn = document.getElementById("closeModalBtn");

// Initial options for the wheel, now with a 'weight' property
let options = [
  { text: "Spin Again", weight: 1 },
  { text: "Next Time", weight: 1 },
  { text: "Big Prize!", weight: 1 },
  { text: "Small Gift", weight: 1 },
  { text: "Good Luck", weight: 1 },
];
// currentRotationAngle tracks the wheel's actual rotation for drawing
let currentRotationAngle = 0; // in radians
let arc = Math.PI / (options.length / 2); // Angle for each segment (visual, equal size)

let spinTimeout = null;
let spinArcTargetDegrees = 0; // The target *total* degrees to spin to for the winner
let spinTime = 0;
let spinTimeTotal = 0; // Total duration of the spin animation
let isSpinning = false;
let selectedWinningOption = null; // Store the probabilistically selected winner
let initialSpinAngle = 0; // Store startAngle at the beginning of the spin animation
let isEditing = false;

const colors = [
  "#FFD700",
  "#FF6347",
  "#6A5ACD",
  "#32CD32",
  "#FF69B4",
  "#4682B4",
  "#DAA520",
  "#BA55D3",
  "#F08080",
  "#20B2AA",
  "#7B68EE",
  "#ADFF2F",
  "#FF4500",
  "#1E90FF",
  "#8A2BE2",
  "#F4A460",
];

/**
 * Draws the spin wheel on the canvas and updates the options list.
 * Includes logic for drawing an empty wheel if no options are present
 * and adds remove buttons to each option in the list.
 */
function drawWheel() {
  optionList.innerHTML = ""; // Clear existing options list before redrawing

  // Update arc based on current number of options
  arc = options.length > 0 ? Math.PI / (options.length / 2) : 0; // Prevent division by zero

  // Set canvas size for responsiveness
  const size = Math.min(canvas.offsetWidth, canvas.offsetHeight);
  canvas.width = size;
  canvas.height = size;

  // Ensure outsideRadius is never negative or zero
  let outsideRadius = Math.max(1, size / 2 - 20); // Radius of the wheel. Ensure it's at least 1.
  let textRadius = outsideRadius * 0.8; // Radius for text placement
  let insideRadius = 0; // Inner radius (for a full circle)

  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

  // Handle case where there are no options
  if (options.length === 0) {
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, outsideRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "#e2e8f0"; // Light gray for empty wheel
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#4a5568";
    ctx.stroke();

    ctx.fillStyle = "#4a5568";
    ctx.font = "bold 20px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add Options", canvas.width / 2, canvas.height / 2);
    spinBtn.disabled = true; // Disable spin button if no options
  } else {
    spinBtn.disabled = false; // Enable if options exist
    for (let i = 0; i < options.length; i++) {
      // Use currentRotationAngle for drawing segments
      let angle = currentRotationAngle + i * arc;
      ctx.fillStyle = colors[i % colors.length]; // Cycle through colors

      ctx.beginPath();
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        outsideRadius,
        angle,
        angle + arc,
        false
      );
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        insideRadius,
        angle + arc,
        angle,
        true
      );
      ctx.fill();

      // Draw text for each segment
      ctx.save();
      ctx.fillStyle = "white";
      ctx.font = "bold 16px Inter, sans-serif";
      ctx.translate(
        canvas.width / 2 + Math.cos(angle + arc / 2) * textRadius,
        canvas.height / 2 + Math.sin(angle + arc / 2) * textRadius
      );
      ctx.rotate(angle + arc / 2 + Math.PI / 2); // Rotate text to be upright
      let text = options[i].text; // Use text property
      let textWidth = ctx.measureText(text).width;
      // If text is too long, truncate it
      if (textWidth > outsideRadius * 1.5) {
        let maxChars = Math.floor(
          (text.length * (outsideRadius * 1.5)) / textWidth
        );
        text = text.substring(0, maxChars - 3) + "...";
      }
      ctx.fillText(text, -ctx.measureText(text).width / 2, 0); // Center text
      ctx.restore();
    }
  }

  // Draw the center circle
  ctx.beginPath();
  ctx.arc(
    canvas.width / 2,
    canvas.height / 2,
    insideRadius + 20,
    0,
    2 * Math.PI,
    false
  ); // Smaller center circle
  ctx.fillStyle = "#4a5568"; // Dark gray center
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#cbd5e0"; // Light gray border
  ctx.stroke();

  // Update pointer position dynamically
  const pointer = document.querySelector(".pointer");
  const wheelCenterY = canvas.height / 2;
  // Calculate pointerTipY ensuring it's not off-screen for very small wheels
  const pointerTipY = Math.max(0, wheelCenterY - outsideRadius - 10); // 10px buffer above wheel, ensure non-negative

  pointer.style.transform = `translate(-50%, -100%)`; // Keeps the pointer's tip horizontally centered

  // Calculate total weight for probability display
  const totalWeight = options.reduce(
    (sum, option) => sum + (option.weight || 1),
    0
  );

  // Populate options list with remove buttons and editable probability
  options.forEach((option, index) => {
    const listItem = document.createElement("li");
    let probability =
      totalWeight > 0 ? ((option.weight / totalWeight) * 100).toFixed(1) : 0;
    listItem.className = "flex justify-between items-center py-1 gap-2";

    // --- Editable Text ---
    const textSpan = document.createElement("span");
    textSpan.className =
      "text-gray-700 cursor-pointer hover:underline editable-option-text";
    textSpan.dataset.index = index;
    textSpan.textContent = option.text;

    textSpan.addEventListener("click", (event) => {
      if (isEditing) return;
      isEditing = true;
      const idx = parseInt(event.target.dataset.index);
      const currentText = options[idx].text;

      const inputField = document.createElement("input");
      inputField.type = "text";
      inputField.className = "editable-text-input";
      inputField.value = currentText;
      inputField.maxLength = 32;

      const parent = event.target.parentNode;
      parent.replaceChild(inputField, event.target);
      inputField.focus();

      const saveText = () => {
        let newText = inputField.value.trim();
        if (!newText) {
          showMessageModal(
            "Invalid Text",
            "Option text cannot be empty.",
            true
          );
          newText = currentText;
        }
        options[idx].text = newText;
        isEditing = false;
        drawWheel();
      };

      inputField.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveText();
      });
      inputField.addEventListener("blur", () => {
        setTimeout(() => {
          if (document.activeElement !== inputField) saveText();
        }, 100);
      });
    });

    // --- Editable Weight ---
    const weightSpan = document.createElement("span");
    weightSpan.className =
      "ml-2 text-gray-500 cursor-pointer hover:underline editable-option-weight";
    weightSpan.dataset.index = index;
    weightSpan.textContent = `(${probability}%)`;

    weightSpan.addEventListener("click", (event) => {
      if (isEditing) return;
      isEditing = true;
      const idx = parseInt(event.target.dataset.index);
      const currentWeight = options[idx].weight;

      const inputField = document.createElement("input");
      inputField.type = "number";
      inputField.className = "editable-weight-input";
      inputField.value = currentWeight;
      inputField.min = "0";
      inputField.step = "0.1";
      inputField.style.width = "60px";

      const parent = event.target.parentNode;
      parent.replaceChild(inputField, event.target);
      inputField.focus();

      const saveWeight = () => {
        let newWeight = parseFloat(inputField.value);
        if (isNaN(newWeight) || newWeight < 0) {
          showMessageModal(
            "Invalid Weight",
            "Please enter a non-negative number for the weight.",
            true
          );
          newWeight = currentWeight;
        }
        options[idx].weight = newWeight;
        isEditing = false;
        drawWheel();
      };

      inputField.addEventListener("keypress", (e) => {
        if (e.key === "Enter") saveWeight();
      });
      inputField.addEventListener("blur", () => {
        setTimeout(() => {
          if (document.activeElement !== inputField) saveWeight();
        }, 100);
      });
    });

    // --- Remove Button ---
    const removeButton = document.createElement("button");
    removeButton.className =
      "remove-option-btn text-gray-400 hover:text-red-500 transition-colors duration-200";
    removeButton.dataset.index = index;
    removeButton.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm3 3a1 1 0 011-1h1a1 1 0 110 2h-1a1 1 0 01-1-1zm-1 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clip-rule="evenodd" />
      </svg>
  `;
    removeButton.addEventListener("click", (event) => {
      const idxToRemove = parseInt(event.currentTarget.dataset.index);
      if (
        !isNaN(idxToRemove) &&
        idxToRemove >= 0 &&
        idxToRemove < options.length
      ) {
        options.splice(idxToRemove, 1);
        drawWheel();
      }
    });

    // --- Assemble List Item ---
    // Use a flex row for text and weight, so they don't overlap
    const textWeightWrapper = document.createElement("span");
    textWeightWrapper.className = "flex flex-row items-center gap-1";
    textWeightWrapper.appendChild(textSpan);
    textWeightWrapper.appendChild(weightSpan);

    listItem.appendChild(textWeightWrapper);
    listItem.appendChild(removeButton);

    optionList.appendChild(listItem);
  });
}

/**
 * Generic function to display a modal message.
 * @param {string} title - The title of the modal.
 * @param {string} message - The main message to display.
 * @param {boolean} isError - If true, styles the modal as an error message.
 */
function showMessageModal(title, message, isError = false) {
  resultText.textContent = message;
  modalTitle.textContent = title;

  // Adjust title color based on whether it's an error
  if (isError) {
    modalTitle.classList.remove("text-indigo-700");
    modalTitle.classList.add("text-red-700");
  } else {
    modalTitle.classList.remove("text-red-700");
    modalTitle.classList.add("text-indigo-700");
  }

  resultModal.classList.add("show");
  resultModal.classList.remove("opacity-0", "pointer-events-none");
  resultModal.querySelector(".transform").classList.add("scale-100");
}

/**
 * Hides the result/message modal.
 */
function hideResultModal() {
  resultModal.classList.remove("show");
  resultModal.classList.add("opacity-0", "pointer-events-none");
  resultModal.querySelector(".transform").classList.remove("scale-100");
}

/**
 * Displays the modal with the winning option.
 * @param {string} text - The winning option text.
 */
function showWinningOptionModal(text) {
  showMessageModal("Congratulations!", `You Won: ${text}`, false);
}

// Add new option functionality
addOptionBtn.addEventListener("click", () => {
  const newOptionText = optionInput.value.trim();
  if (newOptionText && options.length < 16) {
    // Limit options to prevent clutter
    options.push({ text: newOptionText, weight: 1 }); // Add with default weight 1
    optionInput.value = "";
    drawWheel(); // Redraw the wheel with the new option
  } else if (options.length >= 16) {
    showMessageModal(
      "Limit Reached",
      "You've reached the maximum number of options (16).",
      true
    );
  } else {
    showMessageModal("Invalid Input", "Please enter a valid option.", true);
  }
});

optionInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    addOptionBtn.click();
  }
});

/**
 * Animates the wheel rotation.
 */
function animateSpin() {
  spinTime += 30; // Increment spin time
  if (spinTime >= spinTimeTotal) {
    // Animation is complete, set final angle and stop.
    // Ensure currentRotationAngle precisely matches the target at the very end
    currentRotationAngle =
      initialSpinAngle + (spinArcTargetDegrees * Math.PI) / 180;
    stopRotateWheel();
    return;
  }

  // Calculate the current rotation offset using easeOut
  const currentSpinOffsetDegrees = easeOut(
    spinTime,
    0,
    spinArcTargetDegrees,
    spinTimeTotal
  );
  currentRotationAngle =
    initialSpinAngle + (currentSpinOffsetDegrees * Math.PI) / 180;

  drawWheel(); // Redraw the wheel at the new angle
  spinTimeout = setTimeout(animateSpin, 30); // Continue animation
}

/**
 * Stops the wheel rotation and displays the probabilistically chosen winning option.
 */
function stopRotateWheel() {
  clearTimeout(spinTimeout); // Stop the animation timeout
  isSpinning = false;
  spinBtn.disabled = false; // Enable spin button

  if (options.length === 0) {
    showMessageModal("No Options", "The wheel is empty!", true);
    return;
  }

  // The `selectedWinningOption` was already chosen when the spin started.
  // Just display it.
  showWinningOptionModal(selectedWinningOption.text);
}

/**
 * Easing function for smooth deceleration (cubic ease-out).
 * @param {number} t - Current time (spinTime).
 * @param {number} b - Beginning value (0).
 * @param {number} c - Change in value (spinArcTargetDegrees).
 * @param {number} d - Duration (spinTimeTotal).
 * @returns {number} The eased value.
 */
function easeOut(t, b, c, d) {
  t /= d;
  t--;
  return c * (t * t * t + 1) + b;
}

spinBtn.addEventListener("click", () => {
  if (options.length === 0) {
    showMessageModal(
      "No Options",
      "Please add at least one option to spin the wheel!",
      true
    );
    return;
  }
  if (isSpinning) return; // Prevent multiple spins

  isSpinning = true;
  spinBtn.disabled = true; // Disable spin button while spinning

  // --- 1. Probabilistically pre-select the winning option ---
  const totalWeight = options.reduce(
    (sum, option) => sum + (option.weight || 1),
    0
  );
  let randomPoint = Math.random() * totalWeight;
  let cumulativeWeight = 0;

  let preSelectedWinningOptionIndex = 0; // Default to first option
  for (let i = 0; i < options.length; i++) {
    cumulativeWeight += options[i].weight || 1;
    if (randomPoint < cumulativeWeight) {
      preSelectedWinningOptionIndex = i;
      break;
    }
  }
  selectedWinningOption = options[preSelectedWinningOptionIndex]; // Store the chosen option object

  // --- 2. Calculate `spinArcTargetDegrees` to make the wheel land on this `selectedWinningOption` ---
  // The pointer is fixed at the top (visually 270 degrees or 3*Math.PI/2 radians on canvas).
  // We want the center of the `selectedWinningOptionIndex` segment to align with this pointer.
  // The center of segment `i` when the wheel's 0-radian mark is at canvas 0, is `i * arc + arc/2`.
  const targetSegmentCenterAngleFromWheelZero =
    preSelectedWinningOptionIndex * arc + arc / 2;

  // `requiredCurrentRotationAngleAtStop` is what `currentRotationAngle` should be *at the end* of the spin
  // to place the `targetSegmentCenterAngleFromWheelZero` under the pointer.
  // ( `requiredCurrentRotationAngleAtStop` + `targetSegmentCenterAngleFromWheelZero` ) % (2*Math.PI) = (3*Math.PI/2) % (2*Math.PI)
  let requiredCurrentRotationAngleAtStop =
    (3 * Math.PI) / 2 - targetSegmentCenterAngleFromWheelZero;

  // Normalize `requiredCurrentRotationAngleAtStop` to be between 0 and 2*Math.PI
  requiredCurrentRotationAngleAtStop =
    ((requiredCurrentRotationAngleAtStop % (2 * Math.PI)) + 2 * Math.PI) %
    (2 * Math.PI);

  // Add a small random offset within the segment for a more natural stop,
  // while still ensuring it lands within the correct segment.
  // This offset should be less than half the segment arc to ensure it stays within.
  const smallRandomOffset = (Math.random() - 0.5) * arc * 0.8; // +/- 40% of the segment width
  requiredCurrentRotationAngleAtStop += smallRandomOffset;
  // Re-normalize after adding offset
  requiredCurrentRotationAngleAtStop =
    ((requiredCurrentRotationAngleAtStop % (2 * Math.PI)) + 2 * Math.PI) %
    (2 * Math.PI);

  // Calculate the total amount of radians the wheel needs to spin
  // from its *current* `currentRotationAngle` to reach `requiredCurrentRotationAngleAtStop`,
  // plus several full revolutions for visual effect.
  const minFullRotations = 5; // Minimum revolutions
  const randomFullRotations = Math.floor(Math.random() * 5); // 0 to 4 additional random full rotations (total 5-9)

  // Normalize current `currentRotationAngle`
  let currentNormalizedAngle =
    ((currentRotationAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Calculate the angular difference to reach the target within one revolution
  let angularDifference =
    requiredCurrentRotationAngleAtStop - currentNormalizedAngle;

  // Ensure the spin is forward (positive rotation)
  if (angularDifference < 0) {
    angularDifference += 2 * Math.PI;
  }

  const totalSpinRadians =
    (minFullRotations + randomFullRotations) * 2 * Math.PI + angularDifference;

  // Convert total spin from radians to degrees for `spinArcTargetDegrees`
  spinArcTargetDegrees = (totalSpinRadians * 180) / Math.PI;

  initialSpinAngle = currentRotationAngle; // Store current angle before starting animation
  spinTime = 0;
  spinTimeTotal = Math.random() * 3000 + 4000; // Spin duration for 4-7 seconds

  animateSpin(); // Start the animation
});

closeModalBtn.addEventListener("click", hideResultModal);

// Initial draw when the page loads
window.onload = function () {
  drawWheel();
};

// Redraw wheel and update pointer on window resize for responsiveness
window.addEventListener("resize", () => {
  if (!isEditing) {
    drawWheel();
  }
});
