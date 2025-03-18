// Global variables
let statesData;
let deathsData = [];
let allDates = [];
let dateRangeStart = 0;
let dateRangeEnd = 0;
let currentMetric = 'deaths'; // default to deaths
let isNormalized = false;
let colorScale;
let selectedState = null;

// Set up dimensions
const width = document.getElementById('map-container').clientWidth;
const height = document.getElementById('map-container').clientHeight;

// Create SVG
const svg = d3.select("#map-container")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// Add background color to the map
svg.append("rect")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("fill", "#f8f9fa");

// Create a group for the map
const g = svg.append("g");

// Projection for US map
const projection = d3.geoAlbersUsa()
  .scale(width)
  .translate([width / 2, height / 2]);

const path = d3.geoPath().projection(projection);

// Load data
Promise.all([
  // US map from topojson
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json"),
  // Merged deaths/cases CSV
  d3.csv("../data/merged_deaths.csv")
]).then(([us, deaths]) => {
  // Convert topojson to geojson
  statesData = topojson.feature(us, us.objects.states).features;
  
  // Process the CSV data
  deathsData = processDeathsData(deaths);
  
  // Gather all unique dates
  allDates = [
    ...new Set(deathsData.flatMap(d => d.data.map(item => item.date)))
  ].sort();
  
  // Initialize date range
  dateRangeStart = 0;
  dateRangeEnd = allDates.length - 1;
  
  // Initialize the viz
  initViz();
  setupControls();
  updateMap();
  
}).catch(error => {
  console.error("Error loading data:", error);
  document.getElementById("map-container").innerHTML = 
    `<div class="error">Error loading data. Please check console for details.</div>`;
});

function processDeathsData(data) {
  // Group by state_abbrev
  const stateGroups = d3.group(data, d => d.state_abbrev);
  
  const processedData = [];
  
  stateGroups.forEach((stateData, stateAbbrev) => {
    const population = +stateData[0].Population;
    const stateEntries = [];
    
    stateData.forEach(entry => {
      const dateEntry = {
        date: entry.Date,
        confirmed: +entry.Confirmed,
        deaths: +entry.Deaths,
        confirmed_per_100k: +entry.confirmed_per_100k,
        deaths_per_100k: +entry.deaths_per_100k
      };
      
      // If needed, compute confirmed_per_100k
      if (isNaN(dateEntry.confirmed_per_100k) && population > 0) {
        dateEntry.confirmed_per_100k = (dateEntry.confirmed / population) * 100000;
      }
      
      stateEntries.push(dateEntry);
    });
    
    // Sort by date
    stateEntries.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    processedData.push({
      state: stateAbbrev,
      population: population,
      data: stateEntries
    });
  });
  
  return processedData;
}

