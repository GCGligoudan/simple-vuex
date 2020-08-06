let Vue;

function forEach(obj, callback) {
  Object.keys(obj).forEach((key) => {
    callback(key, obj[key]);
  })
}

class ModuleCollection {
  constructor(options){
    this.register([], options);
  }
  register(path, rootModule){
    let rawModule = {
      _raw: rootModule,
      _children: {},
      state: rootModule.state
    }

    if (!this.root) {
      this.root = rawModule;
    } else {
      let parentModule = path.slice(0, -1).reduce((root, current) => {
        return root._children[current];
      }, this.root);
      parentModule._children[path[path.length - 1]] = rawModule;
    }
    if (rootModule.modules){
      forEach(rootModule.modules, (moduleName, module) => {
        this.register(path.concat(moduleName), module);
      })
    }
  }
}

function installModule(store, rootState, path, rawModule){
  if (path.length > 0) { // 非 根module
    let parentState = path.slice(0, -1).reduce((root, current) => {
      return root[current];
    }, rootState);
    Vue.set(parentState, path[path.length - 1], rawModule.state);
  }

  let getters = rawModule._raw.getters;
  if (getters) {
    forEach(getters, (getterName, getter) => {
      Object.defineProperty(store.getters, getterName, {
        get: () => {
          return getter(rawModule.state);
        }
      });
    });
  }

  let mutations = rawModule._raw.mutations;
  if (mutations) { // {[], []}
    forEach(mutations, (mutationName, mutation) => {
      let arr = store.mutations[mutationName] || (store.mutations[mutationName] = []);
      arr.push((payload) => {
        mutation(rawModule.state, payload);
      })
    });
  }

  let actions = rawModule._raw.actions;
  if (actions) {
    forEach(actions, (actionName, action)=>{
      let arr = store.actions[actionName] || (store.actions[actionName] = []);
      arr.push((payload) => {
        action(store, payload);
      })
    })
  }

  // 递归子节点
  if (rawModule._children){
    forEach(rawModule._children, (moduleName, module) => {
      installModule(store, rootState, path.concat(moduleName), module);
    })
  }
}


class Store{
  constructor(options){
    this.vm = new Vue({
      data: {
        state: options.state,
      }
    });
    this.getters = {};
    this.mutations = {};
    this.actions = {};

    // 1.将传入的store数据进行格式化
    this.modules = new ModuleCollection(options);
    // console.log(this.modules); 

    // 2.将格式化后的数据分发到实例的state,getters,mutations,actions上
    // installModule函数的参数分别为store,rootState,path,rawModule
    installModule(this, this.state, [], this.modules.root);
  }
  get state(){
    return this.vm.state;
  }
  commit = (mutationName, payload) => {
    this.mutations[mutationName].forEach(fn => fn(payload));
  }
  dispatch = (actionName, payload) => {
    this.actions[actionName].forEach(fn => fn(payload));
  }
}
const install = (_Vue) => {
  Vue = _Vue;
  Vue.mixin({
    beforeCreate(){
      if (this.$options.store) { // 根实例
        this.$store = this.$options.store;
      } else { // 非根实例
        this.$store = this.$parent && this.$parent.$options.store;
      }
    }
  })
}
export default {
  install,
  Store
}