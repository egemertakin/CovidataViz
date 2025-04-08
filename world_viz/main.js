
let covidData = [];
let worldData;
let dates = [];
let currentDateIndex = 0;
let playing = false;
let animationSpeed; 
let timer;
let colorScale;

// Set up dimensions to fit without scrolling
const width = window.innerWidth;
const height = window.innerHeight;

// Create SVG
const svg = d3.select("#map-container")
  .append("svg")
  .attr("width", "100%")
  .attr("height", "100%")
  .attr("viewBox", `0 0 ${width} ${height}`)
  .attr("preserveAspectRatio", "xMidYMid meet");

// Create a group for the map - initially zoomed out
const g = svg.append("g");

// Create tooltip
const tooltip = d3.select("body")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Projection and path generator 
const projection = d3.geoNaturalEarth1()
  .scale((width * 0.9) / 2 / Math.PI)
  .translate([width / 2, height / 2]);
const path = d3.geoPath().projection(projection);



// Country name mapping
let countryNameMap = {};

// Load data using GeoJSON
Promise.all([
  // World map geojson
  d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson"),
  // COVID data CSV
  d3.csv("../data/InternationalCovid19Cases.csv"),
  // Country data for ISO-code to name mapping
  d3.json("https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/slim-3/slim-3.json")
]).then(([world, covid, countryData]) => {
  worldData = world;

  // Create ISO code to country name mapping
  countryData.forEach(country => {
    countryNameMap[country["alpha-3"]] = country.name;
  });

  // Process COVID data 
  covid.forEach(d => {
    d.total_deaths = d.total_deaths === "NA" ? 0 : +d.total_deaths; // Treat NA as 0 deaths
    d.date = d.date;
    if (d.iso_code && d.date) {
      covidData.push(d);
    }
  });

  // Get unique dates and sort them
  dates = [...new Set(covidData.map(d => d.date))].sort();

  // Update slider max value
  document.getElementById("date-slider").max = dates.length - 1;

  // Initialize the visualization and controls
  initViz();
  setupControls();

  // Start with the first date
  updateMap(0);
}).catch(error => {
  console.error("Error loading data:", error);
  document.getElementById("map-container").innerHTML =
    `<div class="error">Error loading data. Please check console for details.</div>`;
});

function initViz() {
  // Create color scale 
  colorScale = d3.scaleThreshold()
    .domain([1, 10, 100, 1000, 10000, 100000, 1000000])
    .range(["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#ef3b2c", "#cb181d", "#a50f15", "#67000d"]);

  // Draw countries using GeoJSON
  g.selectAll(".country")
    .data(worldData.features)
    .enter()
    .append("path")
    .attr("class", "country")
    .attr("d", path)
    .attr("fill", "#ccc")
    .attr("stroke", "#fff")
    .attr("stroke-width", 0.5)
    .on("mouseover", function (event, d) {
      d3.select(this)
        .attr("stroke-width", 1.5)
        .attr("stroke", "#333");

      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);

      
      const countryCode = d.properties.iso_a3 || d.id;
      const countryName = countryNameMap[countryCode] || countryCode;
      const dateData = covidData.filter(item =>
        item.iso_code === countryCode && item.date === dates[currentDateIndex]);

      let content = "";
      if (dateData.length > 0) {
        const deaths = dateData[0].total_deaths;
        content = `<strong>${countryName}</strong><br>Deaths: ${deaths.toLocaleString()}`;
      } else {
        content = `<strong>${countryName}</strong><br>Deaths: 0`;
      }

      tooltip.html(content)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");

      updateCountryInfo(countryCode, dates[currentDateIndex]);
    })
    .on("mouseout", function () {
      d3.select(this)
        .attr("stroke-width", 0.5)
        .attr("stroke", "#fff");

      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    });

  createLegend();
}





function updateMap(dateIndex) {
  currentDateIndex = dateIndex;
  const currentDate = dates[dateIndex];

  // Update date and global deaths display
  document.getElementById("current-date").textContent = `Date: ${currentDate}`;
  const totalDeaths = covidData
    .filter(d => d.date === currentDate && d.total_deaths !== null)
    .reduce((sum, d) => sum + d.total_deaths, 0);
  document.getElementById("death-total").textContent = `Global Deaths: ${totalDeaths.toLocaleString()}`;
  document.getElementById("date-slider").value = dateIndex;
  
  // Check if we're at the end and update button text accordingly
  if (dateIndex >= dates.length - 1) {
    document.getElementById("play-pause").textContent = "Restart";
  } else if (!playing) {
    document.getElementById("play-pause").textContent = "Play";
  }

  // Update map colors immediately 
  g.selectAll(".country")
    .attr("fill", function (d) {
      
      const countryCode = d.properties.iso_a3 || d.id;
      const countryData = covidData.find(item =>
        item.iso_code === countryCode && item.date === currentDate);
      
      if (countryData && countryData.total_deaths > 0) {
        return colorScale(countryData.total_deaths);
      } else {
        return "#ccc"; 
      }
    });
    
  // Force rerender to ensure colors update properly
  g.selectAll(".country").each(function(d) {
    const countryCode = d.properties.iso_a3 || d.id;
    const countryData = covidData.find(item => 
      item.iso_code === countryCode && item.date === currentDate);
    
    if (countryData && countryData.total_deaths > 0) {
      d3.select(this).attr("fill", colorScale(countryData.total_deaths));
    }
  });
}

