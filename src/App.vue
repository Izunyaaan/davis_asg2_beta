<template>
  <v-app id="inspire">
    <v-navigation-drawer v-model="drawer" app>
      <!--  -->
      <v-list>
        <v-list-item
          v-for="(link, index) in links"
          :key="index"
          :to="link.link"
        >
          {{ link.name }}
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar app>
      <v-app-bar-nav-icon @click="drawer = !drawer"></v-app-bar-nav-icon>

      <v-toolbar-title>{{ this.$route.name }}</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <!--  -->
      <router-view />
    </v-main>
  </v-app>
</template>

<script>
export default {
  data: () => ({
    drawer: true,
    links: [
      { icon: "", name: "Default Map", link: "/" },
      { icon: "", name: "Speed Tracker", link: "/speed" },
      { icon: "", name: "Mini Game", link: "/game" },
      { icon: "", name: "Heatmap", link: "/heatmap" },
      { icon: "", name: "Bubble Plot", link: "/bubble" },
    ],
  }),
};
</script>
