let covidData;
let stocksData = {};
let svg;
let margin = {
    top: 40,
    right: 70,
    bottom: 60,
    left: 80
};
let width;
let height;
let xScale;
let yScaleLeft;
let yScaleRight;
let allDates;
let currentDateRange;
let activeStocks;
let showSP500 = true;

// Stock categories based on available data
const stockCategories = {
    'market-index': ['S&P500'],
    'vaccine': ['PFE', 'MRNA', 'JNJ', 'NVAX'],
    'tech': ['AMZN', 'ZM'],
    'finance': ['JPM'],
    'travel': ['DAL', 'MAR'],
    'consumer': ['KO']
};

// Color palettes for different categories
const colorPalettes = {
    'market-index': ['#2c3e50'],
    'vaccine': ['#FF9900', '#00CC96', '#EF553B', '#19D3F3'],
    'tech': ['#636EFA', '#EF553B'],
    'finance': ['#AB63FA'],
    'travel': ['#FECB52', '#9467BD'],
    'consumer': ['#FF6692']
};

// Initialize the color map
const stockColors = {};
Object.keys(stockCategories).forEach((category, categoryIndex) => {
    stockCategories[category].forEach((symbol, symbolIndex) => {
        stockColors[symbol] = colorPalettes[category][symbolIndex % colorPalettes[category].length];
    });
});

function calculateZScore(values) {
    const mean = d3.mean(values);
    const stdDev = d3.deviation(values);
    return values.map(v => (v - mean) / stdDev);
}

function standardizeStockData() {
    Object.entries(stocksData)
        .forEach(([symbol, data]) => {
            const values = data.map(d => d.value);
            const zScores = calculateZScore(values);

            stocksData[symbol] = data.map((d, i) => ({
                date: d.date,
                name: d.name,
                value: zScores[i],
                originalValue: d.value
            }));
        });
}

function initViz() {
    // Update the width and height based on the container size
    const container = document.getElementById('map-container');
    width = container.clientWidth - margin.left - margin.right;
    height = container.clientHeight - margin.top - margin.bottom;

    // Initialize active stocks set
    activeStocks = new Set();
    
    // Add initial stocks - only market index and vaccine stocks
    // Add only PFE and MRNA from vaccine category initially
    activeStocks.add('PFE');
    activeStocks.add('MRNA');
    // Don't add any other stocks initially

    // Create SVG
    svg = d3.select("#map-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Load all data
    Promise.all([
            d3.csv("/data/stocks_2020_2023.csv"),
            d3.csv("/data/InternationalCovid19Cases.csv"),
            d3.csv("/data/s&p500.csv")
        ])
        .then(([stocks, covid, sp500]) => {
            processData(stocks, covid, sp500);
            standardizeStockData();
            allDates = [...new Set(covidData.map(d => d.date))].sort((a, b) => a - b);
            currentDateRange = [allDates[0], allDates[allDates.length - 1]];
            setupStockControls('market-index'); // Start with market-index tab
            drawVisualization();
            setupTimeRange();
            setupTabButtons();
        })
        .catch(error => {
            console.error("Error loading data:", error);
            document.getElementById("map-container")
                .innerHTML =
                `<div class="error">Error loading data. Please check console for details.</div>`;
        });
}

function processData(stocks, covid, sp500) {
    // Process COVID-19 data
    covidData = covid
        .filter(d => d.iso_code === 'USA' && d.new_cases !== null && d.new_cases !== undefined)
        .map(d => ({
            date: new Date(d.date),
            cases: +d.new_cases || 0
        }));

    // Process S&P 500 data
    stocksData['S&P500'] = sp500.map(d => ({
            date: new Date(d.Date),
            name: "S&P 500",
            value: +d['Close/Last'].replace('$', '')
        }))
        .sort((a, b) => a.date - b.date);

    // Process other stock data
    const groupedStocks = d3.group(stocks, d => d.Symbol);

    // Process each stock's data
    groupedStocks.forEach((data, symbol) => {
        if (stockColors.hasOwnProperty(symbol)) {
            stocksData[symbol] = data.map(d => ({
                    date: new Date(d.date),
                    name: d.Name,
                    value: +d.close
                }))
                .sort((a, b) => a.date - b.date);
        }
    });
}

function setupTabButtons() {
    // Handle tab switching
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Show the corresponding stock section
            setupStockControls(button.dataset.tab);
        });
    });
}

