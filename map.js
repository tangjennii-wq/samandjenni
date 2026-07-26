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
    { n: 'Chinese Tuxedo',        cat: 'venue', lat: 40.71467, lng: -73.99772, note: 'Friday · the welcome party', url: 'https://www.google.com/maps/search/?api=1&query=Chinese+Tuxedo+5+Doyers+St+New+York' },
    { n: 'Lotte New York Palace', cat: 'hotel', lat: 40.75802, lng: -73.97573, note: 'Biggest rooms · ~15 min to the Pierre', url: 'https://www.lottenypalace.com/wedding-stories/tang--shleifer-wedding' },
    { n: 'Thompson Central Park', cat: 'hotel', lat: 40.76428, lng: -73.97869, note: 'Modern · steps from the park', url: 'https://www.hyatt.com/events/en-US/group-booking/LGATP/G-3TSW' },
    { n: 'Le Méridien Central Park', cat: 'hotel', lat: 40.76447, lng: -73.97815, note: 'Friendly price · ~12 min walk to the Pierre', url: 'https://www.marriott.com/event-reservations/reservation-link.mi?id=1780579014068&key=GRP&app=resvlink' },
    { n: 'Balthazar',             cat: 'eat', lat: 40.72264, lng: -73.99818, note: 'SoHo · the French brasserie we keep coming back to' },
    { n: 'Gramercy Tavern',       cat: 'eat', lat: 40.73857, lng: -73.98844, note: 'Flatiron · the special-occasion one' },
    { n: 'The Odeon',             cat: 'eat', lat: 40.71657, lng: -74.00863, note: 'Tribeca · old New York, still cool' },
    { n: 'Central Park',          cat: 'do', lat: 40.77890, lng: -73.96925, note: 'The Pierre sits right on it' },
    { n: 'The Met',               cat: 'do', lat: 40.77942, lng: -73.96326, note: 'Ten minutes up Fifth from the hotel' }
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
    var zoom   = mode === 'hotels' ? 14 : 12;

    var map = L.map('sjmap', { scrollWheelZoom:false, zoomControl:true }).setView(center, zoom);
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
    var pins = L.layerGroup().addTo(map);
    var hoodGeo = null;         // reference so we can fade/restore
    var subwayOn = false;
    var STATION_ZOOM = 15;      // stations only appear once zoomed in

    drawPins(map, pins);

    // Layer control starts with only Places; each data layer is added ONLY once
    // its GeoJSON actually loads with features — so a toggle never appears (or
    // fades neighborhoods) over empty data.
    var ctl = L.control.layers(null, { 'Places': pins }, { collapsed:false, position:'topright' }).addTo(map);

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
        }
      }).addTo(subway);
      ctl.addOverlay(subway, 'Subway lines');
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

    // Fade neighborhoods + manage stations when subway toggles.
    map.on('overlayadd', function(e){ if(e.name === 'Subway lines'){ subwayOn = true; styleHoods(); updateStations(); } });
    map.on('overlayremove', function(e){ if(e.name === 'Subway lines'){ subwayOn = false; styleHoods(); updateStations(); } });

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

  function drawPins(map, group){
    PLACES.forEach(function(p){
      var color = (CAT[p.cat]||CAT.do).color;
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
