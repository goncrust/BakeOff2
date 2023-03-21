// Database (CHANGE THESE!)
const GROUP_NUMBER = 40;
const RECORD_TO_FIREBASE = false; // Set to 'true' to record user results to Firebase

// Pixel density and setup variables (DO NOT CHANGE!)
let PPI, PPCM;
const NUM_OF_TRIALS = 12; // The numbers of trials (i.e., target selections) to be completed
const GRID_ROWS = 8; // We divide our 80 targets in a 8x10 grid
const GRID_COLUMNS = 10; // We divide our 80 targets in a 8x10 grid
let continue_button;
let legendas_table; // The item list from the "legendas" CSV
let legendas; // Name column from the table, sorted

// Metrics
let testStartTime, testEndTime; // time between the start and end of one attempt (8 trials)
let hits = 0; // number of successful selections
let misses = 0; // number of missed selections (used to calculate accuracy)
let database; // Firebase DB

// Study control parameters
let draw_targets = false; // used to control what to show in draw()
let trials; // contains the order of targets that activate in the test
let current_trial = 0; // the current trial number (indexes into trials array above)
let attempt = 0; // users complete each test twice to account for practice (attemps 0 and 1)

// Intervals and letters
const letter_intervals = ["0%", "A-B", "C-K", "L-O", "P-R", "S-Z"];
const letters = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
];

// Target list
let targets = {};

// State
let opened_intervals = {};
let opened_letters = {};

function close_intervals() {
  for (const interval of letter_intervals) opened_intervals[interval] = false;
}

function close_letters() {
  for (const letter of letters) opened_letters[letter] = false;
}

function open_interval(interval) {
  close_intervals();
  close_letters();

  opened_intervals[interval] = true;
}

function open_letter(letter) {
  close_letters();
  opened_letters[letter] = true;
}

// Ensures important data is loaded before the program starts
function preload() {
  table = loadTable("legendas.csv", "csv", "header");
}

// Runs once at the start
function setup() {
  legendas = table.getColumn("name").sort();

  close_intervals();
  close_letters();

  createCanvas(700, 500); // window size in px before we go into fullScreen()
  frameRate(60); // frame rate (DO NOT CHANGE!)

  randomizeTrials(); // randomize the trial order at the start of execution
  drawUserIDScreen(); // draws the user start-up screen (student ID and display size)
}

// Runs every frame and redraws the screen
function draw() {
  if (draw_targets && attempt < 2) {
    // The user is interacting with the 6x3 target grid
    background(color(0, 0, 0)); // sets background to black

    // Print trial count at the top left-corner of the canvas
    textFont("Arial", 16);
    fill(color(255, 255, 255));
    textAlign(LEFT);
    text("Trial " + (current_trial + 1) + " of " + trials.length, 50, 20);

    // Draw all targets, traversing the target object
    for (let i = 0; i < letter_intervals.length; i++) {
      targets[letter_intervals[i]].target.draw();
      if (opened_intervals[letter_intervals[i]]) {
        for (const letter in targets[letter_intervals[i]].children) {
          targets[letter_intervals[i]].children[letter].target.draw();
          if (opened_letters[letter] && letter_intervals[i] != "0%") {
            for (const word in targets[letter_intervals[i]].children[letter]
              .children) {
              targets[letter_intervals[i]].children[letter].children[
                word
              ].target.draw();
            }
          }
        }
      }
    }

    // Draw the target label to be selected in the current trial
    textFont("Arial", 20);
    textAlign(CENTER);
    text(legendas[trials[current_trial]], width / 2, height - 20);
  }
}

