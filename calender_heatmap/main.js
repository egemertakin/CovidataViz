// Global variables
let covidData = [];
let stateList = [];
let selectedState = null;
let selectedYear = "2020";
let selectedMonth = "0"; 
let selectedMetric = "deaths";
let colorScale;

// Month names 
const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Day names f
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Load the data
d3.csv("../data/merged_deaths.csv").then(data => {
  covidData = processData(data);
  stateList = Array.from(new Set(covidData.map(d => d.state_abbrev))).sort();
  
  // Populate state dropdown
  populateStateDropdown();
  
  // Set default selections
  if (stateList.length > 0) {
    selectedState = stateList[0];
    document.getElementById("state-select").value = selectedState;
  }
  
  // Initialize visualization
  updateVisualization();
  
  // Set up event listeners
  setupEventListeners();
}).catch(error => {
  console.error("Error loading data:", error);
  document.getElementById("calendar-heatmap").innerHTML = 
    `<div class="error">Error loading data. Please check console for details.</div>`;
});

// Process the data
function processData(data) {
  return data.map(d => {
    // Parse date
    const dateParts = d.Date.split('-');
    const date = new Date(+dateParts[0], +dateParts[1] - 1, +dateParts[2]);
    
    return {
      date: date,
      dateString: d.Date,
      state_abbrev: d.state_abbrev,
      confirmed: +d.Confirmed,
      deaths: +d.Deaths,
      // Calculate daily numbers 
      newCases: 0,
      newDeaths: 0
    };
  }).sort((a, b) => a.date - b.date);
}

// Calculate daily changes
function calculateDailyChanges(data) {
  // Group by state
  const stateGroups = d3.group(data, d => d.state_abbrev);
  
  const processedData = [];
  
  stateGroups.forEach((stateData, stateAbbrev) => {
    // Sort by date
    stateData.sort((a, b) => a.date - b.date);
    
    // Calculate daily changes
    for (let i = 0; i < stateData.length; i++) {
      if (i === 0) {
        // First day: use the cumulative value as new cases/deaths
        stateData[i].newCases = stateData[i].confirmed;
        stateData[i].newDeaths = stateData[i].deaths;
      } else {
        // Subsequent days: calculate the difference
        stateData[i].newCases = stateData[i].confirmed - stateData[i-1].confirmed;
        stateData[i].newDeaths = stateData[i].deaths - stateData[i-1].deaths;
        
        // Handle negative values 
        if (stateData[i].newCases < 0) stateData[i].newCases = 0;
        if (stateData[i].newDeaths < 0) stateData[i].newDeaths = 0;
      }
      
      processedData.push(stateData[i]);
    }
  });
  
  return processedData;
}

// Populate state dropdown
function populateStateDropdown() {
  const stateSelect = document.getElementById("state-select");
  
  stateList.forEach(state => {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  });
}

// Set up event listeners
function setupEventListeners() {
  document.getElementById("state-select").addEventListener("change", function() {
    selectedState = this.value;
    updateVisualization();
  });
  
  document.getElementById("year-select").addEventListener("change", function() {
    selectedYear = this.value;
    updateVisualization();
  });
  
  document.getElementById("month-select").addEventListener("change", function() {
    selectedMonth = this.value;
    updateVisualization();
  });
  
  document.getElementById("metric-select").addEventListener("change", function() {
    selectedMetric = this.value;
    updateVisualization();
  });
  
  
  window.addEventListener('resize', function() {
    updateVisualization();
  });
}

// Update visualization based on selected options
function updateVisualization() {
  // Filter data for selected state
  const stateData = covidData.filter(d => d.state_abbrev === selectedState);
  
  // Calculate daily changes
  const processedData = calculateDailyChanges(stateData);
  
  // Filter by year
  const yearData = processedData.filter(d => d.date.getFullYear() === +selectedYear);
  
  // Filter by month
  const filteredData = yearData.filter(d => d.date.getMonth() === +selectedMonth);
  
  // Create calendar heatmap
  createCalendarHeatmap(filteredData);
  
  // Update legend
  createLegend(filteredData);
  
  // If no day is selected, show state summary
  if (!document.querySelector(".day-cell.selected")) {
    showStateSummary(filteredData);
  }
}

