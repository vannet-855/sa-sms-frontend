
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/login",
    "route": "/"
  },
  {
    "renderMode": 2,
    "route": "/login"
  },
  {
    "renderMode": 2,
    "route": "/dashboard"
  },
  {
    "renderMode": 2,
    "route": "/teacher-dashboard"
  },
  {
    "renderMode": 2,
    "route": "/student-dashboard"
  },
  {
    "renderMode": 2,
    "route": "/parent-dashboard"
  },
  {
    "renderMode": 2,
    "redirectTo": "/login",
    "route": "/**"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 433, hash: 'bc751407945e61f0bfba8e331ab95d97aa998c2563662668a4266d74b393bcd3', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 946, hash: '853d45602e01bba1cb9ad3deb87d2e34b3937033ece88778fa5cdcfcf41b2feb', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'teacher-dashboard/index.html': {size: 240, hash: 'db096474d521163c4f5fb7d700305222bcea1012b38583442ad232da75e59192', text: () => import('./assets-chunks/teacher-dashboard_index_html.mjs').then(m => m.default)},
    'dashboard/index.html': {size: 240, hash: 'db096474d521163c4f5fb7d700305222bcea1012b38583442ad232da75e59192', text: () => import('./assets-chunks/dashboard_index_html.mjs').then(m => m.default)},
    'student-dashboard/index.html': {size: 240, hash: 'db096474d521163c4f5fb7d700305222bcea1012b38583442ad232da75e59192', text: () => import('./assets-chunks/student-dashboard_index_html.mjs').then(m => m.default)},
    'login/index.html': {size: 12161, hash: '23d990e5160c269df35467a23c7777e408d5ffb977f5f87d1c6566c4d8308ba5', text: () => import('./assets-chunks/login_index_html.mjs').then(m => m.default)},
    'parent-dashboard/index.html': {size: 240, hash: 'db096474d521163c4f5fb7d700305222bcea1012b38583442ad232da75e59192', text: () => import('./assets-chunks/parent-dashboard_index_html.mjs').then(m => m.default)},
    'styles-5INURTSO.css': {size: 0, hash: 'menYUTfbRu8', text: () => import('./assets-chunks/styles-5INURTSO_css.mjs').then(m => m.default)}
  },
};
