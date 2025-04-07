let covidData;
let svg;
let margin = {
    top: 20,
    right: 30,
    bottom: 50,
    left: 60
};
let width;
let height;
let xScale;
let yScale;
let allDates;
let currentDateRange;
const VACCINE_ROLLOUT_DATE = new Date('2021-04-19');

function initViz() {
    width = document.getElementById('chart-container')
        .clientWidth - margin.left - margin.right;
    height = document.getElementById('chart-container')
        .clientHeight - margin.top - margin.bottom;

    svg = d3.select("#chart-container")
        .append("svg")
        .attr("width", "100%")
        .attr("height", "100%")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    d3.csv("../data/InternationalCovid19Cases.csv")
        .then(covid => {
            processData(covid);
            allDates = [...new Set(covidData.map(d => d.date))].sort((a, b) => a - b);
            currentDateRange = [allDates[0], allDates[allDates.length - 1]];
            drawVisualization();
            setupTimeRange();
        })
        .catch(error => {
            console.error("Error loading data:", error);
            document.getElementById("chart-container")
                .innerHTML =
                `<div class="error">Error loading data. Please check console for details.</div>`;
        });
}

function processData(covid) {

    const usaData = covid
        .filter(d => d.iso_code === 'USA' && d.new_cases !== null && d.new_cases !== undefined)
        .map(d => ({
            date: new Date(d.date),
            cases: +d.new_cases || 0
        }));

    const weeklyData = d3.groups(usaData, d =>
            d3.timeFormat("%Y-%U")(d.date)
        )
        .map(([week, data]) => ({
            date: data[0].date,
            cases: d3.sum(data, d => d.cases)
        }));

    covidData = weeklyData.sort((a, b) => a.date - b.date);
}

function setupTimeRange() {
    const slidersContainer = d3.select(".sliders-container")
        .node();
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
    const filteredData = covidData.filter(d =>
        d.date >= currentDateRange[0] && d.date <= currentDateRange[1]
    );

    xScale = d3.scaleBand()
        .domain(filteredData.map(d => d.date))
        .range([0, width])
        .padding(0.1);

    yScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.cases)])
        .range([height, 0]);
}

function drawAxes() {
    
    const tickCount = Math.min(5, Math.floor(width / 120));
    const tickValues = xScale.domain()
        .filter((_, i, arr) => 
            i === 0 || i === arr.length - 1 || 
            (arr.length > 2 && i % Math.max(1, Math.floor(arr.length / tickCount)) === 0));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .attr("class", "x-axis")
        .call(d3.axisBottom(xScale)
            .tickFormat(d3.timeFormat("%b %Y"))
            .tickValues(tickValues))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    svg.append("g")
        .attr("class", "y-axis")
        .call(d3.axisLeft(yScale)
            .ticks(5)
            .tickFormat(d => {
                if (d >= 1000000) {
                    return d3.format(".1f")(d / 1000000) + "M";
                } else if (d >= 1000) {
                    return d3.format(".0f")(d / 1000) + "K";
                } else {
                    return d3.format(".0f")(d);
                }
            }));

    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("text-anchor", "middle")
        .text("Date");

    svg.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .style("text-anchor", "middle")
        .text("Weekly Cases");
}

function drawBars() {
    const filteredData = covidData.filter(d =>
        d.date >= currentDateRange[0] && d.date <= currentDateRange[1]
    );

    const tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    svg.selectAll(".bar")
        .data(filteredData)
        .enter()
        .append("rect")
        .attr("class", "bar")
        .attr("x", d => xScale(d.date))
        .attr("width", xScale.bandwidth())
        .attr("y", d => yScale(d.cases))
        .attr("height", d => height - yScale(d.cases))
        .on("mouseover", function(event, d) {
            d3.select(this)
                .style("opacity", 0.8);
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`Week of ${d.date.toLocaleDateString()}<br>Cases: ${d3.format(",")(Math.round(d.cases))}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this)
                .style("opacity", 1);
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
}

function addVaccineMarker() {
    if (VACCINE_ROLLOUT_DATE >= currentDateRange[0] &&
        VACCINE_ROLLOUT_DATE <= currentDateRange[1]) {

        const xPosition = xScale(VACCINE_ROLLOUT_DATE) + xScale.bandwidth() / 2;

        svg.append("line")
            .attr("class", "vaccine-marker")
            .attr("x1", xPosition)
            .attr("x2", xPosition)
            .attr("y1", 0)
            .attr("y2", height)
            .style("stroke", "#FF9900")
            .style("stroke-width", 2)
            .style("stroke-dasharray", "5,5");

        svg.append("text")
            .attr("class", "vaccine-label")
            .attr("x", xPosition)
            .attr("y", 0)
            .attr("dy", "-0.3em")
            .attr("text-anchor", "middle")
            .style("fill", "#FF9900")
            .style("font-size", "10px")
            .style("font-weight", "bold")
            .text("Vaccine Rollout");
    }
}

function drawVisualization() {
    svg.selectAll("*")
        .remove();

    updateScales();
    drawAxes();
    drawBars();
    addVaccineMarker();
}

window.addEventListener('resize', function() {
    width = document.getElementById('chart-container')
        .clientWidth - margin.left - margin.right;
    height = document.getElementById('chart-container')
        .clientHeight - margin.top - margin.bottom;

    d3.select("#chart-container svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`);

    drawVisualization();
});


window.addEventListener('load', initViz);