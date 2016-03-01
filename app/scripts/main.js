const 	server = "http://wms.tidetech.org",
	    owsurl = server + '/geoserver/ows',
	    tt_att = 'data &copy TideTech';

//Leaflet images config:
L.Icon.Default.imagePath = './scripts/images'

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

$("#about-btn").click(function() {
	$("#aboutModal").modal("show");
	$(".navbar-collapse.in").collapse("hide");
	return false;
});

$("#legend-btn").click(function() {
	$("#legendModal").modal("show");
	$(".navbar-collapse.in").collapse("hide");
	return false;
});

$(document).on("click", ".feature-row", function(e) {
	loadDataProduct($(this).attr('id'));
});

//Searching for layers
$(document).ready(function () {
    (function ($) {
        $('#layerfilter').keyup(function () {
            var rex = new RegExp($(this).val(), 'i');
            $('.searchable tr').hide();
            $('.searchable tr').filter(function () {
                return rex.test($(this).text());
            }).show();
        })
    }(jQuery));
});
$("#searchclear").click(function(){
    $("#layerfilter").val('');
    $('.searchable tr').show();
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
L.control.layers(baseMaps, {}, {collapsed: false}).addTo(map);

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
var sliderControl,
	overlay,
	supportsTime = false,
	dataProducts = [],
	currentLayer = null,
	clickMarker = null,
	clickLatLng = null;

function handleJson(data) {
	if(!data || data.features.length < 1){
		return;
	}
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
    
    //var newMarker = new L.marker(clickLatLng).addTo(map).bindPopup(text).openPopup();
    if (clickMarker && clickMarker.getLatLng().equals(clickLatLng)) {
    	console.log(text)
    	clickMarker.setPopupContent(text);
    } else {
    	if(clickMarker) {
    		map.removeLayer(clickMarker);
    	};
    	clickMarker = new L.marker(clickLatLng).addTo(map).bindPopup(text).openPopup();
    }
}

function updateMarker() {
    if(!overlay || !clickLatLng){
    	return;
    }
	var	lng = clickLatLng.lng,
    	lat = clickLatLng.lat;
    
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
        bbox: (lng - 0.1) + "," + (lat - 0.1) + "," + (lng + 0.1) + "," + (lat + 0.1)
    };
    if(supportsTime) {
    	parameters.time = overlay.wmsParams.time;
    };
    var url = owsurl + L.Util.getParamString(parameters)
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
    clickLatLng = e.latlng;
    updateMarker()
});

//Load all the data products
function buildListOfData() {
	for (var i = dataProducts.length - 1; i >= 0; i--) {
		var dp = dataProducts[i];
		$("#feature-list tbody").append('<tr class="feature-row" id="' + dp.name + '|' + i +
			'"><td class="feature-name">' + dp.title + 
			'</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
	};
}

$.ajax({
  type: "GET",
  url: owsurl + "?SERVICE=WMS&request=getcapabilities",
  dataType: "xml",
  success: parseXml
});

function parseXml(xml) {
 	$(xml).find("Layer").find("Layer").each(function() {
		var thisDataProduct = {};
	    var title = $(this).find("Title").first().text();
	    var name = $(this).find("Name").first().text();
	  	var time = $(this).find("Dimension").text().split(',');

	    //Check for layer groups
	    var patt = new RegExp("Group");
	    var res = patt.test(title);
	    thisDataProduct.title = title;
	    thisDataProduct.name = name;
	    thisDataProduct.time = time;

	    dataProducts.push(thisDataProduct);
  	});
  	buildListOfData();
}

function loadDataProduct(dataProductID) {
	var dataProduct = dataProducts[dataProductID.split('|')[1]];
	currentLayer = dataProduct.name;

	//Remove the existing items
	if(sliderControl) {
		sliderControl.removeFrom(map);
	}
	if(overlay) {
		overlay.removeFrom(map);
	}
	if(clickMarker) {
		map.removeLayer(clickMarker);
	}

	//Add the layer to the map
	overlay = L.WMS.overlay(owsurl, {
	    'layers': dataProduct.name,
	    'transparent': true,
	    'opacity': 0.4
	}).addTo(map);

	//Check if we've got to do time, and if so, work it out
	var timeSteps = dataProduct.time;

	if(timeSteps.length > 1) {
		supportsTime = true;
		var startTime = timeSteps[0].split('/')[0],
			timeTwo = timeSteps[1].split('/')[0],
			endTime = timeSteps[timeSteps.length-1].split('/')[0],
			d1 = new Date(startTime),
	    	d2 = new Date(timeTwo),
			timeStep = (d2-d1)/1000;

		//Initialize the SliderControl with the WMS layer, a start time, an end time, and time step
		var sliderControl = L.control.sliderControl({
			position: 'bottomright', 
			layer: overlay, 
			startTime: startTime, 
			endTime: endTime, 
			timeStep: timeStep
		});

		// Add the slider to the map
		map.addControl(sliderControl);
		sliderControl.startSlider();
	}
}


