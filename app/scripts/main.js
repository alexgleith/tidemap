const 	server = "http://wms-master.tidetech.org",
	    owsurl = server + '/geoserver/ows',
	    tt_att = 'data &copy TideTech';

$("#full-extent-btn").click(function() {
	map.fitBounds(boroughs.getBounds());
	$(".navbar-collapse.in").collapse("hide");
	return false;
});

$("#list-btn").click(function() {
	$('#sidebar').toggle();
	map.invalidateSize();
	return false;
});

$("#sidebar-hide-btn").click(function() {
	$('#sidebar').hide();
	map.invalidateSize();
});

$("#login-btn").click(function() {
	$("#loginModal").modal("show");
	$(".navbar-collapse.in").collapse("hide");
	return false;
});

//Do the map thing!
var gray = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'basemap: Esri, HERE, DeLorme, MapmyIndia, &copy OpenStreetMap contributors, and the GIS user community'
});

var oceans = L.tileLayer('http://server.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'basemap: Esri, DeLorme, GEBCO, NOAA NGDC, and other contributors'
});

var imagery = L.tileLayer('http://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'basemap &copy: 2013 ESRI, i-cubed, GeoEye'
});

var baseMaps = {
    "Grayscale": gray,
    "Oceans": oceans,
    "Imagery": imagery
};

var center = new L.LatLng(20.38582, 29.35546),
	startZoom = 3;

var map = L.map("map", {
	zoom: startZoom,
	center: center,
	layers: [gray],
	zoomControl: true,
	attributionControl: false
});

//Locate control
var lc = L.control.locate({
    locateOptions: {
        maxZoom: 8,
        follow: true
    }
}).addTo(map);
map.on('dragstart', lc._stopFollowing, lc);

//Layer control
L.control.layers(baseMaps, {}).addTo(map);

//Google Places Autocomplete
var input = /** @type {!HTMLInputElement} */(
    document.getElementById('searchbox'));
var autocomplete = new google.maps.places.Autocomplete(input);
autocomplete.addListener('place_changed', function() {
	var place = autocomplete.getPlace();

	// If the place has a geometry, then present it on a map.
	if (place.geometry.viewport) {
		var b = place.geometry.viewport.toJSON();
		var southWest = L.latLng(b.south, b.west),
		    northEast = L.latLng(b.north, b.east),
		    bounds = L.latLngBounds(southWest, northEast);
		map.fitBounds(bounds);
	} else {
		//it's just a point, guess the zoom level.
		var lng = place.geometry.location.lng(),
			lat = place.geometry.location.lat();
		map.setView([lat, lng], 12);
	}
});

//Do the mappy stuff part two. Find some layers and map them.
var currentLayer = "tidetech:air_temperature_degC";
var currentLayerTitle = "Air Temperature (Celcius)";


var clickMarker = new L.marker();
var clickLatLon = new L.latLng();

function handleJson(data) {
    var text = '<div class="table-responsive"><table class="table table-condensed">',
    	u = null,
    	v = null;
	text = text + '<tr><th>Attribute</th><th>Value</th></tr>'
    var thisFeatureProperties = data.features[0].properties;
    for (var i = data.features.length - 1; i >= 0; i--) {
        thisFeatureProperties = data.features[i].properties;
        Object.keys(thisFeatureProperties).forEach(function(key,index) {
            if (key === 'u') {
                u = thisFeatureProperties[key];
            } else if (key === 'v') {
                v = thisFeatureProperties[key];
            } else {
                text = text + "<tr><td>" + key.split(':')[0] + "</td><td>" + thisFeatureProperties[key].toFixed(2) + '</td>';
            }
        });
    };
    if(u && v) {
        var dir_rads = Math.atan2(u,v);
        if(dir_rads < 0) {dir_rads = dir_rads + (2 * Math.PI);}
        dir_deg = dir_rads * (180/Math.PI)

        text = text + "<b>direction:</b> " + dir_deg.toFixed(0) + '<br>';
    }
    text = text + '</table></div>'
    
    var newMarker = new L.marker(clickLatLon).addTo(map).bindPopup(text).openPopup();
    if (clickMarker) {
        map.removeLayer(clickMarker);
    };
    clickMarker = newMarker;
}

function updateMarker() {
	if (clickMarker) {
        map.removeLayer(clickMarker);
    };
	var	lng = clickLatLon.lng,
    	lat = clickLatLon.lat;
    
    if (typeof lng == 'undefined') {
    	return;
    }

    var parameters = {
        service : 'WMS',
        version : '1.1.1',
        request : 'GetFeatureInfo',
        layers : currentLayer,
        query_layers : currentLayer,
        feature_count : 10,
        info_format : 'text/javascript',
        format_options : 'callback:getJson',
        SrsName : 'EPSG:4326',
        width: 101,
        height: 101,
        x: 50,
        y: 50,
        bbox: (lng - 0.1) + "," + (lat - 0.1) + "," + (lng + 0.1) + "," + (lat + 0.1),
        time: overlay.wmsParams.time
    };
    var url = owsurl + L.Util.getParamString(parameters)
    //console.log(url);
    $.ajax({
        url : owsurl + L.Util.getParamString(parameters),
        dataType : 'jsonp',
        jsonpCallback : 'getJson',
        success : function(data) {
            handleJson(data);
        }
    });
}

map.on('click', function(e) {
    if (clickMarker) {
        map.removeLayer(clickMarker);
    };
    
    clickLatLon = e.latlng;

    updateMarker()
});

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

Date.prototype.addDays = function(days) {
    var dat = new Date();
    dat.setDate(dat.getDate() + days);
    return dat;
}

var today = new Date();
var dd = today.getDate();
var mm = today.getMonth()+1;
var yyyy = today.getFullYear();


var later = today.addDays(14);
var dd2 = later.getDate();
var mm2 = later.getMonth()+1;
var yyyy2 = later.getFullYear();

var startTime = yyyy+'-'+pad(mm,2)+'-'+pad(dd,2)+'T18:00:00.000';
var endTime = yyyy2+'-'+pad(mm2,2)+'-'+pad(dd2,2)+'T18:00:00.000';
var timeStep = 60*60*6;

var overlay = L.WMS.overlay(owsurl, {
    'layers': currentLayer,
    'transparent': true,
    'opacity': 0.4
});
overlay.addTo(map);

//Initialize the SliderControl with the WMS layer, a start time, an end time, and time step
var sliderControl = L.control.sliderControl({
	position: 'bottomright', 
	layer: overlay, 
	startTime: startTime, 
	endTime: endTime, 
	timeStep: timeStep
});

// Add the slider to the map
map.addControl(sliderControl, clickMarker);

// Start the slider
sliderControl.startSlider();

/*
$.ajax({
  type: "GET",
  url: owsurl + "?SERVICE=WMS&request=getcapabilities",
  dataType: "xml",
  success: parseXml
});

function parseXml(xml) {
  var layerIndex = 0
  $(xml).find("Layer").find("Layer").each(function() {
    var title = $(this).find("Title").first().text();
    var name = $(this).find("Name").first().text();
    if(name === 'tidetech:air_temperature') {
      var time = $(this).find("Dimension");
      console.log(time.text());
    }
    //Check for layer groups
    var patt = new RegExp("Group");
    var res = patt.test(title);
    if(!res) {
      featureLayers.push(name)
      featureLayersName.push(title)
    }
  });
}
*/