// Print and save results at the end of 54 trials
function printAndSavePerformance() {
  // DO NOT CHANGE THESE!
  let accuracy = parseFloat(hits * 100) / parseFloat(hits + misses);
  let test_time = (testEndTime - testStartTime) / 1000;
  let time_per_target = nf(test_time / parseFloat(hits + misses), 0, 3);
  let penalty = constrain(
    (parseFloat(95) - parseFloat(hits * 100) / parseFloat(hits + misses)) * 0.2,
    0,
    100
  );
  let target_w_penalty = nf(
    test_time / parseFloat(hits + misses) + penalty,
    0,
    3
  );
  let timestamp =
    day() +
    "/" +
    month() +
    "/" +
    year() +
    "  " +
    hour() +
    ":" +
    minute() +
    ":" +
    second();

  textFont("Arial", 18);
  background(color(0, 0, 0)); // clears screen
  fill(color(255, 255, 255)); // set text fill color to white
  textAlign(LEFT);
  text(timestamp, 10, 20); // display time on screen (top-left corner)

  textAlign(CENTER);
  text("Attempt " + (attempt + 1) + " out of 2 completed!", width / 2, 60);
  text("Hits: " + hits, width / 2, 100);
  text("Misses: " + misses, width / 2, 120);
  text("Accuracy: " + accuracy + "%", width / 2, 140);
  text("Total time taken: " + test_time + "s", width / 2, 160);
  text("Average time per target: " + time_per_target + "s", width / 2, 180);
  text(
    "Average time for each target (+ penalty): " + target_w_penalty + "s",
    width / 2,
    220
  );

  // Saves results (DO NOT CHANGE!)
  let attempt_data = {
    project_from: GROUP_NUMBER,
    assessed_by: student_ID,
    test_completed_by: timestamp,
    attempt: attempt,
    hits: hits,
    misses: misses,
    accuracy: accuracy,
    attempt_duration: test_time,
    time_per_target: time_per_target,
    target_w_penalty: target_w_penalty,
  };

  // Send data to DB (DO NOT CHANGE!)
  if (RECORD_TO_FIREBASE) {
    // Access the Firebase DB
    if (attempt === 0) {
      firebase.initializeApp(firebaseConfig);
      database = firebase.database();
    }

    // Add user performance results
    let db_ref = database.ref("G" + GROUP_NUMBER);
    db_ref.push(attempt_data);
  }
}

// Mouse button was pressed - lets test to see if hit was in the correct target
function mousePressed() {
  // Only look for mouse releases during the actual test
  // (i.e., during target selections)
  if (draw_targets) {
    // Check if the user clicked over one of the targets
    for (let i = 0; i < letter_intervals.length; i++) {
      if (targets[letter_intervals[i]].target.clicked(mouseX, mouseY)) {
        open_interval(letter_intervals[i]);
        break;
      } else if (opened_intervals[letter_intervals[i]]) {
        for (const letter in targets[letter_intervals[i]].children) {
          if (
            targets[letter_intervals[i]].children[letter].target.clicked(
              mouseX,
              mouseY
            )
          ) {
            open_letter(letter);
            break;
          } else if (opened_letters[letter]) {
            for (const word in targets[letter_intervals[i]].children[letter]
              .children) {
              if (
                targets[letter_intervals[i]].children[letter].children[
                  word
                ].target.clicked(mouseX, mouseY)
              ) {
                if (word === table.getRow(trials[current_trial])[0]) hits++;
                else misses++;

                current_trial++;
                close_intervals();
                close_letters();
                break;
              }
            }
          }
        }
      }
    }

    // Check if the user has completed all trials
    if (current_trial === NUM_OF_TRIALS) {
      testEndTime = millis();
      draw_targets = false; // Stop showing targets and the user performance results
      printAndSavePerformance(); // Print the user's results on-screen and send these to the DB
      attempt++;

      // If there's an attempt to go create a button to start this
      if (attempt < 2) {
        continue_button = createButton("START 2ND ATTEMPT");
        continue_button.mouseReleased(continueTest);
        continue_button.position(
          width / 2 - continue_button.size().width / 2,
          height / 2 - continue_button.size().height / 2
        );
      }
    }
    // Check if this was the first selection in an attempt
    else if (current_trial === 1) testStartTime = millis();
  }
}

// Evoked after the user starts its second (and last) attempt
function continueTest() {
  close_intervals();
  close_letters();

  // Re-randomize the trial order
  randomizeTrials();

  // Resets performance variables
  hits = 0;
  misses = 0;

  current_trial = 0;
  continue_button.remove();

  // Shows the targets again
  draw_targets = true;
}