// Create calendar heatmap
function createCalendarHeatmap(data) {
  const calendarContainer = document.getElementById("calendar-heatmap");
  calendarContainer.innerHTML = "";
  
  // Determine the metric to visualize
  const metricKey = selectedMetric === "deaths" ? "newDeaths" : "newCases";
  
  // Create color scale based on the selected metric
  const maxValue = d3.max(data, d => d[metricKey]) || 1; 
  
  // Use different color scales for deaths and cases
  if (selectedMetric === "deaths") {
    colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, maxValue]);
  } else {
    colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxValue]);
  }
  
  // Only display the selected month
  const month = +selectedMonth;
  
  // Create month container
  const monthContainer = document.createElement("div");
  monthContainer.className = "month-container";
  calendarContainer.appendChild(monthContainer);
  
  // Add month title
  const monthTitle = document.createElement("h2");
  monthTitle.className = "month-title";
  monthTitle.textContent = monthNames[month] + " " + selectedYear;
  monthContainer.appendChild(monthTitle);
  
  // Add weekday labels
  const weekdayLabels = document.createElement("div");
  weekdayLabels.className = "weekday-labels";
  monthContainer.appendChild(weekdayLabels);
  
  dayNames.forEach(day => {
    const dayLabel = document.createElement("div");
    dayLabel.className = "weekday-label";
    dayLabel.textContent = day;
    weekdayLabels.appendChild(dayLabel);
  });
  
  // Create the days grid
  const daysGrid = document.createElement("div");
  daysGrid.className = "days-grid";
  monthContainer.appendChild(daysGrid);
  
  // Get the first day of the month
  const firstDay = new Date(+selectedYear, month, 1);
  const firstDayOfWeek = firstDay.getDay();
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "day-cell empty";
    daysGrid.appendChild(emptyCell);
  }
  
  // Get the last day of the month
  const lastDay = new Date(+selectedYear, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  
  // Create a cell for each day in the month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(+selectedYear, month, day);
    const dayData = data.find(d => 
      d.date.getDate() === day &&
      d.date.getMonth() === month &&
      d.date.getFullYear() === +selectedYear
    );
    
    const dayCell = document.createElement("div");
    dayCell.className = "day-cell";
    dayCell.textContent = day;
    
    // Color the cell based on the data if available
    if (dayData) {
      const value = dayData[metricKey];
      dayCell.style.backgroundColor = colorScale(value);
      
      // Add hover event to show details
      dayCell.addEventListener("mouseover", () => {
        showDayInfo(dayData);
      });
      
      // Add click event to maintain selection
      dayCell.addEventListener("click", (event) => {
        // Remove selected class from all cells
        document.querySelectorAll(".day-cell.selected").forEach(cell => {
          cell.classList.remove("selected");
        });
        
        // Add selected class to clicked cell
        dayCell.classList.add("selected");
        
        // Show info for the selected day
        showDayInfo(dayData);
        
        // Prevent event propagation
        event.stopPropagation();
      });
    } else {
      dayCell.style.backgroundColor = "#f8f9fa";
    }
    
    daysGrid.appendChild(dayCell);
  }
  
  // Add click event to the document to clear selection
  document.addEventListener("click", () => {
    document.querySelectorAll(".day-cell.selected").forEach(cell => {
      cell.classList.remove("selected");
    });
    
    // Show state summary when nothing is selected
    showStateSummary(data);
  });
}

// Show day information
function showDayInfo(dayData) {
  const dayInfo = document.getElementById("day-info");
  
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = dayData.date.toLocaleDateString(undefined, dateOptions);
  
  let html = `
    <p><strong>${formattedDate}</strong></p>
    <p>State: ${dayData.state_abbrev}</p>
    <div class="stats">
      <div class="stat">
        <div class="stat-title">New Cases</div>
        <div class="stat-value cases">${dayData.newCases.toLocaleString()}</div>
        <div class="stat-title">Cumulative: ${dayData.confirmed.toLocaleString()}</div>
      </div>
      <div class="stat">
        <div class="stat-title">New Deaths</div>
        <div class="stat-value deaths">${dayData.newDeaths.toLocaleString()}</div>
        <div class="stat-title">Cumulative: ${dayData.deaths.toLocaleString()}</div>
      </div>
    </div>
  `;
  
  dayInfo.innerHTML = html;
}

