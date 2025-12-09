/* ===== Jona Berbatovci START ===== */
document.addEventListener("DOMContentLoaded", function () {


    var FEED_URLS = {
        hour: {
            all: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson",
            "1.0": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_hour.geojson",
            "2.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson",
            "4.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_hour.geojson"
        },
        day: {
            all: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
            "1.0": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_day.geojson",
            "2.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson",
            "4.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson"
        },
        week: {
            all: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson",
            "1.0": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_week.geojson",
            "2.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson",
            "4.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson"
        },
        month: {
            all: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_month.geojson",
            "1.0": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/1.0_month.geojson",
            "2.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_month.geojson",
            "4.5": "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_month.geojson"
        }
    };

    var REGION_BOUNDS = {
        na: { latMin: 5, latMax: 83, lonMin: -170, lonMax: -50 },
        sa: { latMin: -60, latMax: 15, lonMin: -90, lonMax: -30 },
        eu: { latMin: 35, latMax: 72, lonMin: -25, lonMax: 45 },
        af: { latMin: -35, latMax: 37, lonMin: -20, lonMax: 55 },
        as: { latMin: 5, latMax: 80, lonMin: 45, lonMax: 180 },
        oc: { latMin: -50, latMax: 0, lonMin: 110, lonMax: 180 }
    };

    var timeRangeSelect = document.getElementById("timeRangeSelect");
    var magnitudeSelect = document.getElementById("magnitudeSelect");
    var regionSelect = document.getElementById("regionSelect");
    var nasaCategorySelect = document.getElementById("nasaCategorySelect");

    var applyEarthquakeBtn = document.getElementById("applyEarthquakeBtn");
    var applyNasaBtn = document.getElementById("applyNasaBtn");

    var currentFeedInfo = document.getElementById("currentFeedInfo");
    var totalCount = document.getElementById("totalCount");
    var maxMagnitude = document.getElementById("maxMagnitude");
    var lastUpdated = document.getElementById("lastUpdated");
    var errorContainer = document.getElementById("errorContainer");

    var sortBySelect = document.getElementById("sortBySelect");
    var sortOrderBtn = document.getElementById("sortOrderBtn");
    var eventsTableBody = document.getElementById("eventsTableBody");
    var eventsSectionTitle = document.getElementById("eventsSectionTitle");

    var detailsMag = document.getElementById("detailsMag");
    var detailsSeverity = document.getElementById("detailsSeverity");
    var detailsLocation = document.getElementById("detailsLocation");
    var detailsDepth = document.getElementById("detailsDepth");
    var detailsTime = document.getElementById("detailsTime");
    var detailsCoords = document.getElementById("detailsCoords");
    var detailsLink = document.getElementById("detailsLink");

    var severitySection = document.getElementById("severitySection");
    var severityLowCount = document.getElementById("severityLowCount");
    var severityModerateCount = document.getElementById("severityModerateCount");
    var severityHighCount = document.getElementById("severityHighCount");
    var severityExtremeCount = document.getElementById("severityExtremeCount");

    var featuredSection = document.getElementById("featuredSection");
    var featuredCards = document.getElementById("featuredCards");

    var earthquakeFiltersRow = document.getElementById("earthquakeFiltersRow");
    var nasaFiltersRow = document.getElementById("nasaFiltersRow");
    var sourceTabs = document.querySelectorAll("#sourceTabs .nav-link");
    var chartSection = document.getElementById("chartSection");
    var loadingSpinner = document.getElementById("loadingSpinner");

    var currentQuakes = [];
    var currentSortOrder = "desc";
    var currentSource = "usgs";

    var quakeMap = null;
    var markersLayer = null;
    var magnitudeChart = null;
    var legendControl = null;

    var markerMap = {};


    function buildFeedUrl() {
        var timeKey = timeRangeSelect.value;
        var magKey = magnitudeSelect.value;
        var group = FEED_URLS[timeKey];
        if (!group) return null;
        return group[magKey] || null;
    }

    function formatTime(timestamp) {
        if (!timestamp) return "N/A";
        var d = new Date(timestamp);
        if (isNaN(d.getTime())) return "N/A";
        return d.toLocaleString();
    }

    function severityForMag(mag) {
        if (mag == null || isNaN(mag)) {
            return { label: "Unknown", className: "bg-secondary", bucket: "Unknown" };
        }
        if (mag < 3) {
            return { label: "Low", className: "bg-severity-low", bucket: "Low (<3)" };
        }
        if (mag < 4.5) {
            return { label: "Moderate", className: "bg-severity-moderate", bucket: "Moderate (3–4.5)" };
        }
        if (mag < 6) {
            return { label: "High", className: "bg-severity-high", bucket: "High (4.5–6)" };
        }
        return { label: "Extreme", className: "bg-severity-extreme", bucket: "Extreme (6+)" };
    }

    function transformUSGS(features) {
        if (!Array.isArray(features)) return [];

        var list = [];
        for (var i = 0; i < features.length; i++) {
            var f = features[i];
            var props = f.properties || {};
            var geom = f.geometry || {};
            var coords = Array.isArray(geom.coordinates) ? geom.coordinates : [null, null, null];

            var lon = coords[0];
            var lat = coords[1];
            var depth = coords[2];

            var mag = typeof props.mag === "number" ? props.mag : parseFloat(props.mag);
            if (isNaN(mag)) mag = null;

            list.push({
                id: props.code || props.id || f.id || String(i),
                mag: mag,
                place: props.place || "Unknown location",
                time: props.time || null,
                depth: typeof depth === "number" ? depth : null,
                lat: typeof lat === "number" ? lat : null,
                lon: typeof lon === "number" ? lon : null,
                url: props.url || props.detail || "",
                category: null
            });
        }
        return list;
    }

    function updateFeedInfo(text) {
        currentFeedInfo.textContent = text;
    }

    function showError(message) {
        errorContainer.innerHTML =
            '<div class="alert alert-danger alert-dismissible fade show" role="alert">' +
            message +
            '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>' +
            "</div>";
    }

    function clearError() {
        errorContainer.innerHTML = "";
    }

    function showSpinner() {
        if (loadingSpinner) {
            loadingSpinner.classList.remove("d-none");
        }
        eventsTableBody.innerHTML = "";
    }

    function hideSpinner() {
        if (loadingSpinner) {
            loadingSpinner.classList.add("d-none");
        }
    }

    function loadUSGS(showModal) {
        clearError();
        currentSource = "usgs";

        var url = buildFeedUrl();
        if (!url) {
            currentQuakes = [];
            applySortAndRender();
            updateSummary(currentQuakes);
            showError("Invalid combination of time range and magnitude filter.");
            return;
        }

        var timeValue = timeRangeSelect.value;
        var magValue = magnitudeSelect.value;

        var timeText =
            timeValue === "hour" ? "Past hour" :
                timeValue === "day" ? "Past 24 hours" :
                    timeValue === "week" ? "Past 7 days" :
                        timeValue === "month" ? "Past 30 days" :
                            "Custom";

        var magText = magValue === "all" ? "All magnitudes" : magValue + "+";
        var regionText = regionSelect.value === "global"
            ? "Global"
            : regionSelect.options[regionSelect.selectedIndex].text;

        updateFeedInfo("USGS · " + timeText + " · Mag: " + magText + " · Region: " + regionText);

        eventsTableBody.innerHTML = "";
        showSpinner();

        fetch(url)
            .then(function (response) {
                if (!response.ok) {
                    throw new Error("Network response was not ok (status " + response.status + ").");
                }
                return response.json();
            })
            .then(function (data) {
                var features = (data && data.features) ? data.features : [];
                currentQuakes = transformUSGS(features);
                currentQuakes = applyRegionFilter(currentQuakes);

                if (!currentQuakes.length) {
                    showError("Request completed but returned no events for the selected filters.");
                }

                hideSpinner();
                updateSummary(currentQuakes);
                applySortAndRender();

                if (showModal) {
                    var modal = new bootstrap.Modal(document.getElementById("dataLoadedModal"));
                    modal.show();
                }
            })
            .catch(function (err) {
                currentQuakes = [];
                hideSpinner();
                updateSummary(currentQuakes);
                applySortAndRender();
                showError("Failed to load USGS data. " + err.message);
            });
    }

    /* ===== END Jona Berbatovci ===== */



    /* ===== Dea Tahiraj START ===== */

    function applyRegionFilter(quakes) {
        var region = regionSelect.value;
        if (!region || region === "global") return quakes;

        var bounds = REGION_BOUNDS[region];
        if (!bounds) return quakes;

        return quakes.filter(function (q) {
            if (q.lat == null || q.lon == null) return false;
            return (
                q.lat >= bounds.latMin && q.lat <= bounds.latMax &&
                q.lon >= bounds.lonMin && q.lon <= bounds.lonMax
            );
        });
    }

    function reverseGeocode(lat, lon) {
        if (lat == null || lon == null) {
            return Promise.resolve("Unknown location");
        }

        var url =
            "https://nominatim.openstreetmap.org/reverse?lat=" +
            encodeURIComponent(lat) +
            "&lon=" +
            encodeURIComponent(lon) +
            "&format=json&zoom=10&addressdetails=1";

        return fetch(url)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data && data.display_name) return data.display_name;
                return "Unknown location";
            })
            .catch(function () {
                return "Unknown location";
            });
    }

    function updateDetails(quake) {
        if (!quake) {
            detailsMag.textContent = "–";
            detailsSeverity.textContent = "–";
            detailsLocation.textContent = "–";
            detailsDepth.textContent = "–";
            detailsTime.textContent = "–";
            detailsCoords.textContent = "–";
            detailsLink.textContent = "–";
            detailsLink.href = "#";
            return;
        }

        var sev = severityForMag(quake.mag);

        detailsMag.textContent = quake.mag != null ? quake.mag.toFixed(1) : "N/A";
        detailsSeverity.textContent = quake.mag != null ? sev.label : "N/A";
        detailsDepth.textContent = quake.depth != null ? quake.depth.toFixed(1) + " km" : "N/A";
        detailsTime.textContent = formatTime(quake.time);
        detailsCoords.textContent =
            (quake.lat != null && quake.lon != null)
                ? quake.lat.toFixed(3) + ", " + quake.lon.toFixed(3)
                : "N/A";
        detailsLink.textContent = quake.url ? "Open source page" : "–";
        detailsLink.href = quake.url || "#";

        if (quake.place && quake.place !== "Unknown location") {
            detailsLocation.textContent = quake.place;
        } else if (quake.category) {
            detailsLocation.textContent = quake.category;
        } else if (quake.lat != null && quake.lon != null && currentSource === "usgs") {
            reverseGeocode(quake.lat, quake.lon).then(function (loc) {
                detailsLocation.textContent = loc;
            });
        } else {
            detailsLocation.textContent = quake.place || "Unknown location";
        }
    }

    /* ===== END Dea Tahiraj ===== */



    /* ===== Jona Gecaj START ===== */

    function renderFeatured(quakes) {
        if (!featuredSection || !featuredCards) return;

        var featured = quakes.filter(function (q) {
            return q.mag != null && q.mag >= 5;
        });

        if (!featured.length) {
            featuredSection.classList.add("d-none");
            featuredCards.innerHTML = "";
            return;
        }

        featuredSection.classList.remove("d-none");
        featuredCards.innerHTML = "";

        featured.slice(0, 3).forEach(function (q) {
            var card = document.createElement("div");
            card.className = "col-md-4";
            card.innerHTML =
                '<div class="card h-100 shadow-sm">' +
                '<div class="card-body">' +
                '<h5 class="card-title text-danger">M ' + q.mag.toFixed(1) + "</h5>" +
                '<p class="card-text">' + (q.place || "Unknown location") + "</p>" +
                '<p class="card-text"><small>' + formatTime(q.time) + "</small></p>" +
                '<a href="' + (q.url || "#") + '" class="btn btn-sm btn-outline-danger" target="_blank">Details</a>' +
                "</div>" +
                "</div>";
            featuredCards.appendChild(card);
        });
    }

    function updateSeverityCards(quakes) {
        if (!severitySection) return;

        var low = 0;
        var moderate = 0;
        var high = 0;
        var extreme = 0;

        for (var i = 0; i < quakes.length; i++) {
            var q = quakes[i];
            if (q.mag == null) continue;

            var sev = severityForMag(q.mag);
            if (sev.bucket === "Low (<3)") low++;
            else if (sev.bucket === "Moderate (3–4.5)") moderate++;
            else if (sev.bucket === "High (4.5–6)") high++;
            else if (sev.bucket === "Extreme (6+)") extreme++;
        }

        var total = low + moderate + high + extreme;
        if (!total) {
            severitySection.classList.add("d-none");
            severityLowCount.textContent = "0";
            severityModerateCount.textContent = "0";
            severityHighCount.textContent = "0";
            severityExtremeCount.textContent = "0";
            return;
        }

        severitySection.classList.remove("d-none");
        severityLowCount.textContent = String(low);
        severityModerateCount.textContent = String(moderate);
        severityHighCount.textContent = String(high);
        severityExtremeCount.textContent = String(extreme);
    }

    function updateSummary(quakes) {
        totalCount.textContent = String(quakes.length);

        if (!quakes.length) {
            maxMagnitude.textContent = "N/A";
            lastUpdated.textContent = formatTime(Date.now());
            return;
        }

        var maxMagValue = null;
        for (var i = 0; i < quakes.length; i++) {
            var q = quakes[i];
            if (q.mag == null) continue;
            if (maxMagValue == null || q.mag > maxMagValue) {
                maxMagValue = q.mag;
            }
        }

        if (maxMagValue == null || currentSource === "eonet") {
            maxMagnitude.textContent = "N/A";
        } else {
            maxMagnitude.textContent = maxMagValue.toFixed(1);
        }
        lastUpdated.textContent = formatTime(Date.now());
    }
    function initMap() {
        if (quakeMap || typeof L === "undefined") return;

        quakeMap = L.map("map").setView([20, 0], 2);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(quakeMap);

        markersLayer = L.layerGroup().addTo(quakeMap);

        legendControl = L.control({ position: "bottomright" });

        legendControl.onAdd = function () {
            var div = L.DomUtil.create("div", "legend leaflet-control");
            div.innerHTML =
                '<div class="legend-title">Magnitude</div>' +
                '<div class="legend-item"><span class="legend-color" style="background:#198754;"></span>Low (&lt; 3)</div>' +
                '<div class="legend-item"><span class="legend-color" style="background:#ffc107;"></span>Moderate (3–4.5)</div>' +
                '<div class="legend-item"><span class="legend-color" style="background:#fd7e14;"></span>High (4.5–6)</div>' +
                '<div class="legend-item"><span class="legend-color" style="background:#dc3545;"></span>Extreme (6+)</div>';
            return div;
        };

        legendControl.addTo(quakeMap);
    }

    function updateMap(quakes) {
        if (typeof L === "undefined") return;

        if (!quakeMap) initMap();
        if (!markersLayer) markersLayer = L.layerGroup().addTo(quakeMap);

        markersLayer.clearLayers();
        markerMap = {};

        if (!quakes.length) return;

        var bounds = [];

        for (var i = 0; i < quakes.length; i++) {
            var q = quakes[i];
            if (q.lat == null || q.lon == null) continue;

            var sev = severityForMag(q.mag);
            var mag = q.mag != null ? q.mag : 0;
            var radius = 4 + mag * 1.5;
            if (radius < 4) radius = 4;

            var color;
            if (currentSource === "usgs") {
                if (sev.label === "Low") color = "#198754";
                else if (sev.label === "Moderate") color = "#ffc107";
                else if (sev.label === "High") color = "#fd7e14";
                else if (sev.label === "Extreme") color = "#dc3545";
                else color = "#6c757d";
            } else {
                color = "#0d6efd";
                radius = 6;
            }

            var marker = L.circleMarker([q.lat, q.lon], {
                radius: radius,
                fillColor: color,
                color: color,
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });

            var popupHtml =
                "<strong>" +
                (currentSource === "usgs"
                    ? (q.mag != null ? "Mag " + q.mag.toFixed(1) : "Earthquake")
                    : (q.place || "Hazard event")) +
                "</strong><br>" +
                (q.place || q.category || "Unknown") +
                "<br>" +
                formatTime(q.time);

            marker.bindPopup(popupHtml);
            marker.addTo(markersLayer);

            markerMap[q.id] = marker;
            bounds.push([q.lat, q.lon]);
        }

        if (bounds.length) {
            quakeMap.fitBounds(bounds, { padding: [20, 20] });
        }
    }

    function updateChart(quakes) {
        var labels = ["Low (<3)", "Moderate (3–4.5)", "High (4.5–6)", "Extreme (6+)"];
        var counts = {
            "Low (<3)": 0,
            "Moderate (3–4.5)": 0,
            "High (4.5–6)": 0,
            "Extreme (6+)": 0
        };

        for (var i = 0; i < quakes.length; i++) {
            var q = quakes[i];
            if (q.mag == null) continue;

            var sev = severityForMag(q.mag);
            if (counts.hasOwnProperty(sev.bucket)) {
                counts[sev.bucket]++;
            }
        }

        var data = labels.map(function (label) {
            return counts[label];
        });

        var ctx = document.getElementById("magnitudeChart");
        if (!ctx) return;

        if (magnitudeChart) {
            magnitudeChart.destroy();
        }

        magnitudeChart = new Chart(ctx, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [
                    {
                        data: data,
                        backgroundColor: [
                            "#2ecc71",
                            "#f1c40f",
                            "#e67e22",
                            "#e74c3c"
                        ],
                        borderColor: "#000",
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
    }

    /* ===== END Jona Gecaj ===== */



    /* ===== Lea Deshishku START ===== */
    function renderTable(quakes) {
        eventsTableBody.innerHTML = "";

        if (!quakes.length) {
            var row = document.createElement("tr");
            var cell = document.createElement("td");
            cell.colSpan = 6;
            cell.className = "text-center py-4";
            cell.textContent = "No events found.";
            row.appendChild(cell);
            eventsTableBody.appendChild(row);
            return;
        }

        for (var i = 0; i < quakes.length; i++) {
            var q = quakes[i];
            var tr = document.createElement("tr");
            tr.dataset.id = q.id;

            var sev = severityForMag(q.mag);
            var magText = q.mag != null ? q.mag.toFixed(1) : "N/A";
            var timeText = formatTime(q.time);
            var depthText = q.depth != null ? q.depth.toFixed(1) : "N/A";
            var coordsText = (q.lat != null && q.lon != null)
                ? q.lat.toFixed(2) + ", " + q.lon.toFixed(2)
                : "N/A";
            var linkText = q.url ? "Open" : "N/A";
            var linkHref = q.url || "#";
            var locationText = q.place || "Unknown";
            if (!locationText && q.category) locationText = q.category;
            tr.innerHTML =
                "<td>" + timeText + "</td>" +
                '<td><span class="badge badge-mag ' + sev.className + '">' + magText + "</span></td>" +
                "<td>" + locationText + "</td>" +
                "<td>" + depthText + "</td>" +
                "<td>" + coordsText + "</td>" +
                '<td><a href="' + linkHref + '" target="_blank" rel="noopener" class="btn btn-sm btn-outline-primary">' +
                linkText +
                "</a></td>";

            eventsTableBody.appendChild(tr);
        }
    }
    function applySortAndRender() {
        var by = sortBySelect.value;
        var desc = currentSortOrder === "desc";

        var sorted = currentQuakes.slice();

        sorted.sort(function (a, b) {
            var av, bv;

            if (by === "mag") {
                av = a.mag != null ? a.mag : -9999;
                bv = b.mag != null ? b.mag : -9999;
            } else if (by === "depth") {
                av = a.depth != null ? a.depth : -9999;
                bv = b.depth != null ? b.depth : -9999;
            } else {
                av = a.time != null ? a.time : 0;
                bv = b.time != null ? b.time : 0;
            }

            if (av < bv) return desc ? 1 : -1;
            if (av > bv) return desc ? -1 : 1;
            return 0;
        });
        renderTable(sorted);
        updateMap(sorted);
        if (currentSource === "usgs") {
            if (chartSection) chartSection.classList.remove("d-none");
            updateChart(sorted);
            renderFeatured(sorted);
            updateSeverityCards(sorted);
        } else {
            if (chartSection) chartSection.classList.add("d-none");
            renderFeatured([]);
            updateSeverityCards([]);
            if (magnitudeChart) {
                magnitudeChart.destroy();
                magnitudeChart = null;
            }
        }
        if (sorted.length) {
            updateDetails(sorted[0]);
        } else {
            updateDetails(null);
        }
    }
    sortOrderBtn.addEventListener("click", function () {
        currentSortOrder = currentSortOrder === "desc" ? "asc" : "desc";
        sortOrderBtn.textContent = currentSortOrder === "desc" ? "↓" : "↑";
        applySortAndRender();
    });
    sortBySelect.addEventListener("change", function () {
        applySortAndRender();
    });
    eventsTableBody.addEventListener("click", function (event) {
        var row = event.target.closest("tr");
        if (!row || !row.dataset.id) return;

        document.querySelectorAll("#eventsTableBody tr")
            .forEach(function (r) { r.classList.remove("active-row"); });
        row.classList.add("active-row");

        var id = row.dataset.id;
        var quake = currentQuakes.find(function (q) { return q.id === id; });

        updateDetails(quake);

        if (quake && quakeMap && markerMap[quake.id]) {
            var marker = markerMap[quake.id];

            quakeMap.setView([quake.lat, quake.lon], 6, { animate: true });
            marker.openPopup();

            var originalRadius = marker.options.radius;
            var sev = severityForMag(quake.mag);

            marker.setStyle({
                color: "#000",
                fillColor: "#fff",
                radius: originalRadius + 4
            });

            setTimeout(function () {
                var baseColor =
                    sev.label === "Low" ? "#198754" :
                        sev.label === "Moderate" ? "#ffc107" :
                            sev.label === "High" ? "#fd7e14" :
                                sev.label === "Extreme" ? "#dc3545" :
                                    "#6c757d";

                marker.setStyle({
                    color: baseColor,
                    fillColor: baseColor,
                    radius: originalRadius
                });
            }, 800);
        }

        var detailsCollapse = document.getElementById("detailsCollapse");
        var collapseObj = bootstrap.Collapse.getOrCreateInstance(detailsCollapse);
        collapseObj.show();
    });

    /* ===== END Lea Deshishku ===== */



    /* ===== Anid Vokshi START ===== */

    function setSourceMode(mode) {
        currentSource = mode;

        var optMag = document.getElementById("sortMag");
        var optDepth = document.getElementById("sortDepth");

        if (mode === "eonet") {
            optMag.classList.add("d-none");
            optDepth.classList.add("d-none");

            sortBySelect.value = "time";
        } else {
            optMag.classList.remove("d-none");
            optDepth.classList.remove("d-none");
        }

        if (mode === "usgs") {
            document.querySelectorAll(".strongest-magnitude-card")
                .forEach(function (el) { el.classList.remove("d-none"); });

            if (legendControl && quakeMap) {
                legendControl.addTo(quakeMap);
            }

            earthquakeFiltersRow.classList.remove("d-none");
            nasaFiltersRow.classList.add("d-none");
            eventsSectionTitle.textContent = "Earthquake Events";

            if (chartSection) chartSection.classList.remove("d-none");
        } else {
            document.querySelectorAll(".strongest-magnitude-card")
                .forEach(function (el) { el.classList.add("d-none"); });

            if (legendControl && quakeMap) {
                quakeMap.removeControl(legendControl);
            }

            earthquakeFiltersRow.classList.add("d-none");
            nasaFiltersRow.classList.remove("d-none");
            eventsSectionTitle.textContent = "Natural Hazard Events";

            if (chartSection) chartSection.classList.add("d-none");
            if (severitySection) severitySection.classList.add("d-none");
            if (featuredSection) featuredSection.classList.add("d-none");
        }

        updateDetails(null);
    }
    function loadEONET(showModal) {
        clearError();
        currentSource = "eonet";

        updateFeedInfo("NASA EONET · Active natural hazard events");

        eventsTableBody.innerHTML = "";
        showSpinner();

        fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=open")
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var events = (data && data.events) ? data.events : [];
                var quakes = [];

                for (var i = 0; i < events.length; i++) {
                    var ev = events[i];
                    var firstGeom = ev.geometry && ev.geometry.length ? ev.geometry[0] : null;
                    var coords = firstGeom && firstGeom.coordinates ? firstGeom.coordinates : [null, null];

                    var lon = coords[0];
                    var lat = coords[1];
                    var time = firstGeom && firstGeom.date ? firstGeom.date : null;
                    var categoryTitle =
                        ev.categories && ev.categories.length ? ev.categories[0].title : "";

                    quakes.push({
                        id: ev.id || String(i),
                        mag: null,
                        place: ev.title || "Unknown event",
                        time: time,
                        depth: null,
                        lon: lon,
                        lat: lat,
                        url: ev.link || "",
                        category: categoryTitle
                    });
                }

                var selected = nasaCategorySelect.value;
                if (selected !== "all") {
                    quakes = quakes.filter(function (q) {
                        var c = (q.category || "").toLowerCase();
                        if (selected === "wildfires") return c.includes("fire");
                        if (selected === "volcanoes") return c.includes("volcano");
                        if (selected === "storms") {
                            return (
                                c.includes("storm") ||
                                c.includes("cyclone") ||
                                c.includes("hurricane") ||
                                c.includes("typhoon")
                            );
                        }
                        if (selected === "floods") return c.includes("flood");
                        if (selected === "ice") return c.includes("ice");
                        if (selected === "other") {
                            return !(
                                c.includes("fire") ||
                                c.includes("volcano") ||
                                c.includes("storm") ||
                                c.includes("cyclone") ||
                                c.includes("hurricane") ||
                                c.includes("typhoon") ||
                                c.includes("flood") ||
                                c.includes("ice")
                            );
                        }
                        return true;
                    });
                }

                currentQuakes = quakes;
                hideSpinner();
                updateSummary(currentQuakes);
                applySortAndRender();

                if (showModal) {
                    var modal = new bootstrap.Modal(document.getElementById("dataLoadedModal"));
                    modal.show();
                }
            })
            .catch(function (err) {
                currentQuakes = [];
                hideSpinner();
                updateSummary(currentQuakes);
                applySortAndRender();
                showError("Failed to load NASA EONET data. " + err.message);
            });
    }

    applyEarthquakeBtn.addEventListener("click", function () {
        setSourceMode("usgs");
        loadUSGS(true);
    });

    applyNasaBtn.addEventListener("click", function () {
        setSourceMode("eonet");
        loadEONET(true);
    });

    sourceTabs.forEach(function (btn) {
        btn.addEventListener("click", function () {
            sourceTabs.forEach(function (b) { b.classList.remove("active"); });
            btn.classList.add("active");

            var src = btn.getAttribute("data-source");
            if (src === "eonet") {
                setSourceMode("eonet");
                loadEONET(false);
            } else {
                setSourceMode("usgs");
                loadUSGS(false);
            }
        });
    });

    /* ===== END Anid Vokshi ===== */



    /* ===== Dea Tahiraj START ===== */

    initMap();
    setSourceMode("usgs");
    loadUSGS(false);

    /* ===== END Dea Tahiraj ===== */

});