function setupStockControls(activeTab = 'market-index') {
    const container = d3.select("#stock-checkboxes");
    container.selectAll("*").remove();
    
    // Create sections for each category
    Object.keys(stockCategories).forEach(category => {
        const sectionDiv = container.append("div")
            .attr("class", `stock-section ${category === activeTab ? 'active' : ''}`)
            .attr("data-category", category);
            
        // Market index is treated separately
        if (category === 'market-index') {
            const sp500Div = sectionDiv.append("div")
                .attr("class", "stock-checkbox");

            sp500Div.append("input")
                .attr("type", "checkbox")
                .attr("id", "checkbox-S&P500")
                .attr("checked", showSP500)
                .on("change", function() {
                    showSP500 = this.checked;
                    drawVisualization();
                });

            sp500Div.append("label")
                .attr("for", "checkbox-S&P500")
                .text("S&P 500")
                .append("div")
                .attr("class", "color-indicator")
                .style("background-color", stockColors['S&P500']);
        } else {
            // Create checkboxes for each stock in this category
            stockCategories[category].forEach(symbol => {
                const checkboxDiv = sectionDiv.append("div")
                    .attr("class", "stock-checkbox");

                const fullName = stocksData[symbol] ? stocksData[symbol][0]?.name || symbol : symbol;
                
                // Check if this stock should be checked initially
                // Only check PFE and MRNA from vaccine category
                const isChecked = activeStocks.has(symbol);
                
                checkboxDiv.append("input")
                    .attr("type", "checkbox")
                    .attr("id", `checkbox-${symbol}`)
                    .property("checked", isChecked) // Use property() instead of attr() for dynamic setting
                    .on("change", function() {
                        if (this.checked) {
                            activeStocks.add(symbol);
                        } else {
                            activeStocks.delete(symbol);
                        }
                        drawVisualization();
                    });

                checkboxDiv.append("label")
                    .attr("for", `checkbox-${symbol}`)
                    .text(`${symbol} - ${fullName}`)
                    .append("div")
                    .attr("class", "color-indicator")
                    .style("background-color", stockColors[symbol]);
            });
        }
    });
}

