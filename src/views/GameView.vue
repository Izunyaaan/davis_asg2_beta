<template>
  <div class="map-wrap">
    <a href="https://www.maptiler.com" class="watermark"
      ><img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
    /></a>
    <div class="map" id="mapContainer"></div>
    <v-card class="scoreboard">
      <v-card-title> Current Score: </v-card-title>
      <v-card-text>
        {{ currentScore }}
      </v-card-text>
    </v-card>
  </div>
</template>

<script>
import { Map, Marker } from "maplibre-gl";
export default {
  data: () => ({
    currentScore: 0,
    timer: null,
    markers: [],
    currentPOIs: [],
    currentCoords: [],
    map: null,
  }),
  methods: {
    updateMarkers() {
      fetch("https://api.data.gov.sg/v1//transport/taxi-availability")
        .then((res) => res.json())
        .then((data) => {
          this.currentCoords = data.features[0].geometry.coordinates;

          if (this.markers) {
            this.markers.forEach((marker) => {
              marker.remove();
            });
            this.markers = [];
          }

          //Put taxis as red dot on map
          this.currentCoords.forEach((coord) => {
            // create a DOM element for the marker
            var el = document.createElement("div");
            el.style.display = "block";
            el.style.border = "none";
            el.style.borderRadius = "50%";
            el.style.cursor = "pointer";
            el.style.padding = "0";
            el.style.width = "8px";
            el.style.height = "8px";
            el.style.backgroundColor = "red";
            this.markers.push(new Marker(el).setLngLat(coord).addTo(this.map));
          });
        });
    },
    updatePOIs(e) {
      if (this.currentPOIs.length == 10) {
        alert("You have reached the max number of outposts");
      } else {
        new Marker().setLngLat(e.lngLat.toArray()).addTo(this.map);
        this.currentPOIs.push(e.lngLat.toArray());
        // Add Circle Outline

        const circleToPolygon = require("circle-to-polygon");

        const coordinates = e.lngLat.toArray(); //[lon, lat]
        const radius = 1600; // in meters
        const numberOfEdges = 32; //optional that defaults to 32

        let circle = circleToPolygon(coordinates, radius, numberOfEdges);
        // if (this.map.getSource("circleData")) {
        //   this.map.removeLayer("circle-fill");
        //   this.map.removeSource("circleData");
        // }
        this.map.addSource("circleData" + this.currentPOIs.length, {
          type: "geojson",
          data: circle,
        });
        this.map.addLayer({
          id: "circle-fill" + this.currentPOIs.length,
          type: "fill",
          source: "circleData" + this.currentPOIs.length,
          paint: {
            "fill-color": "blue",
            "fill-opacity": 0.2,
            "fill-outline-color": "black",
          },
        });
      }
    },
    calculateScores() {
      if (this.currentPOIs) {
        this.currentCoords.forEach((coord) => {
          const haversine = require("haversine");

          let start = { latitude: 0, longitude: 0 };
          let end = { latitude: 0, longitude: 0 };
          end.longitude = coord[0];
          end.latitude = coord[1];

          for (let i = 0; i < this.currentPOIs.length; i++) {
            start.longitude = this.currentPOIs[i][0];
            start.latitude = this.currentPOIs[i][1];
            const distance = haversine(start, end, { unit: "meter" });
            if (distance <= 1600) {
              this.currentScore += 1;
            }
          }
        });
      }
    },
  },
  mounted() {
    const apiKey = process.env.VUE_APP_API_KEY;
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
    const mapContainer = document.getElementById("mapContainer");
    this.map = new Map({
      container: mapContainer,
      style: `https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`,
      center: [initialState.lng, initialState.lat],
      zoom: initialState.zoom,
    });

    const map = this.map;

    //dummy marker
    // const testMarker = new Marker();

    map.on("load", () => {
      this.updateMarkers();

      this.timer = setInterval(() => {
        this.updateMarkers();
        this.calculateScores();
      }, 30000);
    });
    map.on("click", this.updatePOIs);
  },
  unmounted() {
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
.scoreboard {
  position: absolute;
  top: 3ch;
  right: 3ch;
}
</style>