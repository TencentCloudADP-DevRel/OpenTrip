/* trip-map — a MapLibre GL wrapper web component in the spirit of mapcn
   (github.com/AnmolSaini16/mapcn): CARTO basemap, theme-aware light style,
   composable markers + routes. Attributes:
     stops  — JSON array [{id,name,lat,lng,day,color,num,transit}]
     day    — "0" for all days, or "1".."9" to filter
     active — stop id to focus (flyTo + popup)
*/
(function () {
  var JS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js";
  var CSS = "https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css";
  var STYLE_URL = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";
  var loader = null;
  function loadMaplibre() {
    if (window.maplibregl) return Promise.resolve();
    if (loader) return loader;
    loader = new Promise(function (res, rej) {
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = CSS;
      document.head.appendChild(l);
      var s = document.createElement("script");
      s.src = JS; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
    return loader;
  }

  var GLOBAL_CSS = [
    ".trip-map-marker{width:26px;height:26px;border-radius:9999px;display:flex;align-items:center;justify-content:center;",
    "font:600 12px/1 'Cal Sans UI','Inter',system-ui,sans-serif;color:#fff;border:2px solid #fff;cursor:pointer;",
    "box-shadow:0 1px 3px rgba(20,26,48,.35);transition:transform .15s cubic-bezier(.2,.8,.3,1),box-shadow .15s ease;}",
    ".trip-map-marker:hover{transform:scale(1.15);}",
    ".trip-map-marker[data-active='true']{transform:scale(1.3);box-shadow:0 0 0 4px rgba(63,111,201,.28),0 2px 6px rgba(20,26,48,.4);z-index:5;}",
    ".trip-map-marker[data-transit='true']{border-radius:6px;}",
    ".maplibregl-popup-content{font:500 12.5px/1.4 'Cal Sans UI','Inter',system-ui,sans-serif;color:#28304a;",
    "padding:7px 10px;border-radius:10px;box-shadow:0 4px 16px rgba(20,26,48,.16),0 0 0 1px rgba(20,26,48,.08);}",
    ".maplibregl-popup-tip{border-top-color:#fff;}",
    ".maplibregl-ctrl-group{border-radius:10px;box-shadow:0 1px 3px rgba(20,26,48,.12),0 0 0 1px rgba(20,26,48,.08)!important;}"
  ].join("");

  var cssInjected = false;

  class TripMap extends HTMLElement {
    static get observedAttributes() { return ["stops", "day", "active"]; }
    constructor() {
      super();
      this._markers = [];
      this._ready = false;
      this._lastFitKey = null;
    }
    connectedCallback() {
      if (this._container) return;
      if (!cssInjected) {
        cssInjected = true;
        var st = document.createElement("style");
        st.textContent = GLOBAL_CSS;
        document.head.appendChild(st);
      }
      this.style.display = "block";
      this.style.position = this.style.position || "relative";
      this.style.overflow = "hidden";
      this.style.width = this.style.width || "100%";
      this.style.height = this.style.height || "100%";
      var c = document.createElement("div");
      c.style.cssText = "position:absolute;inset:0;background:#e9ecf4;";
      this.appendChild(c);
      this._container = c;
      var self = this;
      loadMaplibre().then(function () { self._init(); }).catch(function () {
        c.innerHTML = "<div style='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:500 13px system-ui;color:#6d788f'>Map could not load (offline)</div>";
      });
    }
    _init() {
      if (!this.isConnected || this._map) return;
      var self = this;
      var map = new maplibregl.Map({
        container: this._container,
        style: STYLE_URL,
        center: [136.8, 35.1],
        zoom: 6.4,
        attributionControl: { compact: true }
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      this._map = map;
      map.on("load", function () {
        map.addSource("trip-route", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.addLayer({
          id: "trip-route-casing", type: "line", source: "trip-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#ffffff", "line-width": 6, "line-opacity": 0.9 }
        });
        map.addLayer({
          id: "trip-route-line", type: "line", source: "trip-route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": ["get", "color"], "line-width": 2.5, "line-opacity": 0.9 }
        });
        self._ready = true;
        self._sync(true);
      });
    }
    attributeChangedCallback(name) {
      if (this._ready) this._sync(name === "day" || name === "stops");
    }
    _stops() {
      try { return JSON.parse(this.getAttribute("stops") || "[]"); }
      catch (e) { return []; }
    }
    _visible() {
      var day = this.getAttribute("day") || "0";
      var stops = this._stops();
      if (day === "0") return stops;
      return stops.filter(function (s) { return String(s.day) === day; });
    }
    _sync(refit) {
      var map = this._map;
      if (!map || !this._ready) return;
      var visible = this._visible();
      var active = this.getAttribute("active") || "";
      var self = this;

      // markers
      this._markers.forEach(function (m) { m.remove(); });
      this._markers = [];
      if (this._popup) { this._popup.remove(); this._popup = null; }
      visible.forEach(function (s) {
        var el = document.createElement("div");
        el.className = "trip-map-marker";
        el.style.background = s.color || "#3f6fc9";
        el.textContent = s.num != null ? s.num : "";
        el.setAttribute("data-active", String(s.id) === active ? "true" : "false");
        if (s.transit) el.setAttribute("data-transit", "true");
        el.addEventListener("click", function (ev) {
          ev.stopPropagation();
          window.dispatchEvent(new CustomEvent("trip-map-select", { detail: { id: s.id } }));
        });
        var m = new maplibregl.Marker({ element: el, anchor: "center" })
          .setLngLat([s.lng, s.lat]).addTo(map);
        self._markers.push(m);
      });

      // route: one line per day, colored
      var byDay = {};
      visible.forEach(function (s) {
        (byDay[s.day] = byDay[s.day] || []).push(s);
      });
      var features = Object.keys(byDay).map(function (d) {
        var pts = byDay[d];
        return {
          type: "Feature",
          properties: { color: pts[0].color || "#3f6fc9" },
          geometry: { type: "LineString", coordinates: pts.map(function (p) { return [p.lng, p.lat]; }) }
        };
      }).filter(function (f) { return f.geometry.coordinates.length > 1; });
      var src = map.getSource("trip-route");
      if (src) src.setData({ type: "FeatureCollection", features: features });

      // focus
      var activeStop = visible.filter(function (s) { return String(s.id) === active; })[0];
      if (activeStop) {
        map.flyTo({ center: [activeStop.lng, activeStop.lat], zoom: Math.max(map.getZoom(), 13.5), duration: 900 });
        this._popup = new maplibregl.Popup({ offset: 20, closeButton: false, closeOnClick: false })
          .setLngLat([activeStop.lng, activeStop.lat])
          .setText(activeStop.name || "")
          .addTo(map);
      } else if (refit && visible.length) {
        var fitKey = (this.getAttribute("day") || "0") + ":" + visible.length;
        if (fitKey !== this._lastFitKey) {
          this._lastFitKey = fitKey;
          var b = new maplibregl.LngLatBounds();
          visible.forEach(function (s) { b.extend([s.lng, s.lat]); });
          map.fitBounds(b, { padding: 70, maxZoom: 13, duration: 900 });
        }
      }
    }
    disconnectedCallback() {
      if (this._map) { this._map.remove(); this._map = null; this._ready = false; }
      this._container = null;
      this._markers = [];
    }
  }
  if (!customElements.get("trip-map")) customElements.define("trip-map", TripMap);
})();
