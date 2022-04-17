<template>
  <div>
    <map-view></map-view>
  </div>
</template>

<script>
import MapView from "../components/Map.vue";
export default {
  components: { MapView },
  data: () => ({
    timer: null,
  }),
  mounted() {
    alert("Stay on the speed limit and look out for your safety.");
    this.timer = setInterval(() => {
      alert("Stay on the speed limit and look out for your safety.");
    }, 100);
  },
  unmounted() {
    clearInterval(this.timer);
  },
};
</script>

<style>
</style>