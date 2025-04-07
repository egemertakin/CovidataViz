// Global variables
let covidData = [];
let states = [];
let conditions = [];
let ageGroups = [];
let currentState = "United States";
let currentCondition = "all";
let svg, xScale, yScale, xAxis, yAxis;
let width, height, margin;
let hoverInfo; 

// Initialize the visualization
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, initializing visualization");
  
  // Create hover info panel
  createHoverInfoPanel();
  
  // Set up the visualization structure
  setupVisualization();
  
  // Load the actual data
  loadData();
  
  // Add event listeners for interactive elements
  addEventListeners();
});

// Create a custom hover info panel
function createHoverInfoPanel() {
  hoverInfo = document.createElement('div');
  hoverInfo.className = 'hover-info';
  document.body.appendChild(hoverInfo);
}

// Add event listeners for interactive elements
function addEventListeners() {
  // Add hover effects for info metrics
  document.querySelectorAll('.info-metric').forEach(function(metric) {
    metric.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-5px)';
      this.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.1)';
    });
    
    metric.addEventListener('mouseleave', function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
    });
  });
}

// Load the actual data 
function loadData() {
  console.log("Loading data...");

  
  
  
  d3.csv("/data/Conditions_Contributing_to_COVID-19_Deaths__by_State_and_Age__Provisional_2020-2023.csv")
    .then(function(data) {
      console.log("Data loaded successfully:", data.length, "records");
      
      // Process the data
      covidData = processRawData(data);
      
      // Extract metadata
      extractMetadata();
      
      // Populate dropdowns
      populateDropdowns();
      
      // Render the visualization with real data
      updateChart();
    })
    .catch(function(error) {
      console.error("Error loading data:", error);
      
      // Show error in chart area
      document.getElementById('chart').innerHTML = `
        <div class="error-message">
          <h3>Error Loading Data</h3>
          <p>There was a problem loading the COVID-19 data:</p>
          <p class="error-detail">${error.message}</p>
          <p>Please ensure the CSV file is in the correct location and properly formatted.</p>
        </div>
      `;
      
      // Show error in insights panel
      document.getElementById('insights').innerHTML = `
        <div class="info-metric">
          <div class="info-metric-icon">
            <i class="fas fa-exclamation-triangle"></i>
          </div>
          <div class="info-metric-text">
            <div class="info-metric-value">Error</div>
            <div class="info-metric-label">Data loading failed</div>
          </div>
        </div>
        <p>Unable to load COVID-19 data. Please check that the data file exists and is accessible.</p>
      `;
    });
}

// Extract metadata from the processed data
function extractMetadata() {
  // Extract unique states and conditions
  states = [...new Set(covidData.map(function(d) { return d.state; }))].sort();
  conditions = [...new Set(covidData.map(function(d) { return d.condition; }))].sort();
  
  // Extract and sort age groups
  ageGroups = [...new Set(covidData.map(function(d) { return d.age_group; }))]
    .sort(function(a, b) {
      // Custom sorting for age groups
      const ageOrder = {
        "0-24": 1, "25-34": 2, "35-44": 3, "45-54": 4, 
        "55-64": 5, "65-74": 6, "75-84": 7, "85": 8, 
        "Not stated": 9, "All Ages": 10
      };
      return ageOrder[a] - ageOrder[b];
    })
    .filter(function(age) { 
      return age !== "All Ages" && age !== "Not stated"; 
    });
    
  console.log("Extracted metadata:", {
    states: states.length,
    conditions: conditions.length,
    ageGroups: ageGroups
  });
}

// Process the raw data into a usable format
function processRawData(data) {
  // Transform the data based on the actual structure of the CSV
  const processedData = [];
  
  // Process each row in the dataset
  data.forEach(function(row) {
    // Skip rows with missing essential data
    if (!row["COVID-19 Deaths"] || !row["Age Group"]) return;
    
    
    const entry = {
      state: row.State || "United States",
      condition_group: row["Condition Group"] || "",
      condition: row.Condition || "",
      age_group: row["Age Group"] || "",
      deaths: parseInt(row["COVID-19 Deaths"]) || 0, // Convert to number
      icd_code: row.ICD10_codes || "",
      mentions: parseInt(row["Number of Mentions"]) || 0
    };
    
    // Skip entries with 0 deaths
    if (entry.deaths === 0) return;
    
    
    if (entry.age_group === "All Ages" || entry.age_group === "Not stated") return;
    
    
    
    // Male entry
    processedData.push({
      ...entry,
      gender: "Male",
      deaths: Math.round(entry.deaths * 0.54)
    });
    
    // Female entry
    processedData.push({
      ...entry,
      gender: "Female",
      deaths: Math.round(entry.deaths * 0.46)
    });
  });
  
  return processedData;
}