// Creates and positions the UI targets
function createTargets(target_size, horizontal_gap, vertical_gap) {
  let offset = 0;
  // Define the margins between targets by dividing the white space
  // for the number of targets minus one
  h_margin = horizontal_gap / (GRID_COLUMNS - 1);
  v_margin = vertical_gap / (GRID_ROWS - 1);

  // Intervals
  for (let c = 1; c < 7; c++) {
    let target_x = 40 + (h_margin + target_size) * c + target_size / 2;
    let target_y = v_margin + target_size + target_size / 2;

    // Find the appropriate label and ID for this target
    let intervals_index = c - 1;
    let target_label = letter_intervals[intervals_index];

    let target = new Target(target_x, target_y + 40, target_size, target_label);

    targets[target_label] = { target: target, children: {} };
  }

  // Letters
  for (let i = 0; i < letters.length; i++) {
    // Find the appropriate label for this target
    let target_label = letters[i];

    if (
      target_label == "A" ||
      target_label == "C" ||
      target_label == "L" ||
      target_label == "P" ||
      target_label == "S"
    ) {
      offset = 0;
    }

    let target_x = 40 + (h_margin + target_size) * offset + target_size / 2;
    let target_y = (v_margin + target_size) * 3 + target_size / 2;

    let target = new Target(target_x, target_y + 40, target_size, target_label);

    if (target_label >= "A" && target_label <= "B") {
      targets["A-B"].children[target_label] = { target: target, children: {} };
    } else if (target_label >= "C" && target_label <= "K") {
      targets["C-K"].children[target_label] = { target: target, children: {} };
    } else if (target_label >= "L" && target_label <= "O") {
      targets["L-O"].children[target_label] = { target: target, children: {} };
    } else if (target_label >= "P" && target_label <= "R") {
      targets["P-R"].children[target_label] = { target: target, children: {} };
    } else {
      targets["S-Z"].children[target_label] = { target: target, children: {} };
    }

    offset++;
  }

  // Words
  offset = 0;
  let r = 3;
  let current_letter = legendas[0][0];
  for (let i = 0; i < legendas.length; i++) {
    if (legendas[i][0] != current_letter) {
      current_letter = legendas[i][0];
      offset = 0;
      r = 5;
    }

    let target_x = 40 + (h_margin + target_size) * offset + target_size / 2; // give it some margin from the left border
    let target_y = (v_margin + target_size) * r + target_size / 2;
    let target = new Target(target_x, target_y + 40, target_size, legendas[i]);

    if (current_letter == "0") {
      targets["0%"].children[legendas[i]] = { target: target };
    } else if (current_letter >= "A" && current_letter <= "B") {
      targets["A-B"].children[current_letter].children[legendas[i]] = {
        target: target,
      };
    } else if (current_letter >= "C" && current_letter <= "K") {
      targets["C-K"].children[current_letter].children[legendas[i]] = {
        target: target,
      };
    } else if (current_letter >= "L" && current_letter <= "O") {
      targets["L-O"].children[current_letter].children[legendas[i]] = {
        target: target,
      };
    } else if (current_letter >= "P" && current_letter <= "R") {
      targets["P-R"].children[current_letter].children[legendas[i]] = {
        target: target,
      };
    } else {
      targets["S-Z"].children[current_letter].children[legendas[i]] = {
        target: target,
      };
    }
    offset++;
    if (offset > GRID_COLUMNS) {
      offset = 0;
      r++;
    }
  }
}

// Is invoked when the canvas is resized (e.g., when we go fullscreen)
function windowResized() {
  if (fullscreen()) {
    // DO NOT CHANGE THESE!
    resizeCanvas(windowWidth, windowHeight);
    let display = new Display({ diagonal: display_size }, window.screen);
    PPI = display.ppi; // calculates pixels per inch
    PPCM = PPI / 2.54; // calculates pixels per cm

    // Make your decisions in 'cm', so that targets have the same size for all participants
    // Below we find out out white space we can have between 2 cm targets
    let screen_width = display.width * 2.54; // screen width
    let screen_height = display.height * 2.54; // screen height
    let target_size = 2; // sets the target size (will be converted to cm when passed to createTargets)
    let horizontal_gap = screen_width - target_size * GRID_COLUMNS; // empty space in cm across the x-axis (based on 10 targets per row)
    let vertical_gap = screen_height - target_size * GRID_ROWS; // empty space in cm across the y-axis (based on 8 targets per column)

    // Creates and positions the UI targets according to the white space defined above (in cm!)
    // 80 represent some margins around the display (e.g., for text)
    createTargets(
      target_size * PPCM,
      horizontal_gap * PPCM - 80,
      vertical_gap * PPCM - 80
    );

    // Starts drawing targets immediately after we go fullscreen
    draw_targets = true;
  }
}
