export default defineAppConfig({
  pages: [
    'pages/home/index',
    'pages/mine/index',
    'pages/help/index',
    'pages/create-game/index',
    'pages/game-detail/index',
    'pages/game-result/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#6C5CE7',
    navigationBarTitleText: '剧本杀角色分配',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F8F9FF'
  },
  tabBar: {
    color: '#B2BEC3',
    selectedColor: '#6C5CE7',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页'
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的'
      },
      {
        pagePath: 'pages/help/index',
        text: '帮助'
      }
    ]
  }
})