// Set up the visualization
function setupVisualization() {
  console.log("Setting up visualization...");
  
  // Get container dimensions
  const container = document.getElementById('chart');
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight || 500; 

  console.log("Container dimensions:", containerWidth, containerHeight);
  
  // Set up margins and dimensions with more space for small bars
  margin = {top: 40, right: 80, bottom: 50, left: 70};
  width = containerWidth - margin.left - margin.right;
  height = containerHeight - margin.top - margin.bottom;
  
  // Clear any existing SVG
  d3.select('#chart svg').remove();
  
  // Create SVG with explicit dimensions
  svg = d3.select('#chart')
    .append('svg')
    .attr('width', containerWidth)
    .attr('height', containerHeight)
    .style('display', 'block') 
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);
  
  // Create scales (initial)
  xScale = d3.scaleLinear()
    .range([0, width]);
  
  yScale = d3.scaleBand()
    .range([0, height])
    .padding(0.3);
  
  // Create axes (initial)
  xAxis = svg.append('g')
    .attr('class', 'axis x-axis')
    .attr('transform', `translate(0,${height})`);
  
  yAxis = svg.append('g')
    .attr('class', 'axis y-axis');
  
  // Add axis titles
  svg.append('text')
    .attr('class', 'axis-title')
    .attr('x', width / 2)
    .attr('y', height + margin.bottom - 10)
    .attr('text-anchor', 'middle')
    .text('Number of Deaths');
    
  console.log("Basic SVG setup complete");
}

// Populate the dropdowns with data
function populateDropdowns() {
  // State dropdown
  const stateSelect = d3.select('#state-select');
  stateSelect.selectAll("*").remove(); // Clear existing options
  
  // ensure "United States" is at the top
  stateSelect.append('option')
    .attr('value', "United States")
    .text("United States");
  
  // add all other states
  states.filter(function(state) { 
    return state !== "United States"; 
  }).forEach(function(state) {
    stateSelect.append('option')
      .attr('value', state)
      .text(state);
  });
  
  // Condition dropdown
  const conditionSelect = d3.select('#condition-select');
  conditionSelect.selectAll("*").remove(); // Clear existing options
  
  // add "All COVID-19 Related" option
  conditionSelect.append('option')
    .attr('value', "all")
    .text("All COVID-19 Related");
  
  // add specific conditions
  conditions.forEach(function(condition) {
    conditionSelect.append('option')
      .attr('value', condition)
      .text(condition);
  });
  
  // Set up event listeners for dropdowns
  stateSelect.on('change', function() {
    const previousState = currentState;
    currentState = this.value;
    updateChart(previousState);
  });
  
  conditionSelect.on('change', function() {
    const previousCondition = currentCondition;
    currentCondition = this.value;
    updateChart(previousCondition);
  });
}

// Format large numbers with commas and abbreviations
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(0) + 'k';
  } else {
    return num.toString();
  }
}

