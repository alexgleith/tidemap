const 	defaultServer = "http://wms.tidetech.org",
	    tt_att = 'data &copy TideTech',
        ignoreValues = ['u','v','U_GRD','V_GRD', 'UGRDWV', 'VGRDWV'];

var initialLayer = getParameterByName('layer'),
    initialBaseLayer = getParameterByName('baseLayer'),
    initialServer = getParameterByName('server');
 

var server, owsurl;

if(initialServer) {
    server = initialServer;
} else {
    server = defaultServer;
}
owsurl = server + "/geoserver/tidetech/ows";

var opacity = 1.0;

//Get out list of layers really early.
$.ajax({
    type: "GET",
    url: owsurl + "?SERVICE=WMS&request=getcapabilities",
    dataType: "xml",
    success: parseXml
});

//Leaflet images config:
L.Icon.Default.imagePath = './scripts/images'

$("#full-extent-btn").click(function() {
  $(".navbar-collapse.in").collapse("hide");
	map.fitBounds(currentBounds);
	return false;
});

$("#list-btn").click(function() {
	$('#sidebar').toggle();
	map.invalidateSize();
	return false;
});

$("#sidebar-hide-btn").click(function() {
  $(".navbar-collapse.in").collapse("hide");
    $('#sidebar').hide();
	map.invalidateSize();
});

$("#login-btn").click(function() {
  $(".navbar-collapse.in").collapse("hide");
	$("#loginModal").modal("show");
	return false;
});

$("#settings-btn").click(function() {
  $(".navbar-collapse.in").collapse("hide");
    $("#settingsModal").modal("show");
    return false;
});

$("#about-btn").click(function() {
  $(".navbar-collapse.in").collapse("hide");
	$("#aboutModal").modal("show");
	return false;
});

