document.getElementById("startTrivia").addEventListener("click", function(){
    console.log("How many wheels on a bus?")
});

document.getElementById("settingsPage").addEventListener("click", function(){
    chrome.tabs.create({url:"settings.html"});
});

// Function to check if the answer is correct and update counters
const correctAnswer = 4;

function checkAnswer(selectedAnswer) {
    chrome.storage.sync.get(["rightAns", "wrongAns"], (data) => {
      let rightAns = data.rightAns || 0;
      let wrongAns = data.wrongAns || 0;
  
      // Update counters based on the selected answer
      if (selectedAnswer === correctAnswer) {
        rightAns++;
        chrome.storage.sync.set({ rightAns });
      } else {
        wrongAns++;
        chrome.storage.sync.set({ wrongAns });
      }
    });
  }
  
  // Attach event listeners to each button
  document.getElementById("answer1").addEventListener("click", () => checkAnswer(1));
  document.getElementById("answer2").addEventListener("click", () => checkAnswer(2));
  document.getElementById("answer3").addEventListener("click", () => checkAnswer(3));
  document.getElementById("answer4").addEventListener("click", () => checkAnswer(4));