function initViz() {
  // Draw the states
  g.selectAll("path")
    .data(statesData)
    .enter()
    .append("path")
    .attr("class", "state")
    .attr("d", path)
    .attr("fill", "#ccc")
    .on("click", handleStateClick)
    .on("mouseover", function(event, d) {
      d3.select(this)
        .attr("stroke-width", 1.5)
        .attr("stroke", "#333");
      
      // Show tooltip with state name
      const stateName = d.properties.name;
      const stateAbbr = getStateAbbreviation(stateName);
      
      const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("background-color", "rgba(0,0,0,0.7)")
        .style("color", "white")
        .style("padding", "5px 10px")
        .style("border-radius", "4px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0);
      
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      tooltip.html(`${stateName} (${stateAbbr || 'N/A'})`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
      
      // Store tooltip in element data
      d3.select(this).datum().tooltip = tooltip;
    })
    .on("mouseout", function() {
      d3.select(this)
        .attr("stroke-width", d => d === selectedState ? 2 : 0.8)
        .attr("stroke", d => d === selectedState ? "#000" : "#fff");
      
      const tooltip = d3.select(this).datum().tooltip;
      if (tooltip) {
        tooltip.transition()
          .duration(200)
          .style("opacity", 0)
          .remove();
      }
    });
  
  // Set up color scale
  updateColorScale();
  
  // Create the legend
  createLegend();
}

function setupControls() {
  // Metric selector
  document.getElementById("metric-select").addEventListener("change", function() {
    currentMetric = this.value;
    updateColorScale();
    updateMap();
    updateLegendTitle();
  });
  
  // Data view toggle
  document.querySelectorAll('input[name="data-view"]').forEach(radio => {
    radio.addEventListener("change", function() {
      isNormalized = this.value === "normalized";
      updateColorScale();
      updateMap();
      updateLegendTitle();
    });
  });
  
  // Date slider
  const dateSlider = document.getElementById('date-slider');
  
  if (allDates.length > 1) {
    noUiSlider.create(dateSlider, {
      start: [0, allDates.length - 1],
      connect: true,
      range: {
        'min': 0,
        'max': allDates.length - 1
      },
      step: 1,
      
      tooltips: false
    });
    
    dateSlider.noUiSlider.on('update', (values) => {
      dateRangeStart = Math.floor(+values[0]);
      dateRangeEnd = Math.floor(+values[1]);
      
      if (selectedState) {
        handleStateClick(null, selectedState);
      }
      
      updateMap();
    });
  }
}

function updateColorScale() {
  let maxValue = 0;
  
  // We only handle 'deaths' or 'confirmed'
  if (currentMetric === 'deaths') {
    // Max difference in deaths
    deathsData.forEach(state => {
      const endData = getStateDataAtIndex(state, dateRangeEnd);
      const startData = getStateDataAtIndex(state, dateRangeStart);
      if (endData && startData) {
        const rawDiff = endData.deaths - startData.deaths;
        const value = isNormalized ? (rawDiff / state.population) * 100000 : rawDiff;
        if (value > maxValue) maxValue = value;
      }
    });
    
    maxValue = Math.max(maxValue, 1);
    colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, maxValue]);
      
  } else {
    // currentMetric === 'confirmed'
    deathsData.forEach(state => {
      const endData = getStateDataAtIndex(state, dateRangeEnd);
      const startData = getStateDataAtIndex(state, dateRangeStart);
      if (endData && startData) {
        const rawDiff = endData.confirmed - startData.confirmed;
        const value = isNormalized ? (rawDiff / state.population) * 100000 : rawDiff;
        if (value > maxValue) maxValue = value;
      }
    });
    
    maxValue = Math.max(maxValue, 1);
    colorScale = d3.scaleSequential(d3.interpolateBlues)
      .domain([0, maxValue]);
  }
  
  updateLegend();
}

function getStateDataAtIndex(stateObj, dateIndex) {
  const date = allDates[dateIndex];
  return stateObj.data.find(d => d.date === date);
}

function updateMap() {
  g.selectAll(".state")
    .attr("fill", (d) => {
      if (selectedState && d === selectedState) {
        d3.select(this)
          .attr("stroke", "#000")
          .attr("stroke-width", 2);
      }
      
      const stateId = getStateAbbreviation(d.properties.name);
      if (!stateId) return "#ccc";
      
      // Find the relevant state data
      const stateData = deathsData.find(s => s.state === stateId);
      if (!stateData) return "#ccc";
      
      const endData = getStateDataAtIndex(stateData, dateRangeEnd);
      const startData = getStateDataAtIndex(stateData, dateRangeStart);
      if (!endData || !startData) return "#ccc";
      
      if (currentMetric === 'deaths') {
        const rawDiff = endData.deaths - startData.deaths;
        const value = isNormalized ? (rawDiff / stateData.population) * 100000 : rawDiff;
        return colorScale(Math.max(0, value));
      } else {
        // confirmed
        const rawDiff = endData.confirmed - startData.confirmed;
        const value = isNormalized ? (rawDiff / stateData.population) * 100000 : rawDiff;
        return colorScale(Math.max(0, value));
      }
    });
}

