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
    { n: 'Atomix', cat: 'eat', lat: 40.74440, lng: -73.98295, note: 'NoMad · Jenni\'s #1. Two-star Korean tasting counter — book the second reservations open.' },
    { n: 'Torrisi', cat: 'eat', lat: 40.72415, lng: -73.99540, note: 'Nolita · Sam\'s #1. Italian-American in the old Puck Building — if you can get a table, take it.' },
    { n: 'Estela', cat: 'eat', lat: 40.72468, lng: -73.99476, note: 'Nolita · Our date-night place. Small, loud, perfect.' },
    { n: 'Carbone', cat: 'eat', lat: 40.72791, lng: -74.00019, note: 'Greenwich Village · Sceney, old-school-ish. Get the Caesar.' },
    { n: 'Semma', cat: 'eat', lat: 40.73603, lng: -74.00052, note: 'West Village · South Indian, fun area.' },
    { n: 'Cote', cat: 'eat', lat: 40.74129, lng: -73.99127, note: 'Flatiron · Sceney Korean steakhouse.' },
    { n: 'Shmoné', cat: 'eat', lat: 40.73328, lng: -73.99862, note: 'Greenwich Village · Israeli, big fun energy.' },
    { n: 'Oiji Mi', cat: 'eat', lat: 40.73938, lng: -73.99191, note: 'Flatiron · Modern Korean, beautiful room.' },
    { n: 'Claud', cat: 'eat', lat: 40.73087, lng: -73.98956, note: 'East Village · Small, seasonal, always good.' },
    { n: 'Rezdora', cat: 'eat', lat: 40.73910, lng: -73.98943, note: 'Flatiron · Emilia-Romagna pasta. The tortellini.' },
    { n: 'Chambers', cat: 'eat', lat: 40.71471, lng: -74.00761, note: 'Tribeca · Neighborhood-y — sit at the counter.' },
    { n: 'Comal', cat: 'eat', lat: 40.71905, lng: -73.99244, note: 'Lower East Side · Good tacos, easy night.' },
    { n: 'Tucci', cat: 'eat', lat: 40.72660, lng: -73.99587, note: 'NoHo · Vibey Italian — and an easier reservation than Carbone.' },
    { n: 'Gramercy Tavern', cat: 'eat', lat: 40.73899, lng: -73.98948, note: 'Flatiron · Always good.' },
    { n: 'Union Square Cafe', cat: 'eat', lat: 40.73776, lng: -73.98805, note: 'Union Square · One of Sam\'s favorites in Gramercy.' },
    { n: 'Casa Mono', cat: 'eat', lat: 40.73612, lng: -73.98712, note: 'Gramercy · Tiny Spanish counter, huge wine list.' },
    { n: 'Hawksmoor', cat: 'eat', lat: 40.73953, lng: -73.98645, note: 'Gramercy · Good steak, British vibes.' },
    { n: 'Jeju Noodle Bar', cat: 'eat', lat: 40.73319, lng: -74.00737, note: 'West Village · Ramen.' },
    { n: 'Raku', cat: 'eat', lat: 40.72692, lng: -73.98755, note: 'East Village · Handmade udon. Fast, cheap, great.' },
    { n: 'Fish Cheeks', cat: 'eat', lat: 40.72614, lng: -73.99323, note: 'NoHo · Thai seafood, loud and fun.' },
    { n: 'Freemans', cat: 'eat', lat: 40.72265, lng: -73.99247, note: 'Lower East Side · Down a graffiti alley, taxidermy on the walls. A New York classic.' },
    { n: 'Banzarbar', cat: 'eat', lat: 40.72268, lng: -73.99244, note: 'Lower East Side · The 14-seat speakeasy upstairs at Freemans. Go for a nightcap.' },
    { n: 'Anita La Mamma del Gelato', cat: 'eat', lat: 40.77473, lng: -73.95412, note: 'Multiple · Gelato worth the line.' },
    { n: 'Caffè Panna', cat: 'eat', lat: 40.73699, lng: -73.98679, note: 'Gramercy · Ice cream that people queue around the block for.' },
    { n: 'Venchi', cat: 'eat', lat: 40.73736, lng: -73.99034, note: 'Multiple · Italian chocolate + gelato. The wall of chocolate.' },
    { n: 'Hani\'s Bakery & Cafe', cat: 'eat', lat: 40.72914, lng: -73.98994, note: 'East Village · Korean-ish pastry. The croissants.' },
    { n: 'Kith Treats', cat: 'eat', lat: 40.72595, lng: -73.99454, note: 'Multiple · Cereal soft-serve inside the streetwear store. Very New York.' },
    { n: 'Daily Provisions', cat: 'eat', lat: 40.73764, lng: -73.98767, note: 'Multiple · Crullers, egg sandwiches, the everyday one.' },
    { n: 'Los Tacos No. 1', cat: 'eat', lat: 40.74073, lng: -74.00561, note: 'Multiple · The adobada. Standing room only, always.' },
    { n: 'Santo Taco', cat: 'eat', lat: 40.72120, lng: -73.99685, note: 'Nolita · Good tacos.' },
    { n: 'Huso', cat: 'eat', lat: 40.71740, lng: -74.01063, note: 'Tribeca · Caviar tasting counter — a small, ridiculous treat.' },
    { n: 'Sorate', cat: 'eat', lat: 40.72559, lng: -74.00301, note: 'SoHo · Matcha.' },
    { n: 'Penny', cat: 'eat', lat: 40.73082, lng: -73.98971, note: 'East Village · Seafood bar, natural wine, our kind of night.' },
    { n: 'Saint Tuesday', cat: 'eat', lat: 40.71820, lng: -74.00175, note: 'Tribeca · Basement jazz bar under the Walker Hotel. Go late.' },
    { n: 'Elvis', cat: 'eat', lat: 40.72694, lng: -73.99278, note: 'NoHo · Fun, girly.' },
    { n: 'Tokyo Record Bar', cat: 'eat', lat: 40.73060, lng: -74.00022, note: 'Greenwich Village · Omakase where every course comes with a record side. Tiny, reservation-only.' },
    { n: 'Bar Miller', cat: 'eat', lat: 40.72396, lng: -73.98083, note: 'East Village · Homey hipster omakase.' },
    { n: 'Office of Mr. Moto', cat: 'eat', lat: 40.72682, lng: -73.98403, note: 'East Village · Low-key but cool omakase.' },
    { n: 'Crevette', cat: 'eat', lat: 40.72962, lng: -74.00259, note: 'West Village · LA-ish seafood — bright, breezy, raw bar.' },
    { n: 'Coqodaq', cat: 'eat', lat: 40.74008, lng: -73.98875, note: 'Flatiron · Korean fried chicken in a gilded room. Overhyped, still fun.' },
    { n: 'Cervo\'s', cat: 'eat', lat: 40.71480, lng: -73.99135, note: 'Lower East Side · Portuguese-Spanish seafood, small and lively.' },
    { n: 'Sunn\'s', cat: 'eat', lat: 40.71438, lng: -73.99185, note: 'Lower East Side · Jenni loves this spot. OpenTable, so it\'s gettable.' },
    { n: 'Café Zaffri', cat: 'eat', lat: 40.73682, lng: -73.99183, note: 'Union Square · Overpriced, but a beautiful space.' },
    { n: 'Fedora', cat: 'eat', lat: 40.73450, lng: -74.00296, note: 'West Village · Cozy and intimate.' },
    { n: 'The Portrait Bar', cat: 'eat', lat: 40.74476, lng: -73.98733, note: 'NoMad · Plush hotel bar in the Fifth Avenue Hotel. Dressy, in a good way.' },
    { n: 'Parcelle', cat: 'eat', lat: 40.71438, lng: -73.99189, note: 'Chinatown · Wine bar and shop. Order a bottle, stay a while.' },
    { n: 'Smithereens', cat: 'eat', lat: 40.72776, lng: -73.98422, note: 'East Village · Hipsters and seafood.' },
    { n: 'Dame', cat: 'eat', lat: 40.72891, lng: -74.00168, note: 'Greenwich Village · British fish and chips, done properly. Tiny.' },
    { n: 'Bridges', cat: 'eat', lat: 40.71390, lng: -73.99745, note: 'Chinatown · Amazing food — classy but chill.' },
    { n: 'Cosme', cat: 'eat', lat: 40.73951, lng: -73.98840, note: 'Flatiron · Enrique Olvera. The husk meringue is fire.' },
    { n: 'Family Meal at Blue Hill', cat: 'eat', lat: 40.73090, lng: -73.99860, note: 'Greenwich Village · Farm-to-table, minus the ceremony.' },
    { n: 'Sip & Guzzle', cat: 'eat', lat: 40.73109, lng: -74.00220, note: 'West Village · Two bars in one — cocktails downstairs, serious ones up.' },
    { n: 'One White Street', cat: 'eat', lat: 40.71850, lng: -74.00470, note: 'Tribeca · Really good food, a little fancy.' },
    { n: 'Malaparte', cat: 'eat', lat: 40.73790, lng: -74.00760, note: 'West Village · Walk-in Italian. Go early, put your name down.' },
    { n: 'Ci Siamo', cat: 'eat', lat: 40.75260, lng: -73.99500, note: 'Hudson Yards · Live-fire Italian. Big room, big night.' },
    { n: 'Lilia', cat: 'eat', lat: 40.71620, lng: -73.95440, note: 'Williamsburg · Pasta, yum.' },
    { n: 'Misi', cat: 'eat', lat: 40.71050, lng: -73.96700, note: 'Williamsburg · Good pasta.' },
    { n: 'Public Records', cat: 'eat', lat: 40.68390, lng: -73.98800, note: 'Gowanus · Sound-system bar and listening room. Stay for the dancing.' },
    { n: 'Eavesdrop', cat: 'eat', lat: 40.72440, lng: -73.95090, note: 'Greenpoint · Records, drinks, no attitude.' },
    { n: 'Guggenheim', cat: 'do', lat: 40.78278, lng: -73.95917, note: 'Upper East Side · Jenni\'s favorite museum — the Frank Lloyd Wright spiral is the point.' },
    { n: 'Cooper Hewitt', cat: 'do', lat: 40.78556, lng: -73.95889, note: 'Upper East Side · Design museum in the Carnegie Mansion. Small and delightful.' },
    { n: 'MoMA', cat: 'do', lat: 40.76139, lng: -73.97750, note: 'Midtown · Ten minutes from the Pierre. Go early.' },
    { n: 'Storm King Art Center', cat: 'do', lat: 41.39944, lng: -74.05472, note: 'Hudson Valley · 500 acres of monumental sculpture upstate. A whole day, and worth it.' },
    { n: 'David Zwirner', cat: 'do', lat: 40.74620, lng: -74.00580, note: 'Chelsea · Anchor of the Chelsea gallery walk. Free.' },
    { n: 'Gagosian', cat: 'do', lat: 40.74830, lng: -74.00430, note: 'Chelsea · Blue-chip, always a show worth seeing.' },
    { n: 'Hauser & Wirth', cat: 'do', lat: 40.74690, lng: -74.00500, note: 'Chelsea · Big, ambitious shows in a former warehouse.' },
    { n: 'kurimanzutto', cat: 'do', lat: 40.74640, lng: -74.00570, note: 'Chelsea · Mexico City gallery\'s New York space.' },
    { n: 'The High Line', cat: 'do', lat: 40.73990, lng: -74.00650, note: 'Meatpacking · Walk it into the galleries — they\'re all right there.' },
    { n: 'Little Island', cat: 'do', lat: 40.73806, lng: -74.01083, note: 'Meatpacking · The park on tulips in the Hudson. Free, strange, lovely.' },
    { n: 'The Edge', cat: 'do', lat: 40.75380, lng: -74.00210, note: 'Hudson Yards · Glass floor, 100 storeys up. Do it at sunset.' },
    { n: 'Chelsea Piers Golf Club', cat: 'do', lat: 40.74610, lng: -74.00790, note: 'Chelsea · Four-tier driving range over the Hudson. Absurd and great.' },
    { n: 'The Ramble', cat: 'do', lat: 40.77842, lng: -73.97137, note: 'Central Park · The wild wooded part of the park. Get lost on purpose.' },
    { n: 'Madison Square Park', cat: 'do', lat: 40.74167, lng: -73.98806, note: 'Flatiron · Shake Shack\'s original, plus whatever sculpture is up.' },
    { n: 'Union Square Greenmarket', cat: 'do', lat: 40.73620, lng: -73.99060, note: 'Union Square · Mon/Wed/Fri/Sat. The best browsing in the city.' },
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

  var markerIndex = {};

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
      markerIndex[p.n] = m;
    });
  }

  // Hovering a card in the recs list nudges the map to that pin.
  document.addEventListener('sj:focus', function (e) {
    var d = e.detail || {}; if (typeof d.lat !== 'number') return;
    var mk = markerIndex[d.name];
    if (mk && mk.openPopup) { map.panTo([d.lat, d.lng], { animate:true, duration:.4 }); mk.openPopup(); }
    else { map.panTo([d.lat, d.lng], { animate:true, duration:.4 }); }
  });
})();
