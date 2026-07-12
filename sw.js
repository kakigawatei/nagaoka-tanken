/*
 * ながおか探検録 - Service Worker
 *
 * キャッシュ戦略：
 *  - index.html / data/pois.json / data/shops.json : network-first（オンライン時は常に最新を取得。オフライン時のみキャッシュへフォールバック）
 *  - それ以外の同一オリジンGET（画像・manifestなど）: stale-while-revalidate（即キャッシュ返却＋裏で更新）
 *
 * 更新の確実な反映のために：
 *  - CACHE_VERSION を変更するたびに新しいキャッシュ名になり、activateで旧キャッシュを破棄する
 *  - install時にskipWaiting、activate時にclients.claimして即座に新SWへ切り替える
 *  - index.html/pois.jsonはそもそも常にネットワークを優先するため、SW自体のバージョンを上げなくても
 *    アプリの中身の更新は次回オンライン時に反映される
 */
"use strict";

var CACHE_VERSION = "v38";
var CACHE_NAME = "nagaoka-tanken-" + CACHE_VERSION;

// SW自身の場所を基準に相対パスで解決（GitHub Pagesのサブパス配下でも正しく動くように）
var SCOPE_URL = self.registration ? self.registration.scope : "./";

var PRECACHE_URLS = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "data/pois.json",
  "data/shops.json",
  "assets/app_icon_192.png",
  "assets/app_icon_512.png",
  "assets/apple_touch_icon.png",
  "assets/favicon.png",
  "assets/title_frame.png",
  "assets/coin.png",
  "assets/compass.png",
  "assets/treasure.png",
  "assets/guide_idle.png",
  "assets/guide_happy.png",
  "assets/guide_point.png",
  // 衣装（コスプレ）スプライト
  "assets/guide_idle_isoroku.png",
  "assets/guide_happy_isoroku.png",
  "assets/guide_point_isoroku.png",
  "assets/guide_idle_tsuginosuke.png",
  "assets/guide_happy_tsuginosuke.png",
  "assets/guide_point_tsuginosuke.png",
  "assets/guide_idle_torasaburo.png",
  "assets/guide_happy_torasaburo.png",
  "assets/guide_point_torasaburo.png",
  "assets/guide_idle_boy2.png",
  "assets/guide_happy_boy2.png",
  "assets/guide_point_boy2.png",
  "assets/guide_idle_girl1.png",
  "assets/guide_happy_girl1.png",
  "assets/guide_point_girl1.png",
  "assets/guide_idle_girl2.png",
  "assets/guide_happy_girl2.png",
  "assets/guide_point_girl2.png",
  "assets/guide_idle_boy2_isoroku.png",
  "assets/guide_idle_girl1_isoroku.png",
  "assets/guide_idle_girl2_isoroku.png",
  "assets/guide_idle_boy2_tsuginosuke.png",
  "assets/guide_idle_girl1_tsuginosuke.png",
  "assets/guide_idle_girl2_tsuginosuke.png",
  "assets/guide_idle_boy2_torasaburo.png",
  "assets/guide_idle_girl1_torasaburo.png",
  "assets/guide_idle_girl2_torasaburo.png",
  "assets/guide_idle_kanetsugu.png",
  "assets/guide_happy_kanetsugu.png",
  "assets/guide_point_kanetsugu.png",
  "assets/guide_idle_boy2_kanetsugu.png",
  "assets/guide_idle_girl1_kanetsugu.png",
  "assets/guide_idle_girl2_kanetsugu.png",
  "assets/fw_kiku.png",
  "assets/fw_botan.png",
  "assets/fw_yanagi.png",
  "assets/fw_starmine.png",
  "assets/fw_shakudama.png",
  "assets/fw_phoenix.png",
  "assets/chest_closed.png",
  "assets/chest_open.png",
  "assets/ic_home.png",
  "assets/ic_map.png",
  "assets/ic_book.png",
  "assets/ic_shop.png",
  "assets/ic_settings.png",
  "assets/pin_found.png",
  "assets/pin_unknown.png",
  "assets/map_chuo.png",
  "assets/map_settaya.png",
  "assets/map_yamakoshi.png",
  "assets/map_teradomari.png",
  "assets/map_tochio.png",
  "assets/map_yoita.png",
  "assets/map_koshiji.png",
  "assets/map_yomogihira.png",
  "assets/card_toushijou.png",
  "assets/card_toushijou_deluxe.png",
  "assets/card_nakayama.png",
  "assets/card_nakayama_deluxe.png",
  "assets/card_kogomo.png",
  "assets/card_kogomo_deluxe.png",
  "assets/card_tanesuhara.png",
  "assets/card_tanesuhara_deluxe.png",
  "assets/card_koryu.png",
  "assets/card_koryu_deluxe.png",
  "assets/card_hakusan.png",
  "assets/card_hakusan_deluxe.png",
  "assets/card_shomyoji.png",
  "assets/card_shomyoji_deluxe.png",
  "assets/card_jukanen.png",
  "assets/card_jukanen_deluxe.png",
  "assets/card_suizoku.png",
  "assets/card_suizoku_deluxe.png",
  "assets/card_kaisui.png",
  "assets/card_kaisui_deluxe.png",
  "assets/card_aore.png",
  "assets/card_sakanoue.png",
  "assets/gacha_body.png",
  "assets/gacha_handle.png",
  "assets/gacha_dome.png",
  "assets/gacha_capsule.png",
  "assets/gacha_capsule_open.png",
  "assets/card_yamamoto.png",
  "assets/card_kawai.png",
  "assets/card_sensai.png",
  "assets/card_nyozekura.png",
  "assets/card_honmaru.png",
  "assets/card_yukyuzan.png",
  "assets/card_kina_saffron.png",
  "assets/card_yoshinogawa.png",
  "assets/card_koshimurasaki.png",
  "assets/card_hasegawa.png",
  "assets/card_yamakoshi.png",
  "assets/card_teradomari.png",
  "assets/card_tochio.png",
  "assets/card_yoita.png",
  "assets/card_hotokusan.png",
  // 豪華版カード（再訪ごほうび）
  "assets/card_aore_deluxe.png",
  "assets/card_yamamoto_deluxe.png",
  "assets/card_kawai_deluxe.png",
  "assets/card_kina_saffron_deluxe.png",
  "assets/card_yoshinogawa_deluxe.png",
  "assets/card_tochio_deluxe.png",
  "assets/card_yoita_deluxe.png",
  "assets/card_hotokusan_deluxe.png",
  "assets/card_sensai_deluxe.png",
  "assets/card_nyozekura_deluxe.png",
  "assets/card_honmaru_deluxe.png",
  "assets/card_yukyuzan_deluxe.png",
  "assets/card_koshimurasaki_deluxe.png",
  "assets/card_hasegawa_deluxe.png",
  "assets/card_yamakoshi_deluxe.png",
  "assets/card_teradomari_deluxe.png",
  "assets/card_sakanoue_deluxe.png",
  // 与板・栃尾・越路・蓬平 拡張（新13スポット＝通常＋豪華版）
  "assets/card_kanetsugu_museum.png", "assets/card_kanetsugu_museum_deluxe.png",
  "assets/card_yoita_castle.png", "assets/card_yoita_castle_deluxe.png",
  "assets/card_moto_yoita.png", "assets/card_moto_yoita_deluxe.png",
  "assets/card_rakuzanen.png", "assets/card_rakuzanen_deluxe.png",
  "assets/card_tochio_castle.png", "assets/card_tochio_castle_deluxe.png",
  "assets/card_akiba_okunoin.png", "assets/card_akiba_okunoin_deluxe.png",
  "assets/card_tochio_aburage.png", "assets/card_tochio_aburage_deluxe.png",
  "assets/card_gangi_tochio.png", "assets/card_gangi_tochio_deluxe.png",
  "assets/card_momijien.png", "assets/card_momijien_deluxe.png",
  "assets/card_asahi_shuzo.png", "assets/card_asahi_shuzo_deluxe.png",
  "assets/card_shoraikaku.png", "assets/card_shoraikaku_deluxe.png",
  "assets/card_yomogihira_onsen.png", "assets/card_yomogihira_onsen_deluxe.png",
  "assets/card_koryu_okumiya.png", "assets/card_koryu_okumiya_deluxe.png",
  // 中心部・越路 追加スポット
  "assets/card_suido_tank.png", "assets/card_suido_tank_deluxe.png",
  "assets/card_hasegawa_tei.png", "assets/card_hasegawa_tei_deluxe.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        return Promise.all(
          PRECACHE_URLS.map(function (url) {
            return cache.add(url).catch(function (err) {
              // 1ファイルの失敗で全体を失敗させない（存在しない環境でも起動できるように）
              console.warn("[sw] precache failed:", url, err);
            });
          })
        );
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) {
              return key.indexOf("nagaoka-tanken-") === 0 && key !== CACHE_NAME;
            })
            .map(function (key) {
              return caches.delete(key);
            })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

function isNetworkFirstRequest(url) {
  return (
    url.pathname.endsWith("/index.html") ||
    url.pathname.endsWith("/") ||
    url.pathname.endsWith("/data/pois.json") ||
    url.pathname.endsWith("/data/shops.json")
  );
}

function networkFirst(request) {
  return fetch(request)
    .then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(request, copy);
        });
      }
      return response;
    })
    .catch(function () {
      return caches.match(request).then(function (cached) {
        return cached || caches.match("index.html");
      });
    });
}

function staleWhileRevalidate(request) {
  return caches.open(CACHE_NAME).then(function (cache) {
    return cache.match(request).then(function (cached) {
      var networkFetch = fetch(request)
        .then(function (response) {
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(function () {
          return cached;
        });
      return cached || networkFetch;
    });
  });
}

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // 外部リソースはSWで扱わない

  if (request.mode === "navigate" || isNetworkFirstRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
