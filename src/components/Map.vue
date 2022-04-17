<template>
  <div class="map-wrap">
    <a href="https://www.maptiler.com" class="watermark"
      ><img
        src="https://api.maptiler.com/resources/logo.svg"
        alt="MapTiler logo"
    /></a>
    <div class="map" ref="mapContainer"></div>
  </div>
</template>

<script>
import { Map, NavigationControl, Marker, Popup } from "maplibre-gl";
import { shallowRef, onMounted, onUnmounted, markRaw } from "vue";
export default {
  name: "MapW",
  setup() {
    const mapContainer = shallowRef(null);
    const map = shallowRef(null);
    onMounted(() => {
      const apiKey = process.env.VUE_APP_API_KEY;
      if (apiKey == null) {
        throw new Error(
          "You need to configure env VUE_APP_API_KEY first, see README"
        );
      }
      const initialState = {
        lng: 103.8023514142483,
        lat: 1.3695991684760638,
        zoom: 11,
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
      const marker = new Marker({ color: "#FF0000" })
        .setLngLat(aTest)
        .setPopup(new Popup().setHTML("<h1>Fake Taxi #1</h1>"))
        .addTo(map.value);
      const marker2 = new Marker({ color: "#0000FF" })
        .setLngLat([initialState.lng, initialState.lat])
        .setPopup(new Popup().setHTML("<h1>Real Taxi #1</h1>"))
        .addTo(map.value);
      const marker3 = new Marker({ color: "#0000FF" })
        .setLngLat([initialState.lng, initialState.lat])
        .setPopup(new Popup().setHTML("<h1>Real Taxi #2</h1>"))
        .addTo(map.value);
      const marker4 = new Marker({ color: "#0000FF" })
        .setLngLat([initialState.lng, initialState.lat])
        .setPopup(new Popup().setHTML("<h1>Real Taxi #3</h1>"))
        .addTo(map.value);
      const marker5 = new Marker({ color: "#0000FF" })
        .setLngLat([initialState.lng, initialState.lat])
        .setPopup(new Popup().setHTML("<h1>Real Taxi #4</h1>"))
        .addTo(map.value);
      const marker9 = new Marker({ color: "#0000FF" })
        .setLngLat([initialState.lng, initialState.lat])
        .setPopup(new Popup().setHTML("<h1>Real Taxi #4</h1>"))
        .addTo(map.value);
      const marker6 = new Marker({ color: "#0000FF" })
        .setLngLat([initialState.lng, initialState.lat])
        .setPopup(new Popup().setHTML("<h1>Real Taxi #4</h1>"))
        .addTo(map.value);
      const marker7 = new Marker({ color: "#0000FF" })
        .setLngLat([initialState.lng, initialState.lat])
        .setPopup(new Popup().setHTML("<h1>Real Taxi #4</h1>"))
        .addTo(map.value);
      const marker8 = new Marker({ color: "#0000FF" })
        .setLngLat([initialState.lng, initialState.lat])
        .setPopup(new Popup().setHTML("<h1>Real Taxi #4</h1>"))
        .addTo(map.value);

      fetch("https://api.data.gov.sg/v1//transport/taxi-availability")
        .then((res) => res.json())
        .then((data) => {
          marker2.setLngLat([
            data.features[0].geometry.coordinates[0][0],
            data.features[0].geometry.coordinates[0][1],
          ]);
          marker3.setLngLat([
            data.features[0].geometry.coordinates[1][0],
            data.features[0].geometry.coordinates[1][1],
          ]);
          marker4.setLngLat([
            data.features[0].geometry.coordinates[2][0],
            data.features[0].geometry.coordinates[2][1],
          ]);
          marker5.setLngLat([
            data.features[0].geometry.coordinates[1200][0],
            data.features[0].geometry.coordinates[1200][1],
          ]);
          marker6.setLngLat([
            data.features[0].geometry.coordinates[1201][0],
            data.features[0].geometry.coordinates[1201][1],
          ]);
          marker7.setLngLat([
            data.features[0].geometry.coordinates[200][0],
            data.features[0].geometry.coordinates[200][1],
          ]);
          marker8.setLngLat([
            data.features[0].geometry.coordinates[500][0],
            data.features[0].geometry.coordinates[500][1],
          ]);
          marker9.setLngLat([
            data.features[0].geometry.coordinates[900][0],
            data.features[0].geometry.coordinates[900][1],
          ]);
        });
      setInterval(() => {
        fetch("https://api.data.gov.sg/v1//transport/taxi-availability")
          .then((res) => res.json())
          .then((data) => {
            console.log("===========");
            console.log(data.features[0].geometry.coordinates[0]);
            marker2.setLngLat([
              data.features[0].geometry.coordinates[0][0],
              data.features[0].geometry.coordinates[0][1],
            ]);
            marker3.setLngLat([
              data.features[0].geometry.coordinates[1][0],
              data.features[0].geometry.coordinates[1][1],
            ]);
            marker4.setLngLat([
              data.features[0].geometry.coordinates[2][0],
              data.features[0].geometry.coordinates[2][1],
            ]);
            marker5.setLngLat([
              data.features[0].geometry.coordinates[1200][0],
              data.features[0].geometry.coordinates[1200][1],
            ]);
            marker6.setLngLat([
              data.features[0].geometry.coordinates[1201][0],
              data.features[0].geometry.coordinates[1201][1],
            ]);
            marker7.setLngLat([
              data.features[0].geometry.coordinates[200][0],
              data.features[0].geometry.coordinates[200][1],
            ]);
            marker8.setLngLat([
              data.features[0].geometry.coordinates[500][0],
              data.features[0].geometry.coordinates[500][1],
            ]);
            marker9.setLngLat([
              data.features[0].geometry.coordinates[900][0],
              data.features[0].geometry.coordinates[900][1],
            ]);
          });
        aTest = test();
        marker.setLngLat(aTest);
      }, 30000);
    });
    onUnmounted(() => {
      map.value?.remove();
    });
    return {
      map,
      mapContainer,
    };
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