// Show state summary when no specific day is selected
function showStateSummary(data) {
  if (data.length === 0) {
    document.getElementById("day-info").innerHTML = "<p>No data available for this month.</p>";
    return;
  }
  
  const dayInfo = document.getElementById("day-info");
  
  // Calculate summary statistics
  const totalNewCases = d3.sum(data, d => d.newCases);
  const totalNewDeaths = d3.sum(data, d => d.newDeaths);
  const maxCasesDay = d3.max(data, d => d.newCases);
  const maxDeathsDay = d3.max(data, d => d.newDeaths);
  
  // Get the last day to show cumulative totals
  const lastDay = data[data.length - 1];
  
  let html = `
    <p><strong>${selectedState} Summary</strong></p>
    <p>${monthNames[+selectedMonth]} ${selectedYear}</p>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-title">Monthly New Cases</div>
        <div class="stat-value cases">${totalNewCases.toLocaleString()}</div>
        <div class="stat-title">Highest Daily: ${maxCasesDay.toLocaleString()}</div>
      </div>
      
      <div class="stat">
        <div class="stat-title">Monthly New Deaths</div>
        <div class="stat-value deaths">${totalNewDeaths.toLocaleString()}</div>
        <div class="stat-title">Highest Daily: ${maxDeathsDay.toLocaleString()}</div>
      </div>
      
      <div class="stat">
        <div class="stat-title">Cumulative Cases (End of Month)</div>
        <div class="stat-value cases">${lastDay.confirmed.toLocaleString()}</div>
      </div>
      
      <div class="stat">
        <div class="stat-title">Cumulative Deaths (End of Month)</div>
        <div class="stat-value deaths">${lastDay.deaths.toLocaleString()}</div>
      </div>
    </div>
    
    <p class="tip">Click on any day for detailed information</p>
  `;
  
  dayInfo.innerHTML = html;
}

// Create legend with ranges instead of individual values
function createLegend(data) {
  const legendContainer = document.getElementById("legend");
  legendContainer.innerHTML = "";
  
  // Update legend title
  const legendTitle = document.getElementById("legend-title");
  legendTitle.textContent = selectedMetric === "deaths" ? "Daily Deaths Range" : "Daily Cases Range";
  
  // Determine the metric to visualize
  const metricKey = selectedMetric === "deaths" ? "newDeaths" : "newCases";
  
  // Get the range of values
  const maxValue = d3.max(data, d => d[metricKey]) || 1; 
  
  // Create ranges for the legend based on the data
  let ranges = [];
  
  // Create custom thresholds based on the maximum value
  if (maxValue <= 5) {
    // For very small values
    ranges = [
      { min: 0, max: 0, label: "0" },
      { min: 1, max: 1, label: "1" },
      { min: 2, max: 2, label: "2" },
      { min: 3, max: 3, label: "3" },
      { min: 4, max: maxValue, label: `4+` }
    ];
  } else if (maxValue <= 10) {
    // For small values
    ranges = [
      { min: 0, max: 0, label: "0" },
      { min: 1, max: 2, label: "1-2" },
      { min: 3, max: 5, label: "3-5" },
      { min: 6, max: 9, label: "6-9" },
      { min: 10, max: maxValue, label: `10+` }
    ];
  } else if (maxValue <= 50) {
    // For medium-small values
    ranges = [
      { min: 0, max: 0, label: "0" },
      { min: 1, max: 5, label: "1-5" },
      { min: 6, max: 15, label: "6-15" },
      { min: 16, max: 30, label: "16-30" },
      { min: 31, max: maxValue, label: `31+` }
    ];
  } else if (maxValue <= 200) {
    // For medium values
    ranges = [
      { min: 0, max: 0, label: "0" },
      { min: 1, max: 20, label: "1-20" },
      { min: 21, max: 50, label: "21-50" },
      { min: 51, max: 100, label: "51-100" },
      { min: 101, max: maxValue, label: `101+` }
    ];
  } else if (maxValue <= 1000) {
    // For medium-large values
    ranges = [
      { min: 0, max: 0, label: "0" },
      { min: 1, max: 100, label: "1-100" },
      { min: 101, max: 250, label: "101-250" },
      { min: 251, max: 500, label: "251-500" },
      { min: 501, max: maxValue, label: `501+` }
    ];
  } else {
    // For large values
    ranges = [
      { min: 0, max: 0, label: "0" },
      { min: 1, max: 500, label: "1-500" },
      { min: 501, max: 1000, label: "501-1000" },
      { min: 1001, max: Math.round(maxValue / 2), label: `1001-${Math.round(maxValue / 2).toLocaleString()}` },
      { min: Math.round(maxValue / 2) + 1, max: maxValue, label: `${(Math.round(maxValue / 2) + 1).toLocaleString()}+` }
    ];
  }
  
  // Create legend items for each range
  ranges.forEach(range => {
    const legendItem = document.createElement("div");
    legendItem.className = "legend-item";
    
    const legendColor = document.createElement("div");
    legendColor.className = "legend-color";
    
    // Use the middle point of the range for color
    const midPoint = (range.min + range.max) / 2;
    legendColor.style.backgroundColor = colorScale(midPoint);
    
    const legendLabel = document.createElement("div");
    legendLabel.className = "legend-label";
    legendLabel.textContent = range.label;
    
    legendItem.appendChild(legendColor);
    legendItem.appendChild(legendLabel);
    legendContainer.appendChild(legendItem);
  });
}