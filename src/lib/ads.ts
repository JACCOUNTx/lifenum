import { AdMob, BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

type NativePlatform = 'android' | 'ios';

interface AdUnits {
  banner: string;
  interstitial: string;
  rewarded: string;
}

// 正式環境廣告單元（AdMob 帳戶 pub-1948382835033139）。
export const AD_UNITS: Record<NativePlatform, AdUnits> = {
  android: {
    banner: 'ca-app-pub-1948382835033139/4616431534',
    interstitial: 'ca-app-pub-1948382835033139/5402899594',
    rewarded: 'ca-app-pub-1948382835033139/1203479336',
  },
  ios: {
    banner: 'ca-app-pub-1948382835033139/8631698160',
    interstitial: 'ca-app-pub-1948382835033139/2066289818',
    rewarded: 'ca-app-pub-1948382835033139/7127044808',
  },
};

// 與 styles.css 的 --ad-banner-height 對應，預留高度避免 Banner 遮住底部導航與內容。
const BANNER_HEIGHT_PX = 60;
const INTERSTITIAL_COOLDOWN_MS = 3 * 60 * 1000;

const platform = Capacitor.getPlatform();
const nativePlatform: NativePlatform | null =
  platform === 'android' || platform === 'ios' ? platform : null;

let initPromise: Promise<boolean> | null = null;
let bannerShown = false;
let interstitialBusy = false;
let lastInterstitialAt = 0;
let rewardedBusy = false;

export const adsAvailable = nativePlatform !== null;

function reserveBannerSpace(visible: boolean) {
  document.documentElement.style.setProperty(
    '--ad-banner-height',
    visible ? `${BANNER_HEIGHT_PX}px` : '0px',
  );
}

async function initAds(): Promise<boolean> {
  if (!nativePlatform) return false;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (nativePlatform === 'ios') {
          // ATT：先取得追蹤授權再初始化 SDK；用戶拒絕亦會繼續顯示非個人化廣告。
          await AdMob.requestTrackingAuthorization().catch(() => undefined);
        }
        await AdMob.initialize();
        return true;
      } catch {
        initPromise = null;
        return false;
      }
    })();
  }
  return initPromise;
}

export async function showBanner(): Promise<void> {
  if (!nativePlatform || bannerShown) return;
  if (!(await initAds())) return;
  try {
    await AdMob.showBanner({
      adId: AD_UNITS[nativePlatform].banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      margin: 0,
    });
    bannerShown = true;
    reserveBannerSpace(true);
  } catch {
    // 廣告載入失敗時保持原有版面，不影響 App。
  }
}

export async function maybeShowInterstitial(): Promise<void> {
  if (!nativePlatform || interstitialBusy) return;
  if (Date.now() - lastInterstitialAt < INTERSTITIAL_COOLDOWN_MS) return;
  if (!(await initAds())) return;

  interstitialBusy = true;
  lastInterstitialAt = Date.now();
  try {
    await AdMob.prepareInterstitial({ adId: AD_UNITS[nativePlatform].interstitial });
    await AdMob.showInterstitial();
  } catch {
    // 未填滿或載入失敗時靜靜跳過，避免阻塞流程。
  } finally {
    interstitialBusy = false;
  }
}

/** 顯示獎勵廣告；完整觀看並取得獎勵時回傳 true。 */
export async function showRewardedAd(): Promise<boolean> {
  if (!nativePlatform || rewardedBusy) return false;
  if (!(await initAds())) return false;

  rewardedBusy = true;
  try {
    await AdMob.prepareRewardVideoAd({ adId: AD_UNITS[nativePlatform].rewarded });
    await AdMob.showRewardVideoAd();
    return true;
  } catch {
    return false;
  } finally {
    rewardedBusy = false;
  }
}