$("#legend-btn").click(function() {
  $(".navbar-collapse.in").collapse("hide");
    $("#legendModal").modal("show");
    return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

$("#sidebar-toggle-btn").click(function() {
  $("#sidebar").toggle();
  map.invalidateSize();
  return false;
});

$(document).on("click", ".feature-row", function(e) {
	loadDataProduct($(this).attr('id'));
});

//Searching for layers
$(document).ready(function () {
    (function ($) {
        $("a#opacityChange").on('click', function(e) {
            opacity = e.target.text;
            $("#opacityMenu").text(opacity);
            if(supportsTime) {
                if(timeOverlay) {timeOverlay.setOpacity(opacity);};
            } else {
                if(overlay) {overlay.setOpacity(opacity);};
            }
            return false;
        });
        $('#layerfilter').keyup(function () {
            var rex = new RegExp($(this).val(), 'i');
            $('.searchable tr').hide();
            $('.searchable tr').filter(function () {
                return rex.test($(this).text());
            }).show();
        });
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
	startZoom = 3,
    p1 = L.latLng(74.01954, 142.38281),
    p2 = L.latLng(-57.61010, -83.67185),
    initialBounds = L.latLngBounds(p1, p2);

if(!initialBaseLayer) {
    initialBaseLayer = "Grayscale";
};

var map = L.map("map", {
	zoom: startZoom,
	center: center,
	layers: baseMaps[initialBaseLayer],
	zoomControl: true,
	attributionControl: false,
    timeDimension: true,
    timeDimensionControl: false
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
var input = (
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

//get and set URL parameters
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
function setParameter(paramName, paramValue) {
    var url = window.location.href;
    var hash = location.hash;
    url = url.replace(hash, '');
    if (url.indexOf(paramName + "=") >= 0)
    {
        var prefix = url.substring(0, url.indexOf(paramName));
        var suffix = url.substring(url.indexOf(paramName));
        suffix = suffix.substring(suffix.indexOf("=") + 1);
        suffix = (suffix.indexOf("&") >= 0) ? suffix.substring(suffix.indexOf("&")) : "";
        url = prefix + paramName + "=" + paramValue + suffix;
    }
    else
    {
    if (url.indexOf("?") < 0)
        url += "?" + paramName + "=" + paramValue;
    else
        url += "&" + paramName + "=" + paramValue;
    }
    window.history.replaceState({},"", url + hash);
}

//Do the mappy stuff part two. Find some layers and map them.
var timeControl,
	overlay,
	timeOverlay,
	supportsTime = false,
	dataProducts = [],
    currentBounds = initialBounds,
	currentLayer = null,
    currentLayerID = null,
	clickMarker = null,
	clickLatLng = null;

function handleJson(data) {
	if(!data || data.features.length < 1){
		return;
	}
    var text = '<div class="table-responsive"><table class="table table-condensed">';
	text = text + '<tr><th>Attribute</th><th>Value</th></tr>'
    var thisFeatureProperties = data.features[0].properties;
    for (var i = data.features.length - 1; i >= 0; i--) {
        thisFeatureProperties = data.features[i].properties;
        Object.keys(thisFeatureProperties).forEach(function(key,index) {
            var ignore = $.inArray(key, ignoreValues);
            if(ignore === -1) {
                text = text + "<tr><td>" + key.split(':')[0] + "</td><td>" + thisFeatureProperties[key].toFixed(2) + '</td>';
            }
        });
    };
    text = text + '</table></div>'
    
    //var newMarker = new L.marker(clickLatLng).addTo(map).bindPopup(text).openPopup();
    if (clickMarker && clickMarker.getLatLng().equals(clickLatLng)) {
    	clickMarker.setPopupContent(text);
    } else {
    	if(clickMarker) {
    		map.removeLayer(clickMarker);
            clickMarker = null;
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

//Event responses.
map.on('popupclose', function(e) {
    if(clickMarker) {
        map.removeLayer(clickMarker);
    };
    if(clickLatLng) {
        clickLatLng = null;
    }
})

map.on('click', function(e) {
    clickLatLng = e.latlng;
    updateMarker()
});

map.timeDimension.on('timeload', function(e) {
	updateMarker();
});

map.on('movestart', function(e) {
	if(supportsTime) {
		timeControl._player.stop();
	}
});

map.on('moveend', function(e) {
	if(supportsTime) {
		timeControl._player.start();
	}
});

map.on('baselayerchange', function(e) {
    setParameter('baseLayer', e.name);
})

//Load all the data products
function buildListOfData() {
	for (var i = dataProducts.length - 1; i >= 0; i--) {
		var dp = dataProducts[i];
		$("#feature-list tbody").append('<tr class="feature-row" id="' + i +
			'"><td class="feature-name">' + dp.title + 
			'</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
	};
}

function filterDataProductsInGroup() {
    var allSubLayers = [];
    for (var i = dataProducts.length - 1; i >= 0; i--) {
        var item = dataProducts[i];
        if(item.subLayerNames.length > 0) {
            for (var j = item.subLayerNames.length - 1; j >= 0; j--) {
                allSubLayers.push(item.subLayerNames[j]);
            }
        }
    }
    for (var i = allSubLayers.length - 1; i >= 0; i--) {
        var subLayerName = allSubLayers[i];
        for (var j = dataProducts.length - 1; j >= 0; j--) {
            if(dataProducts[j].name === subLayerName) {
                var temp = dataProducts[j].name;
                dataProducts.splice(j, 1);
            }
        }
    }
}

function parseXml(xml) {
 	$(xml).find("Layer").find("Layer").each(function() {
		var thisDataProduct = {};
	    var title = $(this).find("Title").first().text();
	    var name = $(this).find("Name").first().text();
        var west = $(this).find("westBoundLongitude").text(),
            east = $(this).find("eastBoundLongitude").text(),
            south = $(this).find("southBoundLatitude").text(),
            north = $(this).find("northBoundLatitude").text();

        var time = $(this).find("Dimension").text().split(',');
        var subLayerNames = [];

        //Handle sublayers
        var subLayers = $(this).find("Layer").each(function() {
            time = $(this).find("Dimension").text().split(',');
            subLayerNames.push($(this).find("Name").first().text());
        });
        thisDataProduct.subLayerNames = subLayerNames;

	    //Check for layer groups
	    var patt = new RegExp("Group");
	    var res = patt.test(title);
        var southWest = L.latLng(south, west),
            northEast = L.latLng(north, east),
            bounds = L.latLngBounds(southWest, northEast);
	    thisDataProduct.title = title;
	    thisDataProduct.name = name;
	    thisDataProduct.time = time;
        thisDataProduct.bounds = bounds;

	    dataProducts.push(thisDataProduct);
  	});
    //Filter out layers that are in a group.
    filterDataProductsInGroup();
    //Build the nice UI sidebar table list thing.
  	buildListOfData();
    //Check for initial layer, and if requested, load it.
    if(initialLayer) {
        for (var i = dataProducts.length - 1; i >= 0; i--) {
            if(dataProducts[i].name === initialLayer) {
                loadDataProduct(i);
            }
        }
    }
}

function loadDataProduct(dataProductID) {
    //Don't do anything if we've already loaded this layer
    if(currentLayerID === dataProductID) {return;}
    //Load the dataproduct details
    var dataProduct = dataProducts[dataProductID];
    //Store some variables
    supportsTime = false;
    
    currentLayerID = dataProductID;
	currentLayer = dataProduct.name;

    //Remove the existing items
    try {
        timeControl._player.stop();
        map.removeControl(timeControl);
    } catch (e) {
        //do nothing
    }
	if(overlay) {
		map.removeLayer(overlay);
		overlay = null;
	}
	if(timeOverlay) {
        map.timeDimension.unregisterSyncedLayer(timeOverlay);
		map.removeLayer(timeOverlay);
		timeOverlay = null;
	}
	if(clickMarker) {
		map.removeLayer(clickMarker);
	}

	overlay = new L.NonTiledLayer.WMS(owsurl, {
        opacity: opacity,
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

		timeControl = L.control.timeDimension({
            autoPlay: false,
            loopButton: true,
            timeSteps: 1,
            playReverseButton: false,
            limitSliders: true,
            playerOptions: {
                buffer: 25,
                transitionTime: 500,
                loop: true,
                minBufferReady: 20
            }
        }).addTo(map);

		timeOverlay = L.timeDimension.layer.wms(overlay, {}).addTo(map);
	} else {
		overlay.addTo(map);
	}

    //Finally, zoom to the area if it's small.
    currentBounds = dataProduct.bounds;
    var width = dataProduct.bounds.getEast() - dataProduct.bounds.getWest();
    if(width < 350) {
        map.fitBounds(dataProduct.bounds);
    }
    //and set the URL
    setParameter('layer',dataProduct.name)
}