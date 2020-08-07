let Vue;
const forEach = (obj, callback) => {
  Object.keys(obj).forEach((key) => {
    callback(key, obj[key]);
  });
}

class ModuleCollection{
  constructor(options){
    // 使用深度遍历将options进行格式化
    this.register([], options);
  }
  register(path, rootModule){
    // 需要构造的module结构
    let rawModule = {
      _raw: rootModule,
      _children: {},
      state: rootModule.state
    }
    if (!this.root) { // 给当前实例添加根module
      this.root = rawModule;
    } else { // 非 根module 要添加到父module的_children中
      // _children是对象 以添加c模块为例，当前path为[b, c]

      // 这个reduce从根节点开始寻找，通过path路径找到当前节点的父节点
      let parentModule = path.slice(0, -1).reduce((root, current)=>{
        return root._children[current];
      }, this.root);

      parentModule._children[path[path.length - 1]] = rawModule;

    }
    if (rootModule.modules){ //如果当前module内还有module
      forEach(rootModule.modules, (moduleName, module) => {
        // 将a模块进行注册：[a]，a模块
        // 将b模块进行注册：[b]，b模块
        // 将c模块进行注册：[b,c]，c模块
        this.register(path.concat(moduleName), module); // 用模块名称的路径来记录嵌套层级
      })
    }
  }
}

function installModule(store, rootState, path, rawModule) {
  // state
  if (path.length > 0) { // 非根module
    let parentState = path.slice(0, -1).reduce((root, current)=>{
      return root[current];
    }, rootState);
    Vue.set(parentState, path[path.length - 1], rawModule.state);
  }

  // getters
  let getters = rawModule._raw.getters;
  if (getters) {
    forEach(getters, (getterName, value) => {
      Object.defineProperty(store.getters, getterName, {
        get: () => {
          return value(rawModule.state)
        }
      });
    });
  }

  // mutations
  let mutations = rawModule._raw.mutations;
  if (mutations) {
    forEach(mutations, (mutationName, mutation) => {
      // store.mutations 是对象 store.mutations[mutationName] 是数组
      // { [], [], [] }
      let arr = store.mutations[mutationName] || (store.mutations[mutationName] = []);
      arr.push((payload) => {
        mutation(rawModule.state, payload);
      });
    })
  }

  // actions
  let actions = rawModule._raw.actions;
  if (actions) {
    forEach(actions, (actionName, action) => {
      let arr = store.actions[actionName] || (store.actions[actionName] = []);
      arr.push((payload) => {
        action(store, payload);
      })
    })
  }

  if (rawModule._children) {
    forEach(rawModule._children, (moduleName, module) => {
      installModule(store, rootState, path.concat(moduleName), module);
    })
  }
}

class Store {
  constructor(options){
    this.vm = new Vue({
      data:{
        state: options.state
      }
    });

    this.getters = {};
    this.mutations = {};
    this.actions = {};

    // 1.store中的module会有嵌套结构 使用ModuleCollection类进行格式化
    this.modules = new ModuleCollection(options);

    // 2.将格式化后的modules分发到当前store的state, getters, mutations, actions中
    // 参数分别为store, rootState, path, rawModule
    installModule(this, this.state, [], this.modules.root);

    // // getters
    // let getters = options.getters;
    // // 给store的实例上添加getters属性

    // // 将state中的值以数据绑定的方式添加到getters属性上
    // forEach(getters, (getterName, value) => {
    //   Object.defineProperty(this.getters, getterName, {
    //     get: () => {
    //       return value(this.state);
    //     }
    //   });
    // });

    // // mutations
    // let mutations = options.mutations;

    // // 采用发布订阅模式
    // // 先订阅mutations中定义的操作
    // forEach(mutations, (mutationName, value) => {
    //   // value是mutations中的执行函数
    //   // 这里不是将value函数直接返回赋值，而是返回一个新函数
    //   // 这种方式叫做切片编程
    //   this.mutations[mutationName] = (payload) => {
    //     // do other things...
    //     value(this.state, payload)
    //   }
    // });

    // // actions
    // let actions = options.actions;

    // forEach(actions, (actionName, value) => {
    //   this.actions[actionName] = (payload) => {
    //     value(this, payload);
    //   }
    // })
  }
  get state(){ // store的state属性
    return this.vm.state
  }
  // 给store实例添加commit方法
  commit = (mutationName, payload) => { // es7的语法，使commit中的this指向当前store的实例
    // 执行发布订阅中的订阅
    this.mutations[mutationName].forEach(fn => fn(payload));
  }
  dispatch = (actionName, payload) => {
    this.actions[actionName].forEach(fn => fn(payload));
  }
  // registerModule(moduleName, module){
  //   if (!Array.isArray(moduleName)){
  //     moduleName = [moduleName];
  //   }
  //   console.log(moduleName);
  //   this.modules.register(moduleName, module);
  //   console.log(this.modules);
  //   installModule(this, this.state, [], this.modules.root);
  // }
}
const install = (_Vue) => {
  Vue = _Vue;
  // 给调用的Vue实例混入一个beforeCreate生命周期
  Vue.mixin({
    beforeCreate() {
      if(this.$options.store) { // 根组件
        this.$store = this.$options.store;
      } else { // 非 根组件
        this.$store = this.$parent && this.$parent.$options.store;
      }
    },
  })
}
export default {
  install,
  Store
}