<template>
  <div id="app">
    {{ $store.state.age }}
    <br />
    {{$store.getters.myAge}}
    <br />
    {{$store.state.a.age}}
    <br />
    {{$store.state.b.age}}
    <br />
    {{$store.state.b.c.age}}
    <button @click="changeAge()">点击</button>
    <button @click="syncChange()">异步改变</button>
  </div>
</template>

<script>

export default {
  name: 'App',
  methods: {
    changeAge(){
      this.$store.commit('syncChange', 10);
    },
    syncChange(){
      this.$store.dispatch('syncChange', 5);
    }
  }
}
</script>

<style>

</style>