function createLegend() {
  const legendContainer = d3.select("#legend");
  const legendWidth = 150;
  const legendHeight = 15;
  
  const legendSvg = legendContainer
    .append("svg")
    .attr("width", legendWidth)
    .attr("height", legendHeight * colorScale.range().length);

  const legendItems = legendSvg.selectAll(".legend-item")
    .data(colorScale.range())
    .enter()
    .append("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(0, ${i * legendHeight})`);

  legendItems.append("rect")
    .attr("width", 15)
    .attr("height", legendHeight - 2)
    .attr("fill", d => d);

  legendItems.append("text")
    .attr("x", 20)
    .attr("y", legendHeight / 2)
    .attr("dy", "0.35em")
    .style("font-size", "10px")
    .text((d, i) => {
      const domain = colorScale.domain();
      if (i === 0) {
        return "0";
      } else if (i === domain.length) {
        return domain[domain.length - 1] + "+";
      } else {
        return domain[i - 1] + " - " + domain[i];
      }
    });
}

function updateCountryInfo(countryCode, date) {
  const infoPanel = document.getElementById("country-info");
  const countryName = countryNameMap[countryCode] || countryCode;
  const countryData = covidData.find(item =>
    item.iso_code === countryCode && item.date === date);

  let content = `<h3>${countryName}</h3>`;
  if (countryData) {
    const deaths = countryData.total_deaths;
    content += `
      <p><strong>Deaths: ${deaths.toLocaleString()}</strong></p>
      <p>Date: ${date}</p>
      <p>ISO Code: ${countryCode}</p>
    `;
  } else {
    content += `
      <p><strong>Deaths: 0</strong></p>
      <p>Date: ${date}</p>
      <p>ISO Code: ${countryCode}</p>
    `;
  }
  infoPanel.innerHTML = content;
}

function setupControls() {
  // Play/Pause button
  const playPauseBtn = document.getElementById("play-pause");
  playPauseBtn.addEventListener("click", togglePlayPause);

  // Date slider
  const dateSlider = document.getElementById("date-slider");
  dateSlider.addEventListener("input", function () {
    const newIndex = parseInt(this.value);
    updateMap(newIndex);
    if (playing) {
      togglePlayPause();
    }
  });

  // Speed control 
  const speedSelect = document.getElementById("speed");
  
  // Initialize the animation speed from the selected dropdown value
  animationSpeed = parseInt(speedSelect.value);
  console.log("Initial animation speed set to:", animationSpeed);
  
  speedSelect.addEventListener("change", function () {
    // Get the new speed directly from the select element
    const newSpeed = parseInt(this.value);
    console.log("Animation speed changing from", animationSpeed, "to", newSpeed);
    
    // Update the speed variable
    animationSpeed = newSpeed;
    
    // If animation is currently playing, restart it with the new speed
    if (playing) {
      clearInterval(timer);
      timer = null;
      startAnimation();
    }
  });
}

function togglePlayPause() {
  const btn = document.getElementById("play-pause");
  
  if (currentDateIndex >= dates.length - 1 && btn.textContent === "Restart") {
    updateMap(0);
    btn.textContent = "Play";
    return;
  }
  
  playing = !playing;
  if (playing) {
    btn.textContent = "Pause";
    // Clear any existing timer before starting animation
    if (timer) clearInterval(timer);
    timer = null;
    startAnimation();
  } else {
    btn.textContent = "Play";
    clearInterval(timer);
    timer = null;
  }
}

function startAnimation() {
  // Make sure we don't have multiple timers running
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  console.log("Starting animation with speed:", animationSpeed, "ms");
  
  // Use requestAnimationFrame for smoother animation with very fast speeds
  let lastUpdateTime = 0;
  
  function animate(timestamp) {
    if (!playing) return; // Stop if no longer playing
    
    const elapsed = timestamp - lastUpdateTime;
    
    // Only update when enough time has passed based on animation speed
    if (elapsed >= animationSpeed) {
      lastUpdateTime = timestamp;
      
      let nextIndex = currentDateIndex + 1;
      if (nextIndex >= dates.length) {
        // Stop at the end and change button to "Restart"
        playing = false;
        document.getElementById("play-pause").textContent = "Restart";
        return;
      }
      
      updateMap(nextIndex);
    }
    
    // Continue animation loop if still playing
    if (playing) {
      requestAnimationFrame(animate);
    }
  }
  
  // Start the animation loop
  requestAnimationFrame(animate);
}

// Add zoom functionality with initial zoom level that fits everything
const zoom = d3.zoom()
  .extent([[0, 0], [width, height]])
  .scaleExtent([1, 8])
  .on("zoom", (event) => {
    g.attr("transform", event.transform);
  });

svg.call(zoom);

// Set initial zoom to fit everything
const initialZoom = d3.zoomIdentity.scale(1);
svg.call(zoom.transform, initialZoom);

// Window resize handler to ensure proper fit
window.addEventListener('resize', function() {
  location.reload(); // Force reload on resize to adjust map
});