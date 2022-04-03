<template>
  <MapW />
</template>

<script>
import { defineComponent } from "vue";

// Components
import MapW from "../components/Map.vue";

export default defineComponent({
  name: "HomeView",

  components: {
    MapW,
  },
});
</script>
