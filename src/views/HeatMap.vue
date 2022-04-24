<template>
  <div class="map-wrap">
    <a href="https://www.maptiler.com" class="watermark"
      ><img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
    /></a>
    <div class="map" id="mapContainer"></div>
    <img :src="url" alt="heatmap keys" id="legend" />
  </div>
</template>

<script>
import { Map, NavigationControl } from "maplibre-gl";
export default {
  data: () => ({
    map: null,
    url: require("../assets/heatmaplegend.png"),
  }),
  mounted() {
    const apiKey = process.env.VUE_APP_API_KEY;
    const mapContainer = document.getElementById("mapContainer");
    if (apiKey == null) {
      throw new Error(
        "You need to configure env VUE_APP_API_KEY first, see README"
      );
    }
    //Center and zoom map onto Singapore
    const initialState = {
      lng: 103.8023514142483,
      lat: 1.3695991684760638,
      zoom: 10,
    };
    this.map = new Map({
      container: mapContainer,
      style: `https://api.maptiler.com/maps/957b48fe-e94f-4a6c-8830-ae9920c3f794/style.json?key=${apiKey}`,
      center: [initialState.lng, initialState.lat],
      zoom: initialState.zoom,
    });
    this.map.addControl(new NavigationControl(), "top-right");
    fetch("https://api.data.gov.sg/v1//transport/taxi-availability")
      .then((res) => res.json())
      .then((parsedRes) => {
        let data = parsedRes.features[0].geometry.coordinates;

        console.log("taxi count:" + data.length);

        let reducedCoords = [];
        data.forEach((coord) => {
          reducedCoords.push([coord[0].toFixed(2), coord[1].toFixed(2)]);
        });
        console.log("reduced coords length: " + reducedCoords.length);

        let uniquePositions = [];
        let uniqueCount = [];

        var sortedReducedArray = reducedCoords.sort(function (a, b) {
          if (a[0] == b[0]) {
            return a[1] - b[1];
          }
          return b[0] - a[0];
        });

        console.log(sortedReducedArray);

        sortedReducedArray.forEach((c, i) => {
          if (i == 0) {
            uniquePositions.push(c);
            uniqueCount.push(1);
          } else {
            if (
              JSON.stringify(c) ==
              JSON.stringify(uniquePositions[uniquePositions.length - 1])
            ) {
              uniqueCount[uniqueCount.length - 1] += 1;
            } else {
              uniquePositions.push(c);
              uniqueCount.push(1);
            }
          }
        });

        console.log(uniquePositions, uniqueCount);

        console.log("Total count: " + uniqueCount.reduce((a, b) => a + b, 0));

        const min = Math.min.apply(Math, uniqueCount);
        const max = Math.max.apply(Math, uniqueCount);

        let heatData = {
          type: "FeatureCollection",
          features: [],
        };
        uniquePositions.forEach((coord, index) => {
          heatData.features.push({
            type: "Feature",
            properties: { mag: uniqueCount[index] },
            geometry: { type: "Point", coordinates: coord },
          });
        });

        console.log(heatData);

        console.log(`Min: ${min} Max: ${max}`);

        const aMap = this.map;

        aMap.on("load", function () {
          // Add a geojson point source.
          // Heatmap layers also work with a vector tile source.
          aMap.addSource("taxis", {
            type: "geojson",
            data: heatData,
          });

          aMap.addLayer(
            {
              id: "taxiheat",
              type: "heatmap",
              source: "taxis",
              maxzoom: 9,
              paint: {
                // Increase the heatmap weight based on frequency and property magnitude
                "heatmap-weight": [
                  "interpolate",
                  ["linear"],
                  ["get", "mag"],
                  0,
                  0,
                  6,
                  1,
                ],
                // Increase the heatmap color weight weight by zoom level
                // heatmap-intensity is a multiplier on top of heatmap-weight
                "heatmap-intensity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  1,
                  9,
                  3,
                ],
                // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
                // Begin color ramp at 0-stop with a 0-transparancy color
                // to create a blur-like effect.
                "heatmap-color": [
                  "interpolate",
                  ["linear"],
                  ["heatmap-density"],
                  0,
                  "rgba(33,102,172,0)",
                  0.2,
                  "rgb(103,169,207)",
                  0.4,
                  "rgb(209,229,240)",
                  0.6,
                  "rgb(253,219,199)",
                  0.8,
                  "rgb(239,138,98)",
                  1,
                  "rgb(178,24,43)",
                ],
                // Adjust the heatmap radius by zoom level
                "heatmap-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  0,
                  2,
                  9,
                  20,
                ],
                // Transition from heatmap to circle layer by zoom level
                "heatmap-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  1,
                  9,
                  0,
                ],
              },
            },
            "country_other"
          );

          aMap.addLayer(
            {
              id: "taxis-point",
              type: "circle",
              source: "taxis",
              minzoom: 7,
              paint: {
                // Size circle radius by earthquake magnitude and zoom level
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  ["interpolate", ["linear"], ["get", "mag"], 1, 1, 6, 4],
                  16,
                  ["interpolate", ["linear"], ["get", "mag"], 1, 5, 6, 50],
                ],
                // Color circle by earthquake magnitude
                "circle-color": [
                  "interpolate",
                  ["linear"],
                  ["get", "mag"],
                  min,
                  "rgba(0,0,255,0.85)",
                  min + 0.2 * (max - min),
                  "rgba(30,0,230,0.85)",
                  min + 0.4 * (max - min),
                  "rgba(90,0,170,0.85)",
                  min + 0.6 * (max - min),
                  "rgba(150,0,105,0.85)",
                  min + 0.8 * (max - min),
                  "rgba(200,0,55,0.85)",
                  max,
                  "rgba(255,0,0,0.85)",
                ],
                "circle-stroke-color": "white",
                "circle-stroke-width": 0,
                // Transition from heatmap to circle layer by zoom level
                "circle-opacity": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  7,
                  0,
                  8,
                  1,
                ],
              },
            },
            "country_other"
          );
        });
      });
  },
};
</script>

<style scoped>
@import "~maplibre-gl/dist/maplibre-gl.css";
.map-wrap {
  position: relative;
  width: 100%;
  height: calc(
    100vh - 77px
  ); /* calculate height of the screen minus the heading */
}
.map {
  position: absolute;
  width: 100%;
  height: 100%;
}
.watermark {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 999;
}
#legend {
  position: absolute;
  bottom: 2ch;
  right: 0;
  width: max(120px, 33%);
}
</style>