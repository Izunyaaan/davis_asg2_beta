<template>
  <div class="map-wrap">
    <a href="https://www.maptiler.com" class="watermark"
      ><img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
    /></a>
    <div class="loading" v-show="isLoading">
      <p>
        Loading
        <v-progress-circular indeterminate color="black"></v-progress-circular>
      </p>
    </div>
    <div class="map" id="mapContainer"></div>
    <img :src="url" alt="heatmap keys" id="legend" />
    <div class="progress">
      <v-progress-linear
        height="10"
        v-model="barProgress"
        color="light-blue"
        striped
      ></v-progress-linear>
    </div>
  </div>
</template>

<script>
import { Map, NavigationControl } from "maplibre-gl";
export default {
  data: () => ({
    map: null,
    url: require("../assets/heatmaplegend.png"),
    isLoading: true,
    currentFrame: 1,
    barProgress: "0",
    timer: null,
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

    //get times of every 30seconds for the past 5 minutes
    const createQueryURL = (dateObj) => {
      const hour = dateObj.getUTCHours().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      const min = dateObj.getUTCMinutes().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      const sec = dateObj.getUTCSeconds().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      const year = dateObj.getUTCFullYear();
      const month = (dateObj.getUTCMonth() + 1).toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      const day = dateObj.getUTCDate().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });

      const timeString = `${year}-${month}-${day}T${hour}:${min}:${sec}`;
      // console.log(timeString);
      return (
        "https://api.data.gov.sg/v1//transport/taxi-availability?date_time=" +
        timeString
      );
    };

    const generateSourceData = (data) => {
      //Parse coordinates to 2 decimal places
      let reducedCoords = [];
      data.forEach((coord) => {
        reducedCoords.push([coord[0].toFixed(2), coord[1].toFixed(2)]);
      });
      //Sort array to avoid callback hell in the subsequent operations
      var sortedReducedArray = reducedCoords.sort(function (a, b) {
        if (a[0] == b[0]) {
          return a[1] - b[1];
        }
        return b[0] - a[0];
      });

      //Generate coordinate-frequency data pair in the form of 2 arrays. Could use array of objects for legibility but decided not to.

      let uniquePositions = [];
      let uniqueCount = [];

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

      //Calculate min & max frequencies

      const min = Math.min.apply(Math, uniqueCount);
      const max = Math.max.apply(Math, uniqueCount);

      //generate the GeoJSON
      let geoJSON = {
        type: "FeatureCollection",
        features: [],
      };

      uniquePositions.forEach((coord, index) => {
        geoJSON.features.push({
          type: "Feature",
          properties: { mag: uniqueCount[index] },
          geometry: { type: "Point", coordinates: coord },
        });
      });

      return [geoJSON, min, max];
    };

    /*promises for data over the past 5 minutes
    t0 = 5 minutes ago
    t1 = 4.5 minutes ago
    t2 = 4 minutes ago
    t3 = 3.5 minutes ago
    t4 = 3 minutes ago
    t5 = 2.5 minutes ago
    t6 = 2 minutes ago
    t7 = 1.5 minutes ago
    t8 = 1 minutes ago
    t9 = 0.5 minutes ago
    t10 = current
    */
    let promises = [];
    for (let i = 0; i < 11; i++) {
      const dateObj = new Date(Date.now() + 60 * 60 * 1000 * 8 - i * 30000); //Offset from UTC by +8 to fit the API requirements
      promises.unshift(fetch(createQueryURL(dateObj)));
    }
    //console.log(promises);

    Promise.all(promises)
      .then((responses) => Promise.all(responses.map((r) => r.json())))
      .then((dataArr) => {
        let sourceData = [];

        dataArr.forEach((data) => {
          sourceData.push(
            generateSourceData(data.features[0].geometry.coordinates)
          );
        });

        const map = this.map;

        map.on("load", () => {
          //add all sources and layers
          sourceData.forEach((source, index) => {
            // const dateObj = new Date(
            //   Date.now() + 60 * 60 * 1000 * 8 - index * 30000
            // );
            // const url = createQueryURL(dateObj);
            const heatData = source[0];
            const min = source[1];
            const max = source[2];

            // Add a geojson point source.
            // Heatmap layers also work with a vector tile source.
            map.addSource("taxis" + index, {
              type: "geojson",
              data: heatData,
            });

            map.addLayer(
              {
                id: "taxiheat" + index,
                type: "heatmap",
                source: "taxis" + index,
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
                    19,
                    8,
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
            map.addLayer(
              {
                id: "taxis-point" + index,
                type: "circle",
                source: "taxis" + index,
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
                    "rgba(0,0,255,0)",
                    min + 0.2 * (max - min),
                    "rgb(30,0,230)",
                    min + 0.4 * (max - min),
                    "rgb(90,0,170)",
                    min + 0.6 * (max - min),
                    "rgb(150,0,105)",
                    min + 0.8 * (max - min),
                    "rgb(200,0,55)",
                    max,
                    "rgb(255,0,0)",
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

          //remove loading screen
          this.isLoading = false;

          //hide and show correct layers
          this.timer = setInterval(() => {
            if (this.currentFrame == 11) {
              this.barProgress = "100";
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point10",
                "visibility",
                "visible"
              );
              this.currentFrame = 1;
            } else if (this.currentFrame == 10) {
              this.barProgress = "90";
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point9",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
              this.currentFrame = 11;
            } else if (this.currentFrame == 9) {
              this.barProgress = "80";
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point8",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
              this.currentFrame = 10;
            } else if (this.currentFrame == 8) {
              this.barProgress = "70";
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point7",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
              this.currentFrame = 9;
            } else if (this.currentFrame == 7) {
              this.barProgress = "60";
              this.currentFrame = 8;
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point6",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
            } else if (this.currentFrame == 6) {
              this.barProgress = "50";
              this.currentFrame = 7;
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point5",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
            } else if (this.currentFrame == 5) {
              this.currentFrame = 6;
              this.barProgress = "40";
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point4",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
            } else if (this.currentFrame == 4) {
              this.currentFrame = 5;
              this.barProgress = "30";
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point3",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
            } else if (this.currentFrame == 3) {
              this.currentFrame = 4;
              this.barProgress = "20";
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point2",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
            } else if (this.currentFrame == 2) {
              this.currentFrame = 3;
              this.barProgress = "10";
              this.map.setLayoutProperty("taxis-point0", "visibility", "none");
              this.map.setLayoutProperty(
                "taxis-point1",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
            } else {
              this.barProgress = "3";
              this.currentFrame = 2;
              this.map.setLayoutProperty(
                "taxis-point0",
                "visibility",
                "visible"
              );
              this.map.setLayoutProperty("taxis-point1", "visibility", "none");
              this.map.setLayoutProperty("taxis-point2", "visibility", "none");
              this.map.setLayoutProperty("taxis-point3", "visibility", "none");
              this.map.setLayoutProperty("taxis-point4", "visibility", "none");
              this.map.setLayoutProperty("taxis-point5", "visibility", "none");
              this.map.setLayoutProperty("taxis-point6", "visibility", "none");
              this.map.setLayoutProperty("taxis-point7", "visibility", "none");
              this.map.setLayoutProperty("taxis-point8", "visibility", "none");
              this.map.setLayoutProperty("taxis-point9", "visibility", "none");
              this.map.setLayoutProperty("taxis-point10", "visibility", "none");
            }
          }, 1000);
        });
      });
  },
  unmounted() {
    //dispose stuff. Doesn't seem to clean itself
    clearInterval(this.timer);
    this.map.remove();
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
.map,
.loading {
  position: absolute;
  width: 100%;
  height: 100%;
}
.loading {
  z-index: 999;
  display: grid;
  background-color: white;
  place-items: center;
  font-weight: bolder;
  font-size: 3rem;
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
.progress {
  position: absolute;
  top: 0;
  width: 100%;
  z-index: 998;
}
</style>