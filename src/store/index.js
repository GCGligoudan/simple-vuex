import Vue from 'vue'
// import Vuex from 'vuex'
import Vuex from '../vuex';

Vue.use(Vuex);

const persists = (store) => {
  store.subscribe((mutation, state) => {
    console.log(mutation, state);
    // localStorage.setItem('vuex-state',)
  });
}

const store = new Vuex.Store({
  plugins: [
    persists, 
  ],
  state: {
    age: 10,
  },
  getters: {
    myAge(state){
      return state.age + 20;
    }
  },
  mutations: {
    syncChange(state, payload){
      state.age += payload;
    }
  },
  actions: {
    syncChange({commit}, payload){
      setTimeout(() => {
        commit('syncChange', payload);
      }, 1000);
    }
  },
  modules: {
    a: {
      state: {
        age: 'a100',
      },
      mutations: {
        syncChange() {
          console.log('a-sync-change');
        }
      }
    },
    b: {
      state: {
        age: 'b100',
      },
      mutations: {
        syncChange(){
          console.log('b-sync-change');
        }
      },
      modules: {
        c: {
          state: {
            age: 'c100',
          },
          mutations: {
            syncChange(){
              console.log('c-sync-change')
            }
          }
        }
      }
    }
  }
})

// store.registerModule('d', {
//   state: {
//     age: 'd100',
//   }
// })

export default store;
