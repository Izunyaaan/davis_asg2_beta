<template>
  <div class="map-wrap">
    <a href="https://www.maptiler.com" class="watermark"
      ><img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
    /></a>
    <div class="map" ref="mapContainer"></div>
    <div id="ainunaBox" v-show="showAinunaBox" ref="geoLocateControls">
      <v-btn block outlined color="#FCE4EC" @click="clearMarkers">
        taxi pick up area
      </v-btn>
      <v-btn block outlined color="red" @click="centerOnUser">
        taxi near me
      </v-btn>
    </div>
  </div>
</template>

<script>
import { Map, NavigationControl, Marker, Popup } from "maplibre-gl";
import { shallowRef, onMounted, onUnmounted, markRaw } from "vue";
export default {
  name: "MapW",
  data: () => ({
    showAinunaBox: false,
  }),
  setup() {
    const mapContainer = shallowRef(null);
    const map = shallowRef(null);
    let refreshInterval;
    let markersArr = [];
    const updateMarkers = () => {
      //fetch data from API then use data to update markersArr
      fetch("https://api.data.gov.sg/v1//transport/taxi-availability")
        .then((res) => res.json())
        .then((data) => {
          const currentTaxiCoordinates = data.features[0].geometry.coordinates;
          currentTaxiCoordinates.forEach((coords, index) => {
            //create marker if it doesn't exist yet.
            if (!markersArr[index]) {
              markersArr[index] = new Marker({ color: "#FF0000" })
                .setPopup(new Popup().setText(`Taxi #${index}`))
                .setLngLat(coords)
                .addTo(map.value);
            }
            //updates existing marker's coordinates
            markersArr[index].setLngLat(coords);
          });
        });
    };
    onMounted(() => {
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
      map.value = markRaw(
        new Map({
          container: mapContainer.value,
          style: `https://api.maptiler.com/maps/streets/style.json?key=${apiKey}`,
          center: [initialState.lng, initialState.lat],
          zoom: initialState.zoom,
        })
      );
      map.value.addControl(new NavigationControl(), "top-right");

      //initialize markers on map
      updateMarkers();

      //refresh markers every 30 seconds.
      refreshInterval = setInterval(() => {
        updateMarkers();
      }, 30000);
    });
    onUnmounted(() => {
      clearInterval(refreshInterval);
      map.value?.remove();
    });
    return {
      map,
      mapContainer,
      refreshInterval,
      markersArr,
    };
  },
  methods: {
    clearMarkers() {
      if (!this.markersArr) return;
      clearInterval(this.refreshInterval);
      this.markersArr.forEach((marker) => {
        marker.remove();
      });
    },
    centerOnUser() {
      const userMarker = new Marker({ color: "#0000FF" });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log(position.coords.latitude);
          console.log(position.coords.longitude);
          userMarker
            .setLngLat([position.coords.longitude, position.coords.latitude])
            .setPopup(new Popup().setText("You Are Here"))
            .addTo(this.map)
            .togglePopup();

          this.map.flyTo({
            center: [position.coords.longitude, position.coords.latitude],
          });
          this.map.setMinZoom(15);
          // Add Circle Outline

          const circleToPolygon = require("circle-to-polygon");

          const coordinates = [
            position.coords.longitude,
            position.coords.latitude,
          ]; //[lon, lat]
          const radius = 600; // in meters
          const numberOfEdges = 32; //optional that defaults to 32

          let circle = circleToPolygon(coordinates, radius, numberOfEdges);
          if (this.map.getSource("circleData")) {
            this.map.removeLayer("circle-fill");
            this.map.removeSource("circleData");
          }
          this.map.addSource("circleData", {
            type: "geojson",
            data: circle,
          });
          this.map.addLayer({
            id: "circle-fill",
            type: "fill",
            source: "circleData",
            paint: {
              "fill-color": "blue",
              "fill-opacity": 0.2,
              "fill-outline-color": "black",
            },
          });
        },
        (error) => {
          console.log(error.message);
        }
      );
    },
    // generateCircle(centerLat, centerLng, radius) {
    //   let data = [];
    //   let r = radius * 0.000025;
    //   let x =
    //     Math.log(Math.tan(((90 + centerLat) * Math.pi) / 360)) /
    //     (Math.pi / 180);
    //   let y = centerLng;
    //   for (let i = 1; i <= 360; i++) {
    //     let angle = (i * Math.pi) / 180;
    //     let ptx = x + r * Math.cos(angle);
    //     let pty = y + r * Math.sin(angle);
    //     ptx =
    //       (180 / Math.pi) *
    //       (2 * Math.atan(Math.exp((ptx * Math.pi) / 180)) - Math.pi / 2);
    //     data[i] = [pty, ptx];
    //   }
    //   return data;
    // },
  },
  mounted() {
    this.showAinunaBox = true;
  },
  unmounted() {
    this.showAinunaBox = false;
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
#ainunaBox {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 999;
  width: calc(20ch + 1rem);
  padding: 0.5rem;
  background-color: white;
  outline: 1px dashed black;
}
</style>