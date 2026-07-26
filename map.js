// map.js — one interactive NYC map, reused on travel + recommendations.
// Base: Leaflet + CARTO tiles. Layers: colored neighborhoods (NYT-inspired),
// MTA subway lines + stations, and our own place pins. Data is loaded from a
// CDN at runtime; every extra layer degrades gracefully if its source fails,
// so the base map + pins always render.
(function () {
  var el = document.getElementById('sjmap');
  if (!el) return;

  // ---- our places ----------------------------------------------------------
  // cat: venue | hotel | eat | do
  var PLACES = [
    { n: 'The Pierre',            cat: 'venue', lat: 40.76476, lng: -73.97197, note: 'Saturday · the wedding (and a place to stay)', url: 'https://www.google.com/maps/search/?api=1&query=The+Pierre+Hotel+2+E+61st+St+New+York' },
    { n: 'Chinese Tuxedo',        cat: 'venue', ev: 'friday', lat: 40.71467, lng: -73.99772, note: 'Friday · the welcome party', url: 'https://www.google.com/maps/search/?api=1&query=Chinese+Tuxedo+5+Doyers+St+New+York' },
    { n: 'Lotte New York Palace', cat: 'hotel', lat: 40.75802, lng: -73.97573, note: 'Biggest rooms · ~15 min to the Pierre', url: 'https://www.lottenypalace.com/wedding-stories/tang--shleifer-wedding' },
    { n: 'Thompson Central Park', cat: 'hotel', lat: 40.76428, lng: -73.97869, note: 'Modern · steps from the park', url: 'https://www.hyatt.com/events/en-US/group-booking/LGATP/G-3TSW' },
    { n: 'Le Méridien Central Park', cat: 'hotel', lat: 40.76447, lng: -73.97815, note: 'Friendly price · ~12 min walk to the Pierre', url: 'https://www.marriott.com/event-reservations/reservation-link.mi?id=1780579014068&key=GRP&app=resvlink' },
    { n: 'Atomix', cat: 'eat', lat: 40.74490, lng: -73.98460, note: 'NoMad · Jenni\'s #1. Two-star Korean tasting counter — book the second reservations open.' },
    { n: 'Torrisi', cat: 'eat', lat: 40.72130, lng: -73.99580, note: 'Nolita · Sam\'s #1. Italian-American in the old Puck Building — if you can get a table, take it.' },
    { n: 'Estela', cat: 'eat', lat: 40.72440, lng: -73.99460, note: 'Nolita · Our date-night place. Small, loud, perfect.' },
    { n: 'Carbone', cat: 'eat', lat: 40.72840, lng: -74.00110, note: 'Greenwich Village · Sceney red-sauce Italian. Get the Caesar.' },
    { n: 'Semma', cat: 'eat', lat: 40.73450, lng: -74.00210, note: 'West Village · South Indian, and unlike anything else in the city.' },
    { n: 'Cote', cat: 'eat', lat: 40.74150, lng: -73.99030, note: 'Flatiron · Korean steakhouse. Sceney, and genuinely great.' },
    { n: 'Shmoné', cat: 'eat', lat: 40.73600, lng: -74.00060, note: 'West Village · Israeli, big fun energy.' },
    { n: 'Oiji Mi', cat: 'eat', lat: 40.73810, lng: -73.99250, note: 'Flatiron · Modern Korean, beautiful room.' },
    { n: 'Claud', cat: 'eat', lat: 40.72800, lng: -73.98990, note: 'East Village · Small, seasonal, always good.' },
    { n: 'Rezdora', cat: 'eat', lat: 40.73830, lng: -73.98780, note: 'Flatiron · Emilia-Romagna pasta. The tortellini.' },
    { n: 'Chambers', cat: 'eat', lat: 40.71780, lng: -74.00890, note: 'Tribeca · Neighborhood-y — sit at the counter.' },
    { n: 'Comal', cat: 'eat', lat: 40.72680, lng: -73.98380, note: 'East Village · Good tacos, easy night.' },
    { n: 'Tucci', cat: 'eat', lat: 40.73010, lng: -73.99920, note: 'Greenwich Village · Vibey Italian — and an easier reservation than Carbone.' },
    { n: 'Gramercy Tavern', cat: 'eat', lat: 40.73850, lng: -73.98840, note: 'Flatiron · The special-occasion one. Book well ahead.' },
    { n: 'Union Square Cafe', cat: 'eat', lat: 40.73680, lng: -73.98730, note: 'Union Square · Danny Meyer\'s original. Always right.' },
    { n: 'Casa Mono', cat: 'eat', lat: 40.73590, lng: -73.98660, note: 'Gramercy · Tiny Spanish counter, huge wine list.' },
    { n: 'Hawksmoor', cat: 'eat', lat: 40.73780, lng: -73.98790, note: 'Gramercy · British steakhouse in a landmark bank hall.' },
    { n: 'Jeju Noodle Bar', cat: 'eat', lat: 40.73450, lng: -74.00560, note: 'West Village · The only Michelin-starred ramen in the city.' },
    { n: 'Raku', cat: 'eat', lat: 40.72850, lng: -73.98800, note: 'East Village · Handmade udon. Fast, cheap, great.' },
    { n: 'Fish Cheeks', cat: 'eat', lat: 40.72680, lng: -73.99440, note: 'NoHo · Thai seafood, loud and fun.' },
    { n: 'Anita La Mamma del Gelato', cat: 'eat', lat: 40.72680, lng: -73.98800, note: 'Multiple · Gelato worth the line.' },
    { n: 'Caffè Panna', cat: 'eat', lat: 40.73710, lng: -73.98660, note: 'Gramercy · Ice cream that people queue around the block for.' },
    { n: 'Venchi', cat: 'eat', lat: 40.72950, lng: -73.99650, note: 'Multiple · Italian chocolate + gelato. The wall of chocolate.' },
    { n: 'Hani\'s Bakery & Cafe', cat: 'eat', lat: 40.72640, lng: -73.98400, note: 'East Village · Korean-ish pastry. The croissants.' },
    { n: 'Kith Treats', cat: 'eat', lat: 40.72290, lng: -73.99750, note: 'Multiple · Cereal soft-serve inside the streetwear store. Very New York.' },
    { n: 'Daily Provisions', cat: 'eat', lat: 40.73580, lng: -73.98800, note: 'Multiple · Crullers, egg sandwiches, the everyday one.' },
    { n: 'Los Tacos No. 1', cat: 'eat', lat: 40.74250, lng: -74.00600, note: 'Multiple · The adobada. Standing room only, always.' },
    { n: 'Santo Taco', cat: 'eat', lat: 40.72660, lng: -73.99380, note: 'NoHo · Good tacos.' },
    { n: 'Huso', cat: 'eat', lat: 40.77160, lng: -73.96140, note: 'Upper East Side · Caviar tasting counter — a small, ridiculous treat.' },
    { n: 'Sorate', cat: 'eat', lat: 40.73570, lng: -73.99050, note: 'Union Square · Matcha. The one near Union Square.' },
    { n: 'Penny', cat: 'eat', lat: 40.73000, lng: -73.98840, note: 'East Village · Seafood bar, natural wine, our kind of night.' },
    { n: 'Saint Tuesday', cat: 'eat', lat: 40.71910, lng: -74.00600, note: 'Tribeca · Basement jazz bar under the Walker Hotel. Go late.' },
    { n: 'Elvis', cat: 'eat', lat: 40.72220, lng: -73.99540, note: 'Nolita · Fun, girly.' },
    { n: 'Guggenheim', cat: 'do', lat: 40.78300, lng: -73.95900, note: 'Upper East Side · Jenni\'s favorite museum — the Frank Lloyd Wright spiral is the point.' },
    { n: 'MoMA', cat: 'do', lat: 40.76140, lng: -73.97760, note: 'Midtown · Ten minutes from the Pierre. Go early.' },
    { n: 'Storm King Art Center', cat: 'do', lat: 41.42650, lng: -74.05700, note: 'Hudson Valley · 500 acres of monumental sculpture upstate. A whole day, and worth it.' },
    { n: 'David Zwirner', cat: 'do', lat: 40.74660, lng: -74.00580, note: 'Chelsea · Anchor of the Chelsea gallery walk. Free.' },
    { n: 'Gagosian', cat: 'do', lat: 40.74840, lng: -74.00560, note: 'Chelsea · Blue-chip, always a show worth seeing.' },
    { n: 'Hauser & Wirth', cat: 'do', lat: 40.74770, lng: -74.00710, note: 'Chelsea · Big, ambitious shows in a former warehouse.' },
    { n: 'kurimanzutto', cat: 'do', lat: 40.76900, lng: -73.96620, note: 'Upper East Side · Mexico City gallery\'s New York space.' },
    { n: 'The High Line', cat: 'do', lat: 40.74800, lng: -74.00480, note: 'Chelsea · Walk it into the galleries — they\'re all right there.' },
    { n: 'Little Island', cat: 'do', lat: 40.74200, lng: -74.01040, note: 'Meatpacking · The park on tulips in the Hudson. Free, strange, lovely.' },
    { n: 'The Ramble', cat: 'do', lat: 40.77730, lng: -73.97000, note: 'Central Park · The wild wooded part of the park. Get lost on purpose.' },
    { n: 'Madison Square Park', cat: 'do', lat: 40.74240, lng: -73.98770, note: 'Flatiron · Shake Shack\'s original, plus whatever sculpture is up.' },
    { n: 'Union Square Greenmarket', cat: 'do', lat: 40.73590, lng: -73.99110, note: 'Union Square · Mon/Wed/Fri/Sat. The best browsing in the city.' },
    { n: 'Tokyo Record Bar', cat: 'eat', lat: 40.72850, lng: -73.99950, note: 'Greenwich Village · Omakase where the courses come with a record side. Reservation-only, tiny.' },
    { n: 'Bar Miller', cat: 'eat', lat: 40.72680, lng: -73.98340, note: 'East Village · Omakase counter, 12 seats. Precise and very good.' },
    { n: 'Office of Mr. Moto', cat: 'eat', lat: 40.71570, lng: -73.99300, note: 'Chinatown · Hidden-ish, natural wine and small plates.' },
    { n: 'Crevette', cat: 'eat', lat: 40.72180, lng: -73.99620, note: 'Nolita · LA-ish seafood — bright, breezy, raw bar.' },
    { n: 'Coqodaq', cat: 'eat', lat: 40.73950, lng: -73.98950, note: 'Flatiron · Korean fried chicken in a gilded room. Overhyped, still fun.' },
    { n: 'Cervo\'s', cat: 'eat', lat: 40.71860, lng: -73.99030, note: 'Lower East Side · Portuguese-Spanish seafood, small and lively.' },
    { n: 'Sunn\'s', cat: 'eat', lat: 40.72730, lng: -73.98380, note: 'East Village · Jenni loves this spot — and it\'s on OpenTable, so actually bookable.' },
    { n: 'Café Zaffri', cat: 'eat', lat: 40.75920, lng: -73.98550, note: 'Times Square · Overpriced but beautiful — reminds us of LA. Go for the room.' },
    { n: 'Fedora', cat: 'eat', lat: 40.73550, lng: -74.00430, note: 'West Village · Cozy and intimate.' },
    { n: 'The Portrait Bar', cat: 'eat', lat: 40.76270, lng: -73.97700, note: 'Midtown · Hotel bar done properly — dressy, quiet, good martini.' },
    { n: 'Parcelle', cat: 'eat', lat: 40.71570, lng: -73.99030, note: 'Lower East Side · Wine bar with a serious list and small plates to match.' },
    { n: 'Smithereens', cat: 'eat', lat: 40.72840, lng: -73.98120, note: 'East Village · Hipsters and seafood.' },
    { n: 'Dame', cat: 'eat', lat: 40.73020, lng: -74.00060, note: 'Greenwich Village · British fish and chips, tiny, always a wait.' },
    { n: 'Bridges', cat: 'eat', lat: 40.71590, lng: -73.99550, note: 'Chinatown · Amazing food — classy but chill.' },
    { n: 'Cosme', cat: 'eat', lat: 40.73850, lng: -73.99030, note: 'Flatiron · Enrique Olvera\'s modern Mexican. The duck carnitas, the husk meringue.' },
    { n: 'Family Meal at Blue Hill', cat: 'eat', lat: 40.73180, lng: -73.99940, note: 'Greenwich Village · Blue Hill\'s casual room — the Stone Barns cooking without the trek.' },
    { n: 'Public Records', cat: 'eat', lat: 40.68660, lng: -73.98200, note: 'Brooklyn · Sound-system bar, listening room, plant-based kitchen. Go for the music.' },
    { n: 'Sip & Guzzle', cat: 'eat', lat: 40.73220, lng: -74.00090, note: 'Greenwich Village · Two bars in one — casual upstairs, serious cocktails below.' },
    { n: 'Eavesdrop', cat: 'eat', lat: 40.72110, lng: -73.95390, note: 'Brooklyn · Greenpoint listening bar. Records, low light.' },
    { n: 'Lilia', cat: 'eat', lat: 40.71850, lng: -73.95400, note: 'Brooklyn · Missy Robbins\' pasta temple in Williamsburg. Book at 30 days.' },
    { n: 'Misi', cat: 'eat', lat: 40.71060, lng: -73.96800, note: 'Brooklyn · Lilia\'s sibling — pasta and vegetables, waterfront.' },
    { n: 'One White Street', cat: 'eat', lat: 40.71880, lng: -74.00720, note: 'Tribeca · Farmhouse cooking in a Tribeca townhouse.' },
    { n: 'Malaparte', cat: 'eat', lat: 40.73690, lng: -74.00870, note: 'West Village · Walk-in Italian. Go early, put your name down.' },
    { n: 'Ci Siamo', cat: 'eat', lat: 40.75300, lng: -74.00100, note: 'Hudson Yards · Live-fire Italian in a huge, handsome room.' },
    { n: 'Cooper Hewitt', cat: 'do', lat: 40.78450, lng: -73.95800, note: 'Upper East Side · Smithsonian design museum in the Carnegie Mansion. Small, and a nice pair with the Guggenheim up the block.' },
    { n: 'Chelsea Piers Golf Club', cat: 'do', lat: 40.74730, lng: -74.01040, note: 'Chelsea · Four-tier driving range hitting straight out over the Hudson. Sillier and better than it sounds.' },
    { n: 'The Edge', cat: 'do', lat: 40.75380, lng: -74.00000, note: 'Hudson Yards · The outdoor sky deck with the glass floor. Do it at sunset.' },
  ];





  var CAT = {
    venue: { color: '#E53C2D', label: 'Wedding & welcome' },
    hotel: { color: '#E5A11F', label: 'Hotels' },
    eat:   { color: '#5C8A52', label: 'Eat' },
    do:    { color: '#2F6DB5', label: 'Do' }
  };

  // MTA trunk-line colors, keyed by the first route character.
  var TRUNK = {
    '1':'#EE352E','2':'#EE352E','3':'#EE352E',
    '4':'#00933C','5':'#00933C','6':'#00933C',
    '7':'#B933AD',
    'A':'#0039A6','C':'#0039A6','E':'#0039A6',
    'B':'#FF6319','D':'#FF6319','F':'#FF6319','M':'#FF6319',
    'N':'#FCCC0A','Q':'#FCCC0A','R':'#FCCC0A','W':'#FCCC0A',
    'G':'#6CBE45','J':'#996633','Z':'#996633','L':'#A7A9AC','S':'#808183'
  };

  // Soft palette for neighborhood fills (NYT-ish distinct-but-muted).
  var PAL = ['#E7A6A0','#9EC4D6','#E7CE87','#A8C9A0','#D6A9CB','#E9B98A',
             '#8FB7B0','#C8B6DC','#E3B7B0','#B4C98E','#9DB8D8','#D9C08A'];

  function hash(s){ var h=0; s=s||''; for(var i=0;i<s.length;i++){h=(h*31+s.charCodeAt(i))>>>0;} return h; }

  // Figure out a subway segment's color by scanning ALL its property values for a
  // route designation (1,2,3,A,C,E...) — robust to whatever the field is named.
  var ROUTE_ORDER = ['1','2','3','4','5','6','7','A','C','E','B','D','F','M','N','Q','R','W','G','J','Z','L','S'];
  function routeColor(props){
    var s = ' ';
    for (var k in props){ if(props.hasOwnProperty(k)) s += ' ' + props[k]; }
    s = s.toUpperCase();
    for (var i=0;i<ROUTE_ORDER.length;i++){
      var t = ROUTE_ORDER[i];
      var re = new RegExp('(^|[^A-Z0-9])' + t + '([^A-Z0-9]|$)');
      if (re.test(s)) return TRUNK[t];
    }
    return '#8a8a8a';
  }

  // Build the subway key: group route names by their color, in trunk order.
  function buildSubwayKey(features){
    var order = ['#D82233','#009952','#9A38A1','#0062CF','#EB6800','#FCCC0A','#6CBE45','#996633','#A7A9AC','#808183'];
    var byColor = {};
    features.forEach(function(f){
      var c = (f.properties.color||'').toUpperCase(), r = f.properties.route;
      if(!c || !r || /X$/.test(r)) return;   // skip express duplicates like 6X/FX
      (byColor[c] = byColor[c] || {})[r] = 1;
    });
    var colors = Object.keys(byColor).sort(function(a,b){
      var ia=order.indexOf(a), ib=order.indexOf(b);
      return (ia<0?99:ia) - (ib<0?99:ib);
    });
    var html = '<div class="sk-title">Subway lines</div>';
    colors.forEach(function(c){
      var routes = Object.keys(byColor[c]).sort();
      html += '<span class="sk-row"><i style="background:'+c+'"></i>'+routes.join(' ')+'</span>';
    });
    return html;
  }

  // Try a list of URLs; resolve with the first that returns valid GeoJSON.
  function tryFetch(urls){
    var i = 0;
    function next(){
      if (i >= urls.length) return Promise.resolve(null);
      return fetch(urls[i++]).then(function(r){ return r.ok ? r.json() : next(); })
        .then(function(j){ return (j && (j.features || j.type)) ? j : next(); })
        .catch(function(){ return next(); });
    }
    return next();
  }

  // Bundled in the repo (built from the MTA GTFS feed + NYC neighborhood data) —
  // no third-party CDN dependency at runtime.
  var NEIGH    = ['data/neighborhoods.geojson'];
  var LINES    = ['data/subway-lines.geojson'];
  var STATIONS = ['data/subway-stations.geojson'];

  function prop(p, keys){ for(var i=0;i<keys.length;i++){ if(p && p[keys[i]]!=null && p[keys[i]]!=='') return p[keys[i]]; } return ''; }

  // ---- boot ---------------------------------------------------------------
  function loadCSS(href){ var l=document.createElement('link'); l.rel='stylesheet'; l.href=href; document.head.appendChild(l); }
  function loadJS(src,cb){ var s=document.createElement('script'); s.src=src; s.onload=cb; document.head.appendChild(s); }

  loadCSS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.css');
  loadJS('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', init);

  function init(){
    var mode = el.getAttribute('data-mode') || 'recs';
    var center = mode === 'hotels' ? [40.7635, -73.9760] : [40.7480, -73.9840];
    var zoom   = mode === 'hotels' ? 14 : (mode === 'all' ? 13 : 12);

    var isTouch = window.matchMedia('(hover: none)').matches || 'ontouchstart' in window;
    var map = L.map(el, { scrollWheelZoom:false, zoomControl:true,
                               dragging: !isTouch, tap:true }).setView(center, zoom);

    // Touch: the map stays inert until tapped, so a scrolling finger never gets
    // trapped. Tapping activates panning; scrolling it off screen releases it.
    if (isTouch) {
      var hint = document.createElement('div');
      hint.className = 'map-hint';
      hint.textContent = 'tap the map to explore';
      el.appendChild(hint);
      el.addEventListener('click', function () {
        if (el.classList.contains('map-live')) return;
        el.classList.add('map-live');
        map.dragging.enable();
      });
      window.addEventListener('scroll', function () {
        var r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) {
          el.classList.remove('map-live');
          map.dragging.disable();
        }
      }, { passive:true });
    }
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution:'&copy; OpenStreetMap &copy; CARTO', subdomains:'abcd', maxZoom:19
    }).addTo(map);

    // Stacking order via panes: neighborhoods < subway casing < subway lines < markers.
    map.createPane('hoodPane').style.zIndex = 350;
    map.createPane('subCasePane').style.zIndex = 440;
    map.createPane('subLinePane').style.zIndex = 450;
    map.createPane('subStopPane').style.zIndex = 460;

    var HOOD_OPACITY = 0.42, HOOD_FADED = 0.30;

    var hoods = L.layerGroup();
    var subway = L.layerGroup();
    // Pins split into separate toggle groups so hotels and places are independent.
    var gVenues = L.layerGroup();  // wedding & welcome
    var gHotels = L.layerGroup();  // hotels
    var gPlaces = L.layerGroup();  // eat & do
    var hoodGeo = null;         // reference so we can fade/restore
    var subwayOn = false;
    var STATION_ZOOM = 15;      // stations only appear once zoomed in

    drawPins({ venue:gVenues, hotel:gHotels, eat:gPlaces, do:gPlaces });
    // Defaults: travel map focuses on hotels; recs map focuses on places. Venues on both.
    gVenues.addTo(map);
    if (mode === 'all') { gHotels.addTo(map); gPlaces.addTo(map); }
    else if (mode === 'hotels') gHotels.addTo(map);
    else gPlaces.addTo(map);

    // Layer control starts with the pin groups; each data layer is added ONLY once
    // its GeoJSON actually loads with features — so a toggle never appears (or
    // fades neighborhoods) over empty data.
    var ctl = L.control.layers(null, { 'Venues': gVenues, 'Hotels': gHotels, 'Eat & do': gPlaces }, { collapsed:false, position:'topright' }).addTo(map);

    function styleHoods(){
      if(!hoodGeo) return;
      hoodGeo.setStyle(function(f){
        var name = prop(f.properties, ['neighborhood','name','NTAName','ntaname','nta2020','NTANAME']);
        return { color:'#ffffff', weight:1, fillColor: PAL[hash(name)%PAL.length],
                 fillOpacity: subwayOn ? HOOD_FADED : HOOD_OPACITY };
      });
    }

    // Neighborhoods (colored polygons + labels)
    tryFetch(NEIGH).then(function(gj){
      if(!gj || !(gj.features && gj.features.length)) return;
      hoodGeo = L.geoJSON(gj, {
        pane:'hoodPane',
        onEachFeature: function(f, layer){
          var name = prop(f.properties, ['neighborhood','name','NTAName','ntaname','nta2020','NTANAME']);
          if(name) layer.bindTooltip(name, {sticky:true});
        }
      }).addTo(hoods);
      styleHoods();
      ctl.addOverlay(hoods, 'Neighborhoods');
      if(mode !== 'hotels') hoods.addTo(map);   // on by default when zoomed out
    });

    // Subway lines — white casing beneath, colored route on top. Only wired up
    // if we actually receive line features.
    var subKeyCtl = null;
    tryFetch(LINES).then(function(gj){
      if(!gj || !(gj.features && gj.features.length)) return;
      L.geoJSON(gj, {                       // casing
        pane:'subCasePane',
        style: function(){ return { color:'#ffffff', weight:8, opacity:0.95, lineCap:'round' }; }
      }).addTo(subway);
      L.geoJSON(gj, {                       // colored route
        pane:'subLinePane',
        style: function(f){
          var c = (f.properties && f.properties.color) || routeColor(f.properties);
          return { color:c, weight:4, opacity:1, lineCap:'round' };
        },
        onEachFeature: function(f, layer){
          var r = f.properties && f.properties.route;
          if(r) layer.bindTooltip(r + ' train', { sticky:true, className:'sjmap-linetip' });
        }
      }).addTo(subway);
      ctl.addOverlay(subway, 'Subway lines');

      // Build a subway key (MTA color → line letters/numbers), shown only when
      // the Subway layer is on.
      subKeyCtl = L.control({ position:'bottomright' });
      subKeyCtl.onAdd = function(){
        var d = L.DomUtil.create('div', 'sjmap-legend sjmap-subkey');
        d.innerHTML = buildSubwayKey(gj.features);
        return d;
      };
    });

    // Subway stations — hidden at city-wide zoom, revealed only when zoomed in.
    var stationsGeo = null;
    function updateStations(){
      if(!stationsGeo) return;
      var show = subwayOn && map.getZoom() >= STATION_ZOOM;
      if(show && !map.hasLayer(stationsGeo)) stationsGeo.addTo(map);
      else if(!show && map.hasLayer(stationsGeo)) map.removeLayer(stationsGeo);
    }
    tryFetch(STATIONS).then(function(gj){
      if(!gj || !(gj.features && gj.features.length)) return;
      stationsGeo = L.geoJSON(gj, {
        pane:'subStopPane',
        pointToLayer: function(f, latlng){
          return L.circleMarker(latlng, { pane:'subStopPane', radius:2.6, color:'#333', weight:1, fillColor:'#fff', fillOpacity:1 });
        },
        onEachFeature: function(f, layer){
          var name = prop(f.properties, ['name','stop_name','NAME','station']);
          if(name) layer.bindTooltip(name, { direction:'top' });   // hover only
        }
      });
      updateStations();
    });
    map.on('zoomend', updateStations);

    // Fade neighborhoods, manage stations, and show the subway key when toggled.
    map.on('overlayadd', function(e){ if(e.name === 'Subway lines'){ subwayOn = true; styleHoods(); updateStations(); if(subKeyCtl) subKeyCtl.addTo(map); } });
    map.on('overlayremove', function(e){ if(e.name === 'Subway lines'){ subwayOn = false; styleHoods(); updateStations(); if(subKeyCtl) map.removeControl(subKeyCtl); } });

    // legend
    var lg = L.control({position:'bottomleft'});
    lg.onAdd = function(){
      var d = L.DomUtil.create('div','sjmap-legend');
      var html = '';
      Object.keys(CAT).forEach(function(k){ html += '<span><i style="background:'+CAT[k].color+'"></i>'+CAT[k].label+'</span>'; });
      d.innerHTML = html; return d;
    };
    lg.addTo(map);
  }

  function drawPins(groups){
    // Match the site's tier (set on <html data-tier> by personalize.js).
    var tier = parseInt(document.documentElement.getAttribute('data-tier') || '1', 10) || 1;
    PLACES.forEach(function(p){
      // Friday-only venues (Chinese Tuxedo) hidden from Saturday-only guests (tier 4).
      if (p.ev === 'friday' && tier >= 4) return;
      var color = (CAT[p.cat]||CAT.do).color;
      var group = groups[p.cat] || groups.do;
      var icon = L.divIcon({
        className:'sjmap-pin',
        html:'<span class="dot" style="background:'+color+'"></span>',
        iconSize:[18,18], iconAnchor:[9,9]
      });
      var m = L.marker([p.lat, p.lng], {icon:icon}).addTo(group);
      var body = '<div class="sjmap-pop"><b>'+p.n+'</b>'+(p.note?'<br><span>'+p.note+'</span>':'');
      if(p.url) body += '<br><a href="'+p.url+'" target="_blank" rel="noopener">open in maps →</a>';
      body += '</div>';
      m.bindPopup(body);
    });
  }
})();
