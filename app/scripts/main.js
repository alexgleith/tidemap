const 	defaultServer = "http://wms.tidetech.org",
	    tt_att = 'data &copy TideTech',
        ignoreValues = ['u' ,'v' ,'U_GRD' ,'V_GRD' , 'UGRDPW', 'VGRDPW', 'UGRDWV', 'VGRDWV', "UGRDSWELL", 'VGRDSWELL'],
        noDataValues = ["-1.00", "-32768.00", "-8.999999873090293e+33"],
        defaultWorkspace = 'tidetech';

var initialLayer = getParameterByName('layer'),
    initialBaseLayer = getParameterByName('baseLayer'),
    initialWorkspace = getParameterByName('workspace'),
    initialServer = getParameterByName('server');
 
var server, owsurl, workspace;

if(initialServer) {
    server = initialServer;
} else {
    server = defaultServer;
}
if(initialWorkspace) {
    workspace = initialWorkspace;
} else {
    workspace = defaultWorkspace;
}

owsurl = server + "/geoserver/"+workspace+"/ows";

var opacity = 1.0;

//A bunch of variables for map stuff.
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
  var text = "";
  if(currentLayerID) {
    text += "<b>" + dataProducts[currentLayerID].title + 
    "</b><br><img src="+owsurl+"?service=wms&request=getlegendgraphic&layer=" + 
    dataProducts[currentLayerID].name + "&format=image/png&LEGEND_OPTIONS=forceLabels:on;fontAntiAliasing:true onError=\"this.parentNode.removeChild(this)\"><br>";
  }
  text += "<p>Note that some layers do not currently have a legend.</p>"
  $("#legend").html(text);
  $('#legendModal').modal('show');
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

$("#searchclear").click(function(){
    $("#layerfilter").val('');
    $('.searchable tr').show();
});

$(document).on("click", ".feature-row", function(e) {
    $(this).addClass('info').siblings().removeClass('info');
    loadDataProduct($(this).attr('id'));
    var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    if (width < 800) {
        $('#sidebar').hide();
        map.invalidateSize();
    }
});

//Document events
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

var mapboxToken = 'pk.eyJ1IjoidGlkZXRlY2giLCJhIjoiY2lsbjA2YjJiMDA1ZnVobTF0anV3ZG95MSJ9.srurUP-3MjppGVxp5UlySQ';
var oldToken = 'pk.eyJ1IjoidGlkZXRlY2giLCJhIjoiY2lsbXZjeWFlNjhjZXZmbWNyNHFnazJ3NyJ9.9K9rfFi1YkKjH3k6-XViyg';

var topographic = L.tileLayer('https://api.mapbox.com/styles/v1/tidetech/cilmwyp07001i9klyi7lcskzp/tiles/{z}/{x}/{y}?access_token='+mapboxToken, {
    attribution: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    tileSize: 512,
    zoomOffset: -1,
    noWrap: true 
});

var imagery = L.tileLayer('https://a.tiles.mapbox.com/v4/tidetech.4a953c78/{z}/{x}/{y}.png?access_token='+oldToken, {
    attribution: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    noWrap: true
});
/*
var gray = L.tileLayer('https://api.mapbox.com/styles/v1/tidetech/ciln08d8d002u9nkukp904hog/tiles/{z}/{x}/{y}?access_token='+mapboxToken, {
    attribution: '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> © <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    tileSize: 512,
    zoomOffset: -1,
    noWrap: true 
});
var other1 = L.tileLayer('https://a.tiles.mapbox.com/v3/polestar.map-60sz3p1x/{z}/{x}/{y}.png', {
    attribution: 'basemap &copy: 2013 ESRI, i-cubed, GeoEye',
    noWrap: true
});
var other2 = L.tileLayer('https://a.tiles.mapbox.com/v3/polestar.map-lap35hvn/{z}/{x}/{y}.png', {
    attribution: 'basemap &copy: 2013 ESRI, i-cubed, GeoEye',
    noWrap: true
});
var other3 = L.tileLayer('https://a.tiles.mapbox.com/v3/polestar.map-0c8lhnhe/{z}/{x}/{y}.png', {
    attribution: 'basemap &copy: 2013 ESRI, i-cubed, GeoEye',
    noWrap: true
});
*/
var baseMaps = {
    "Imagery": imagery,
    "Topographic": topographic/*,
    "Gray": gray,
    "mapbox1": other1,
    "mapbox2": other2,
    "mapbox3": other3,*/
};

var center = new L.LatLng(20.38582, 29.35546),
	startZoom = 3,
    p1 = L.latLng(74.01954, 142.38281),
    p2 = L.latLng(-57.61010, -83.67185),
    initialBounds = L.latLngBounds(p1, p2),
    mapBounds = L.latLngBounds(L.latLng(-80,-180),L.latLng(80,180));

if(!initialBaseLayer) {
    initialBaseLayer = "Topographic";
};

