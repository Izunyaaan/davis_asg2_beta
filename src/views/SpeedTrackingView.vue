<template>
  <div class="map-wrap">
    <a href="https://www.maptiler.com" class="watermark"
      ><img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
    /></a>
    <div class="map" id="mapContainer"></div>
  </div>
</template>

<script>
import { Map, NavigationControl, Marker, Popup } from "maplibre-gl";
export default {
  data: () => ({
    timer: null,
    map: null,
    markers: [],
  }),
  methods: {
    getSpeeds() {
      const haversine = require("haversine");
      const d = new Date(Date.now() - 30000 + 8 * 60 * 60 * 1000);
      const hour = d.getUTCHours().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      const min = d.getUTCMinutes().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      const sec = d.getUTCSeconds().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      const year = d.getUTCFullYear();
      const month = (d.getUTCMonth() + 1).toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });
      const day = d.getUTCDate().toLocaleString("en-US", {
        minimumIntegerDigits: 2,
        useGrouping: false,
      });

      const oldTime = `${year}-${month}-${day}T${hour}:${min}:${sec}`;
      // console.log(oldTime);

      const currentPositions = fetch(
        "https://api.data.gov.sg/v1//transport/taxi-availability"
      );
      const oldPositions = fetch(
        "https://api.data.gov.sg/v1//transport/taxi-availability?date_time=" +
          oldTime
      );

      Promise.all([oldPositions, currentPositions])
        .then((responses) => Promise.all(responses.map((r) => r.json())))
        .then((dataArr) => {
          const oldCoords = dataArr[0].features[0].geometry.coordinates;
          const currentCoords = dataArr[1].features[0].geometry.coordinates;
          // console.log(oldCoords, currentCoords);

          const canGetSpeed = oldCoords.length === currentCoords.length;

          if (this.markers) {
            this.markers.forEach((marker) => {
              if (marker) marker.remove();
            });
            this.markers = [];
          }

          const markers = this.markers;

          if (canGetSpeed) {
            // console.log("calculate speeds");
            let start = { latitude: 0, longitude: 0 };
            let end = { latitude: 0, longitude: 0 };
            currentCoords.forEach((coord, index) => {
              start.latitude = oldCoords[index][1];
              start.longitude = oldCoords[index][0];
              end.latitude = coord[1];
              end.longitude = coord[0];

              const distance = haversine(start, end, { unit: "meter" });

              const speed = distance * 0.12; // speed = distance (meters)/30 (seconds) * 3.6 (convert m/s to km/h)
              const markerColour = speed <= 80 ? "green" : "red";

              markers[index] = new Marker({ color: markerColour })
                .setLngLat(coord)
                .setPopup(
                  new Popup().setText("Current Speed: " + speed + " km/h")
                )
                .addTo(this.map);
            });
          } else {
            currentCoords.forEach((coord, index) => {
              markers[index] = new Marker({ color: "red" })
                .setPopup(new Popup().setText("Unable to calculate speed"))
                .setLngLat(coord)
                .addTo(this.map);
            });
          }
          // console.log("Done calculating");
        });
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
    map.addControl(new NavigationControl(), "top-right");

    // let testMarker = new Marker({ color: "blue" })
    //   .setLngLat([initialState.lng, initialState.lat])
    //   .setPopup(new Popup().setText("Test"));
    map.on("load", () => {
      // testMarker.addTo(map);
      this.getSpeeds();
      this.timer = setInterval(() => {
        this.getSpeeds();
      }, 30000);
    });
  },
  unmounted() {
    clearInterval(this.timer);
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
</style>