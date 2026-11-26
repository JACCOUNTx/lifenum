import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Google 官方測試廣告單元；上正式環境時換成 AdMob 後台建立、屬於 pub-1948382835033139 的單元。
export const BANNER_AD_ID = 'ca-app-pub-3940256099942544/6300978111';
export const INTERSTITIAL_AD_ID = 'ca-app-pub-3940256099942544/1033173712';

// 與 styles.css 的 --ad-banner-height 對應，預留高度避免 Banner 遮住底部導航與內容。
const BANNER_HEIGHT_PX = 60;
const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;

const IS_ANDROID = Capacitor.getPlatform() === 'android';

let initPromise: Promise<boolean> | null = null;
let bannerShown = false;
let interstitialBusy = false;
let lastInterstitialAt = 0;

export const adsAvailable = IS_ANDROID;

function reserveBannerSpace(visible: boolean) {
  document.documentElement.style.setProperty(
    '--ad-banner-height',
    visible ? `${BANNER_HEIGHT_PX}px` : '0px',
  );
}

async function initAds(): Promise<boolean> {
  if (!IS_ANDROID) return false;
  if (!initPromise) {
    initPromise = AdMob.initialize({ initializeForTesting: true })
      .then(() => true)
      .catch(() => {
        initPromise = null;
        return false;
      });
  }
  return initPromise;
}

export async function showBanner(): Promise<void> {
  if (!IS_ANDROID || bannerShown) return;
  if (!(await initAds())) return;
  try {
    await AdMob.showBanner({
      adId: BANNER_AD_ID,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
      isTesting: true,
    });
    bannerShown = true;
    reserveBannerSpace(true);
  } catch {
    // 廣告載入失敗時保持原有版面，不影響 App。
  }
}

export async function maybeShowInterstitial(): Promise<void> {
  if (!IS_ANDROID || interstitialBusy) return;
  if (Date.now() - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return;
  if (!(await initAds())) return;

  interstitialBusy = true;
  lastInterstitialAt = Date.now();
  try {
    await AdMob.prepareInterstitial({ adId: INTERSTITIAL_AD_ID, isTesting: true });
    await AdMob.showInterstitial();
  } catch {
    // 未填滿或載入失敗時靜靜跳過，避免阻塞切換。
  } finally {
    interstitialBusy = false;
  }
}