function handleStateClick(event, d) {
  selectedState = d;
  
  // Reset all states
  g.selectAll(".state")
    .attr("class", "state")
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.8);
  
  // Highlight the selected
  g.selectAll(".state")
    .filter(state => state === selectedState)
    .attr("class", "state active")
    .attr("stroke", "#000")
    .attr("stroke-width", 2);
  
  const stateId = getStateAbbreviation(d.properties.name);
  if (!stateId) return;
  
  const stateObj = deathsData.find(s => s.state === stateId);
  
  if (!stateObj) {
    document.getElementById("state-info").innerHTML = `
      <h3>${d.properties.name} (${stateId})</h3>
      <p>No data available for this state.</p>
    `;
    return;
  }
  
  let startData = getStateDataAtIndex(stateObj, dateRangeStart);
  let endData = getStateDataAtIndex(stateObj, dateRangeEnd);
  
  const formatDate = (dateStr) => {
    const dt = new Date(dateStr);
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };
  
  let html = `<h3>${d.properties.name} (${stateId})</h3>`;
  
  if (startData && endData) {
    const startDate = formatDate(startData.date);
    const endDateFormatted = formatDate(endData.date);
    html += `<p><strong>Date Range:</strong> ${startDate} to ${endDateFormatted}</p>`;
    
    // Cases & Deaths differences
    const confirmedDiff = endData.confirmed - startData.confirmed;
    const deathsDiff = endData.deaths - startData.deaths;
    
    const confirmedPerDiff = (confirmedDiff / stateObj.population) * 100000;
    const deathsPerDiff = (deathsDiff / stateObj.population) * 100000;
    
    html += `<div class="stat-group">
      <div class="stat-group-title">Cases & Deaths (Change in Selected Period)</div>
      <div class="stat">
        <span class="stat-label">Confirmed Cases:</span>
        <span class="stat-value case">${confirmedDiff.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Cases per 100k:</span>
        <span class="stat-value case">${confirmedPerDiff.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Deaths:</span>
        <span class="stat-value death">${deathsDiff.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Deaths per 100k:</span>
        <span class="stat-value death">${deathsPerDiff.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
      </div>
    </div>`;
    
    // Show cumulative totals as of endDate
    html += `<div class="stat-group">
      <div class="stat-group-title">Cumulative Totals (As of ${endDateFormatted})</div>
      <div class="stat">
        <span class="stat-label">Total Confirmed Cases:</span>
        <span class="stat-value case">${endData.confirmed.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Total Cases per 100k:</span>
        <span class="stat-value case">${endData.confirmed_per_100k.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Total Deaths:</span>
        <span class="stat-value death">${endData.deaths.toLocaleString()}</span>
      </div>
      <div class="stat">
        <span class="stat-label">Total Deaths per 100k:</span>
        <span class="stat-value death">${endData.deaths_per_100k.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
      </div>
    </div>`;
  } else {
    html += `<p>No data available for the selected date range.</p>`;
  }
  
  html += `<div class="metadata">
    <p><small>Data shown reflects changes within the selected date range.</small></p>
  </div>`;
  
  document.getElementById("state-info").innerHTML = html;
}

function createLegend() {
  updateLegend();
  updateLegendTitle();
}

function updateLegend() {
  const legendContainer = d3.select("#legend");
  legendContainer.html(""); // Clear existing legend
  
  // We’ll create 5 steps for the legend
  const legendScale = d3.scaleLinear()
    .domain([0, 1])
    .range([0, colorScale.domain()[1]]);
  
  const numSteps = 5;
  const legendItems = [];
  
  for (let i = 0; i < numSteps; i++) {
    const t = i / (numSteps - 1);
    const value = legendScale(t);
    legendItems.push({
      color: colorScale(value),
      value
    });
  }
  
  legendContainer.selectAll(".legend-item")
    .data(legendItems)
    .enter()
    .append("div")
    .attr("class", "legend-item")
    .html(d => {
      const label = Math.round(d.value).toLocaleString();
      return `
        <div class="legend-color" style="background-color: ${d.color}"></div>
        <div class="legend-value">${label}</div>
      `;
    });
}

function updateLegendTitle() {
  let title = "";
  if (currentMetric === 'deaths') {
    title = isNormalized ? "Deaths per 100k" : "Total Deaths";
  } else {
    // confirmed
    title = isNormalized ? "Cases per 100k" : "Total Cases";
  }
  document.getElementById("legend-title").textContent = title;
}

// helper to get state abbreviation from state name
function getStateAbbreviation(stateName) {
  const stateMap = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC'
  };
  return stateMap[stateName];
}

// Handle window resize
window.addEventListener('resize', function() {
  const newWidth = document.getElementById('map-container').clientWidth;
  const newHeight = document.getElementById('map-container').clientHeight;
  
  svg.attr("viewBox", `0 0 ${newWidth} ${newHeight}`);
  
  projection
    .scale(newWidth)
    .translate([newWidth / 2, newHeight / 2]);
  
  g.selectAll(".state")
    .attr("d", path);
});