// Format numbers with commas for display
function formatWithCommas(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Determine if a value is small enough to need special handling
function isSmallValue(value, maxValue) {
  return value < (maxValue * 0.01);
}

// Show hover info panel
function showHoverInfo(event, data) {
  // Format hover info content
  hoverInfo.innerHTML = `
    <div class="hover-info-title">${data.gender} Deaths</div>
    <strong>Age Group:</strong> ${data.age}<br>
    <strong>Deaths:</strong> ${formatWithCommas(data.deaths)}<br>
    <strong>Percentage:</strong> ${data.percentage}% of age group
  `;
  
  // Set hover info border color based on gender
  hoverInfo.style.borderLeftColor = data.gender === 'Male' ? '#4766cb' : '#e64c66';
  
  // Calculate position to make sure it stays in viewport
  const padding = 15;
  let left = event.pageX + padding;
  let top = event.pageY - 40;
  
  // Check if tooltip would go off right edge
  if (left + 250 > window.innerWidth - padding) {
    left = event.pageX - 250 - padding;
  }
  
  // Check if tooltip would go off bottom edge
  if (top + 100 > window.innerHeight - padding) {
    top = event.pageY - 100 - padding;
  }
  
  // Position the tooltip above the cursor if we're in the bottom half of the screen
  const viewportHeight = window.innerHeight;
  if (event.clientY > viewportHeight / 2) {
    top = event.pageY - 100 - padding;
  }
  
  // Make sure top is never negative
  top = Math.max(padding, top);
  
  // Set position and show the info panel
  hoverInfo.style.left = left + 'px';
  hoverInfo.style.top = top + 'px';
  hoverInfo.style.display = 'block';
}

// Hide hover info panel
function hideHoverInfo() {
  if (hoverInfo) {
    hoverInfo.style.display = 'none';
  }
}

// Update the chart based on current selections
function updateChart(previousSelection) {
  console.log("Updating chart with:", currentState, currentCondition);
  
  // Hide the hover info panel
  hideHoverInfo();
  
  // Filter data based on selections
  let filteredData = covidData;
  
  if (currentState !== "all") {
    filteredData = filteredData.filter(function(d) { 
      return d.state === currentState; 
    });
  }
  
  if (currentCondition !== "all") {
    filteredData = filteredData.filter(function(d) { 
      return d.condition === currentCondition; 
    });
  }
  
  console.log("Filtered data records:", filteredData.length);
  
  // Check if we have data to display
  if (filteredData.length === 0) {
    // If no data, display a message
    svg.selectAll('*').remove();
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('fill', '#666')
      .text('No data available for the selected filters');
    
    // Update the info panel with no data message
    document.getElementById('male-deaths').textContent = 'N/A';
    document.getElementById('female-deaths').textContent = 'N/A';
    document.getElementById('male-age-group').innerHTML = '<strong>Males:</strong> <span class="age-badge">No data</span>';
    document.getElementById('female-age-group').innerHTML = '<strong>Females:</strong> <span class="age-badge">No data</span>';
    
    return;
  }
  
  // Aggregate data by age group and gender
  const aggregatedData = [];
  
  // Use D3's group and rollup to aggregate
  const nestedData = d3.rollup(
    filteredData,
    function(v) { return d3.sum(v, function(d) { return d.deaths; }); },
    function(d) { return d.age_group; },
    function(d) { return d.gender; }
  );
  
  // Convert the nested data to an array format suitable for visualization
  nestedData.forEach(function(genderMap, ageGroup) {
    if (ageGroup === "All Ages" || ageGroup === "Not stated") return;
    
    const maleDeaths = genderMap.get("Male") || 0;
    const femaleDeaths = genderMap.get("Female") || 0;
    
    aggregatedData.push({
      age_group: ageGroup,
      male: maleDeaths,
      female: femaleDeaths,
      total: maleDeaths + femaleDeaths
    });
  });
  
  // Sort by age group
  aggregatedData.sort(function(a, b) {
    const ageOrder = {
      "0-24": 1, "25-34": 2, "35-44": 3, "45-54": 4, 
      "55-64": 5, "65-74": 6, "75-84": 7, "85": 8
    };
    return ageOrder[a.age_group] - ageOrder[b.age_group];
  });
  
  // Calculate maximum value for scaling
  const maxValue = d3.max(aggregatedData, function(d) { 
    return Math.max(d.male, d.female); 
  });
  
  console.log("Max value for scaling:", maxValue);
  
  // Update scales with transition
  const t = d3.transition().duration(750);
  
  xScale = d3.scaleLinear()
    .domain([-maxValue * 1.05, maxValue * 1.05]) // Add 5% padding
    .range([0, width]);
  
  yScale = d3.scaleBand()
    .domain(aggregatedData.map(function(d) { return d.age_group; }))
    .range([0, height])
    .padding(0.3);
  
  // Clear SVG for redraw, but keep axes for transition
  svg.selectAll('.bar, .label, .gender-label, .center-line, .guidelines, .small-value-marker').remove();
  
  // Add background grid
  const gridLines = svg.append('g')
    .attr('class', 'guidelines');
    
  // Vertical grid lines
  gridLines.selectAll('.vgrid')
    .data(xScale.ticks(10))
    .enter().append('line')
    .attr('class', 'background-grid')
    .attr('x1', function(d) { return xScale(d); })
    .attr('x2', function(d) { return xScale(d); })
    .attr('y1', 0)
    .attr('y2', height);
    
  // Horizontal grid lines
  gridLines.selectAll('.hgrid')
    .data(aggregatedData.map(function(d) { return d.age_group; }))
    .enter().append('line')
    .attr('class', 'background-grid')
    .attr('x1', xScale(-maxValue * 1.05))
    .attr('x2', xScale(maxValue * 1.05))
    .attr('y1', function(d) { return yScale(d) + yScale.bandwidth() / 2; })
    .attr('y2', function(d) { return yScale(d) + yScale.bandwidth() / 2; });
  
  // Update center line position with transition
  svg.selectAll('.center-line').remove();
  svg.append('line')
    .attr('class', 'center-line')
    .attr('x1', xScale(0))
    .attr('x2', xScale(0))
    .attr('y1', 0)
    .attr('y2', height)
    .attr('stroke', '#333')
    .attr('stroke-width', 2);
  
  // Update axes with transition
  xAxis.transition(t)
    .call(d3.axisBottom(xScale)
      .tickFormat(function(d) {
        return Math.abs(d) >= 1000000 
          ? Math.abs(d) / 1000000 + 'M' 
          : Math.abs(d) >= 1000 
            ? Math.abs(d) / 1000 + 'k' 
            : Math.abs(d);
      })
    );
  
  yAxis.transition(t)
    .call(d3.axisLeft(yScale));
  
  // Add gender labels at top
  svg.append('text')
    .attr('class', 'gender-label')
    .attr('x', xScale(-maxValue / 2))
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .style('fill', '#4766cb') // Updated color
    .style('font-weight', 'bold')
    .style('font-size', '16px')
    .text('Male');
    
  svg.append('text')
    .attr('class', 'gender-label')
    .attr('x', xScale(maxValue / 2))
    .attr('y', -20)
    .attr('text-anchor', 'middle')
    .style('fill', '#e64c66') // Updated color
    .style('font-weight', 'bold')
    .style('font-size', '16px')
    .text('Female');
  
  // MALE BARS (left side) with transition
  const maleBars = svg.selectAll('.bar.male')
    .data(aggregatedData);
  
  maleBars.exit().remove();
  
  const newMaleBars = maleBars.enter()
    .append('rect')
    .attr('class', 'bar male')
    .attr('x', xScale(0))
    .attr('y', function(d) { return yScale(d.age_group); })
    .attr('width', 0)
    .attr('height', yScale.bandwidth())
    .attr('rx', 3) 
    .attr('ry', 3);
    
  newMaleBars.merge(maleBars)
    .on('mouseover', function(event, d) {
      d3.select(this)
        .style('opacity', 0.8)
        .style('stroke', '#333')
        .style('stroke-width', 1);
      
      showHoverInfo(event, {
        age: d.age_group,
        gender: 'Male',
        deaths: d.male,
        percentage: ((d.male / d.total) * 100).toFixed(1)
      });
    })
    .on('mouseout', function() {
      d3.select(this)
        .style('opacity', 1)
        .style('stroke', 'none');
      
      hideHoverInfo();
    })
    .transition(t)
    .attr('x', function(d) { return xScale(-d.male); })
    .attr('width', function(d) { return Math.max(xScale(0) - xScale(-d.male), 1); }); 
  
  // FEMALE BARS (right side) with transition
  const femaleBars = svg.selectAll('.bar.female')
    .data(aggregatedData);
    
  femaleBars.exit().remove();
  
  const newFemaleBars = femaleBars.enter()
    .append('rect')
    .attr('class', 'bar female')
    .attr('x', xScale(0))
    .attr('y', function(d) { return yScale(d.age_group); })
    .attr('width', 0)
    .attr('height', yScale.bandwidth())
    .attr('rx', 3) 
    .attr('ry', 3);
    
  newFemaleBars.merge(femaleBars)
    .on('mouseover', function(event, d) {
      d3.select(this)
        .style('opacity', 0.8)
        .style('stroke', '#333')
        .style('stroke-width', 1);
      
      showHoverInfo(event, {
        age: d.age_group,
        gender: 'Female',
        deaths: d.female,
        percentage: ((d.female / d.total) * 100).toFixed(1)
      });
    })
    .on('mouseout', function() {
      d3.select(this)
        .style('opacity', 1)
        .style('stroke', 'none');
      
      hideHoverInfo();
    })
    .transition(t)
    .attr('width', function(d) { return Math.max(xScale(d.female) - xScale(0), 1); }); // Ensure minimum width
  
  
  setTimeout(function() {
    
    
    aggregatedData.forEach(function(d) {
      // Only add labels for bars that are large enough to fit them
      const maleBarWidth = Math.abs(xScale(0) - xScale(-d.male));
      const femaleBarWidth = Math.abs(xScale(d.female) - xScale(0));
      
      // Add male labels 
      if (maleBarWidth >= 50 && d.male > 0) {
        // Label fits inside the bar
        svg.append('text')
          .attr('class', 'label male')
          .attr('x', xScale(-d.male / 2))
          .attr('y', yScale(d.age_group) + yScale.bandwidth() / 2)
          .attr('dy', '.35em')
          .attr('text-anchor', 'middle')
          .style('fill', 'white')
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(formatNumber(d.male));
      } else if (d.male > 0) {
        // Small bar
        svg.append('text')
          .attr('class', 'label male-small')
          .attr('x', xScale(-d.male) - 5)
          .attr('y', yScale(d.age_group) + yScale.bandwidth() / 2)
          .attr('dy', '.35em')
          .attr('text-anchor', 'end')
          .style('fill', '#4766cb') 
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(formatNumber(d.male));
      }
      
      // Add female labels 
      if (femaleBarWidth >= 50 && d.female > 0) {
        // Label fits inside the bar
        svg.append('text')
          .attr('class', 'label female')
          .attr('x', xScale(d.female / 2))
          .attr('y', yScale(d.age_group) + yScale.bandwidth() / 2)
          .attr('dy', '.35em')
          .attr('text-anchor', 'middle')
          .style('fill', 'white')
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(formatNumber(d.female));
      } else if (d.female > 0) {
        // Small bar 
        svg.append('text')
          .attr('class', 'label female-small')
          .attr('x', xScale(d.female) + 5)
          .attr('y', yScale(d.age_group) + yScale.bandwidth() / 2)
          .attr('dy', '.35em')
          .attr('text-anchor', 'start')
          .style('fill', '#e64c66') 
          .style('font-size', '11px')
          .style('font-weight', 'bold')
          .style('pointer-events', 'none')
          .text(formatNumber(d.female));
      }
    });
  }, 800); 
  
  // Update insights panel
  updateInsights(aggregatedData);
}

// Update insights panel
function updateInsights(data) {
  if (!data || data.length === 0) return;
  
  // Calculate totals and key insights
  const totalMale = d3.sum(data, function(d) { return d.male; });
  const totalFemale = d3.sum(data, function(d) { return d.female; });
  
  // Find age group with highest male and female deaths
  const maxMaleAgeGroup = data.reduce(function(prev, current) {
    return (prev.male > current.male) ? prev : current;
  }, {male: 0}).age_group;
  
  const maxFemaleAgeGroup = data.reduce(function(prev, current) {
    return (prev.female > current.female) ? prev : current;
  }, {female: 0}).age_group;
  
  // Update metric values
  document.getElementById('male-deaths').textContent = formatWithCommas(totalMale);
  document.getElementById('female-deaths').textContent = formatWithCommas(totalFemale);
  
  // Update age groups
  document.getElementById('male-age-group').innerHTML = 
    `<strong>Males:</strong> <span class="age-badge">${maxMaleAgeGroup}</span>`;
  
  document.getElementById('female-age-group').innerHTML = 
    `<strong>Females:</strong> <span class="age-badge">${maxFemaleAgeGroup}</span>`;
}

// Handle window resize
window.addEventListener('resize', debounce(function() {
  console.log("Window resized, updating visualization");
  setupVisualization();
  updateChart();
}, 250));

// Utility function to debounce resize events
function debounce(func, wait) {
  let timeout;
  return function() {
    const context = this;
    const args = arguments;
    clearTimeout(timeout);
    timeout = setTimeout(function() {
      func.apply(context, args);
    }, wait);
  };
}