function setupTimeRange() {
    const slidersContainer = d3.select(".sliders-container").node();
    const dateDisplay = d3.select("#date-range-display");

    if (allDates.length > 1) {
        noUiSlider.create(slidersContainer, {
            start: [0, allDates.length - 1],
            connect: true,
            range: {
                'min': 0,
                'max': allDates.length - 1
            },
            step: 1,
            tooltips: false
        });

        slidersContainer.noUiSlider.on('update', (values) => {
            const startIndex = Math.floor(+values[0]);
            const endIndex = Math.floor(+values[1]);

            const startDate = allDates[startIndex];
            const endDate = allDates[endIndex];

            currentDateRange = [startDate, endDate];
            dateDisplay.text(`${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
            drawVisualization();
        });
    }
}

function updateScales() {
    xScale = d3.scaleTime()
        .domain(currentDateRange)
        .range([0, width]);

    const filteredCovidData = covidData.filter(d =>
        d.date >= currentDateRange[0] && d.date <= currentDateRange[1]
    );

    const activeStockValues = Object.entries(stocksData)
        .filter(([symbol]) =>
            (symbol === 'S&P500' && showSP500) ||
            (symbol !== 'S&P500' && activeStocks.has(symbol))
        )
        .flatMap(([_, data]) => data.filter(d =>
            d.date >= currentDateRange[0] && d.date <= currentDateRange[1]
        ))
        .map(d => d.value);

    yScaleLeft = d3.scaleLinear()
        .domain([0, d3.max(filteredCovidData, d => d.cases) * 1.1])
        .range([height, 0]);

    yScaleRight = d3.scaleLinear()
        .domain([
            Math.min(-3, d3.min(activeStockValues) || -3),
            Math.max(3, d3.max(activeStockValues) || 3)
        ])
        .range([height, 0]);
}

function drawAxes() {
    // Clear previous axes
    svg.selectAll(".axis").remove();
    
    // Add X axis
    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "x-axis axis")
        .call(d3.axisBottom(xScale)
            .ticks(Math.min(8, Math.floor(width / 100)))
            .tickFormat(d3.timeFormat("%b %Y")))
        .style("color", "#636363");
    
    // Add rotation to x-axis labels for better readability
    svg.selectAll(".x-axis text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // Add Y axis for COVID cases
    svg.append("g")
        .attr("class", "y-axis-left axis")
        .call(d3.axisLeft(yScaleLeft)
            .ticks(5)
            .tickFormat(d => d3.format(".1s")(d)))
        .style("color", "#636363");

    // Add Y axis for stock Z-scores
    svg.append("g")
        .attr("class", "y-axis-right axis")
        .attr("transform", `translate(${width},0)`)
        .call(d3.axisRight(yScaleRight)
            .ticks(5))
        .style("color", "#636363");
}

function drawLines() {
    const filteredCovidData = covidData.filter(d =>
        d.date >= currentDateRange[0] && d.date <= currentDateRange[1]
    );

    // Draw COVID line
    const covidLine = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScaleLeft(d.cases))
        .curve(d3.curveMonotoneX); 

    svg.append("path")
        .datum(filteredCovidData)
        .attr("class", "covid-line")
        .attr("fill", "none")
        .attr("stroke", "#636EFA")
        .attr("stroke-width", 2)
        .attr("d", covidLine);

    // Draw stock lines
    const stockLine = d3.line()
        .x(d => xScale(d.date))
        .y(d => yScaleRight(d.value))
        .curve(d3.curveMonotoneX); 

    // Create tooltip
    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    // Draw each stock line
    Object.entries(stocksData)
        .forEach(([symbol, data]) => {
            // Only draw lines for stocks that are checked (active)
            if ((symbol === 'S&P500' && showSP500) ||
                (symbol !== 'S&P500' && activeStocks.has(symbol))) {
                
                const filteredStockData = data.filter(d =>
                    d.date >= currentDateRange[0] && d.date <= currentDateRange[1]
                );

                // Only draw if we have data
                if (filteredStockData.length > 0) {
                    const path = svg.append("path")
                        .datum(filteredStockData)
                        .attr("class", `stock-line ${symbol}-line`)
                        .attr("fill", "none")
                        .attr("stroke", stockColors[symbol])
                        .attr("stroke-width", 2)
                        .attr("d", stockLine);

                    
                    path
                        .on("mouseover", function() {
                            d3.select(this)
                                .attr("stroke-width", 4);
                            tooltip.style("opacity", 1);
                        })
                        .on("mousemove", function(event) {
                            const [xPos] = d3.pointer(event);
                            const date = xScale.invert(xPos);
                            const bisect = d3.bisector(d => d.date).left;
                            const index = bisect(filteredStockData, date);
                            const d = filteredStockData[index];

                            if (d) {
                                tooltip
                                    .html(`<b>${d.name}</b><br>
                                      Date: ${d.date.toLocaleDateString()}<br>
                                      Z-Score: ${d.value.toFixed(2)}<br>
                                      Price: $${d.originalValue.toFixed(2)}`)
                                    .style("left", (event.pageX + 10) + "px")
                                    .style("top", (event.pageY - 28) + "px");
                            }
                        })
                        .on("mouseout", function() {
                            d3.select(this)
                                .attr("stroke-width", 2);
                            tooltip.style("opacity", 0);
                        });
                }
            }
        });
}

function addLabels() {
    // Add Y-axis left label
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "#636EFA")
        .style("font-size", "12px")
        .text("New COVID-19 Cases");

    // Add Y-axis right label - moved closer to the axis
    svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", width + margin.right - 45) // Reduced from -15 to -45 to move label closer to axis
        .attr("x", -height / 2)
        .attr("dy", "1em")
        .style("text-anchor", "middle")
        .style("fill", "#FF9900")
        .style("font-size", "12px")
        .text("Stock Performance (Z-Score)");
        
    // Add X-axis label
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", height + margin.bottom - 10)
        .style("text-anchor", "middle")
        .style("fill", "#636363")
        .style("font-size", "12px")
        .text("Date");
}

function addLegend() {
    const legend = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width - 150}, 10)`);
        
    // Add title
    legend.append("text")
        .attr("x", 0)
        .attr("y", -5)
        .style("font-size", "10px")
        .style("font-weight", "bold")
        .text("Legend");

    // COVID line
    legend.append("line")
        .attr("x1", 0)
        .attr("x2", 20)
        .attr("y1", 10)
        .attr("y2", 10)
        .attr("stroke", "#636EFA")
        .attr("stroke-width", 2);

    legend.append("text")
        .attr("x", 25)
        .attr("y", 13)
        .text("COVID-19 Cases")
        .style("font-size", "10px");

    // Add stock lines to legend
    let currentY = 30;
    
    // Start with S&P500 if visible
    if (showSP500) {
        legend.append("line")
            .attr("x1", 0)
            .attr("x2", 20)
            .attr("y1", currentY)
            .attr("y2", currentY)
            .attr("stroke", stockColors['S&P500'])
            .attr("stroke-width", 2);

        legend.append("text")
            .attr("x", 25)
            .attr("y", currentY + 3)
            .text("S&P 500")
            .style("font-size", "10px");

        currentY += 20;
    }
    
    // Then add active stocks
    Object.entries(stocksData)
        .filter(([symbol, _]) => symbol !== 'S&P500' && activeStocks.has(symbol))
        .forEach(([symbol, data]) => {
            const name = data[0]?.name || symbol;
            
            legend.append("line")
                .attr("x1", 0)
                .attr("x2", 20)
                .attr("y1", currentY)
                .attr("y2", currentY)
                .attr("stroke", stockColors[symbol])
                .attr("stroke-width", 2);

            legend.append("text")
                .attr("x", 25)
                .attr("y", currentY + 3)
                .text(`${symbol}`)
                .style("font-size", "10px");

            currentY += 20;
        });
}

function drawVisualization() {
    // Clear previous elements
    svg.selectAll("*").remove();

    // Add background rectangle
    svg.append("rect")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .attr("transform", `translate(${-margin.left},${-margin.top})`)
        .attr("fill", "#f8f9fa")
        .attr("opacity", 0.5);

    // Update scales with current data
    updateScales();
    
    // Draw all elements
    drawAxes();
    drawLines();
    addLabels();
    addLegend();
}

// Handle window resize
window.addEventListener('resize', function() {
    // Get new dimensions
    const container = document.getElementById('map-container');
    width = container.clientWidth - margin.left - margin.right;
    height = container.clientHeight - margin.top - margin.bottom;

    // Update SVG dimensions
    d3.select("#map-container svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

    // Redraw visualization
    drawVisualization();
});

// Initialize visualization
initViz();