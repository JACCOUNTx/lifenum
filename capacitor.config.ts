import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lifenum.wuxing',
  appName: '命數五行穿衣法',
  webDir: 'dist',
  backgroundColor: '#f7f3ec',
  android: {
    backgroundColor: '#f7f3ec',
  },
  ios: {
    backgroundColor: '#f7f3ec',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'css',
      style: 'LIGHT',
    },
  },
};

export default config;