var map = L.map("map", {
	layers: baseMaps[initialBaseLayer],
    maxBounds: mapBounds,
    maxBoundsViscosity: 0.5,
	zoomControl: true,
	attributionControl: false,
    timeDimension: true,
    timeDimensionControlOptions: {
        autoPlay: false,
        timeSteps: 1,
        playReverseButton: false,
        playButton: false,
        loopButton: false,
        displayDate: true,
        timeSlider: true,
        limitSliders: false,
        limitMinimumRange: 5,
        speedSlider: false,
        playerOptions: {
            transitionTime: 500,
            buffer: 5,
            minBufferReady: 1,
            loop: true
        }
    },
    timeDimensionControl: true
}).on('load', function(e) {
    //Get our list of layers ready once the map is finished being built.
    $.ajax({
        type: "GET",
        url: owsurl + "?SERVICE=WMS&request=getcapabilities",
        dataType: "xml",
        success: parseXml
    });
});
map.setView(center, startZoom).spin(true);

//Locate control
var lc = L.control.locate({
    locateOptions: {
        maxZoom: 8,
        follow: false
    }
}).addTo(map);

//Layer control
L.control.layers(baseMaps, {}, {collapsed: false}).addTo(map);

//Event responses.
map.on('click', function(e) {
    if(currentLayer) {
        clickLatLng = e.latlng;
        updateMarker();
    }
});

map.timeDimension.on('timeload', function(e) {
	updateMarker();
});

map.on('baselayerchange', function(e) {
    setParameter('baseLayer', e.name);
})

//A bunch of functions
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

function handleJson(data) {
    if(!data || data.features.length < 1){
        return;
    }
    var text = '<div class="table-responsive"><table class="table table-condensed">';
    //text = text + '<tr><th>Attribute</th><th>Value</th></tr>'
    var thisFeatureProperties = data.features[0].properties;
    for (var i = data.features.length - 1; i >= 0; i--) {
        thisFeatureProperties = data.features[i].properties;
        Object.keys(thisFeatureProperties).forEach(function(key,index) {
            var ignore = $.inArray(key, ignoreValues);
            if(ignore === -1) {
                var value = thisFeatureProperties[key].toFixed(2);
                var ignore = $.inArray(value, noDataValues);
                if(ignore !== -1) {
                    //Clear out the nodata values.
                    value = "";
                }
                text = text + "<tr><td>" + key.split(':')[0] + "</td><td>" + value + '</td>';
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
        clickMarker = new L.marker(clickLatLng, {draggable: true}).addTo(map).bindPopup(text).openPopup();
        clickMarker.on("drag", function(e) {
            clickLatLng = e.target.getLatLng();
            updateMarker();
            clickMarker.openPopup();
        });
        clickMarker.on("dragend", function(e) {
            clickLatLng = e.target.getLatLng();
            updateMarker();
            clickMarker.openPopup();
        });
    }
}

function updateMarker() {
    if(!overlay || !clickLatLng){
        return;
    }
    var lng = clickLatLng.lng,
        lat = clickLatLng.lat;
    
    if (typeof lng == 'undefined') {
        return;
    }
    //If the marker is out of the current map bounds, remove the marker and stop.
    if(clickLatLng && !map.getBounds().contains(clickLatLng)) {
        map.removeLayer(clickMarker);
        clickMarker = null;
        clickLatLng = null;
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

function buildListOfData() {
    dataProducts.sort(function(a, b) {
        var textA = a.title.toUpperCase();
        var textB = b.title.toUpperCase();
        return (textA > textB) ? -1 : (textA < textB) ? 1 : 0;
    });
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
    //Finish spinning.
    map.spin(false);
    //Check for initial layer, and if requested, load it.
    if(initialLayer) {
        for (var i = dataProducts.length - 1; i >= 0; i--) {
            if(dataProducts[i].name === initialLayer) {
                loadDataProduct(i);
                $('#'+i).addClass('info');
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
    /*try {
        timeControl._player.stop();
        map.removeControl(timeControl);
    } catch (e) {
        //do nothing
    }*/
    if(clickMarker) {
        map.removeLayer(clickMarker);
        clickMarker = null;
        clickLatLng = null;
    }
	if(overlay) {
		map.removeLayer(overlay);
		overlay = null;
	}
	if(timeOverlay) {
		map.removeLayer(timeOverlay);
		timeOverlay = null;
	}

	overlay = new L.NonTiledLayer.WMS(owsurl, {
        opacity: opacity,
        layers: currentLayer,
        format: 'image/png',
        transparent: true,
        attribution: tt_att,
        noWrap: true
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
        map.timeDimension.setCurrentTimeIndex(0)
        /*
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
        */

		timeOverlay = L.timeDimension.layer.wms(overlay, {}).addTo(map);
	} else {
        map.timeDimension.setAvailableTimes([],'replace');
        map.timeDimension.setCurrentTimeIndex(0)
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