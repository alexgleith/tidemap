const 	server = "http://wms-master.tidetech.org",
	    owsurl = server + '/geoserver/tidetech/ows',
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
	attributionControl: false,
    timeDimension: true,
    timeDimensionControl: false,
    timeDimensionControlOptions: {
        autoPlay: false,
        loopButton: true,
        timeSteps: 1,
        playReverseButton: false,
        limitSliders: true,
        playerOptions: {
            buffer: 3,
            transitionTime: 250,
            loop: true,
        }
    },
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
var timeControl,
	overlay,
	timeOverlay,
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
        var dir_deg = dir_rads * (180/Math.PI)

        text = text + "<tr><td>direction</td><td>" + dir_deg.toFixed(0) + '</td>';
    }
    text = text + '</table></div>'
    
    //var newMarker = new L.marker(clickLatLng).addTo(map).bindPopup(text).openPopup();
    if (clickMarker && clickMarker.getLatLng().equals(clickLatLng)) {
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
    	var time = new Date(map.timeDimension.getCurrentTime())
    	parameters.time = time.toISOString();
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

map.timeDimension.on('timeload', function(e) {
	updateMarker();
});

map.on('movestart', function(e) {
	if(supportsTime) {
		timeControl._player.pause();
	}
});

map.on('moveend', function(e) {
	if(supportsTime) {
		timeControl._player.continue();
	}
})
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
	supportsTime = false;
	var dataProduct = dataProducts[dataProductID.split('|')[1]];
	currentLayer = dataProduct.name;

	//Remove the existing items
	if(overlay) {
		map.removeLayer(overlay);
		overlay = null;
	}
	if(timeOverlay) {
		map.removeLayer(timeOverlay);
		timeOverlay = null;
	}
	if(clickMarker) {
		map.removeLayer(clickMarker);
	}
	try {
		map.removeControl(timeControl);
	} catch (e) {
		//do nothing
	}

	overlay = new L.NonTiledLayer.WMS(owsurl, {
        opacity: 0.4,
        layers: currentLayer,
        format: 'image/png',
        transparent: true,
        attribution: tt_att
    });

	//Check if we've got to do time, and if so, work it out
	var timeSteps = dataProduct.time;

	if(timeSteps.length > 1) {
		supportsTime = true;
		var timeStepsForMap = [];
		for (var i = timeSteps.length - 1; i >= 0; i--) {
			var oneStep = new Date(timeSteps[i].split('/')[0]).getTime();
			timeStepsForMap.push(oneStep);
		}

		map.timeDimension.setAvailableTimes(timeStepsForMap,'replace');

		timeControl = L.control.timeDimension().addTo(map);

		timeOverlay = L.timeDimension.layer.wms(overlay, {
		}).addTo(map);
	} else {
		overlay.addTo(map);
	}
}