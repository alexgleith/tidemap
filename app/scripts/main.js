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
var overlay,
    timeOverlay,
    supportsTime = false,
    dataProducts = [],
    dataTable = [],
    currentBounds = initialBounds,
    currentLayer = null,
    currentLayerID = null,
    clickMarker = null,
    clickLatLng = null;

//Leaflet images config:
L.Icon.Default.imagePath = './scripts/images'

//Starting configuration.
var center = new L.LatLng(20.38582, 29.35546),
    startZoom = 3,
    p1 = L.latLng(74.01954, 142.38281),
    p2 = L.latLng(-57.61010, -83.67185),
    initialBounds = L.latLngBounds(p1, p2),
    mapBounds = L.latLngBounds(L.latLng(-80,-185),L.latLng(80,185));

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

$("#drop-pin-btn").click(function() {
    markerButtonClicked();
    return false;
});
$("#other-drop-pin-btn").click(function() {
    markerButtonClicked();
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
    loadDataProduct($(this).attr('data-uniqueid'));
    var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    if (width < 800) {
        $('#sidebar').hide();
        map.invalidateSize();
    }
});

$(document).on("click", ".detail-icon", function(e) {
    e.stopPropagation();
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

var cmap = L.tileLayer.wms("https://wms-2.lrit.com/cmapwms/map.cnx", {
    layers: 'MAINMAP',
    format: 'image/png',
    transparent: true,
    attribution: "Basemap © Pole Star"
});

var baseMaps = {
    "Imagery": imagery,
    "Topographic": topographic,
    "C-Map": cmap
};

if(!initialBaseLayer) {
    initialBaseLayer = "Imagery";
};

var map = L.map("map", {
	layers: baseMaps[initialBaseLayer],
    maxBounds: mapBounds,
    maxBoundsViscosity: 0.5,
    maxZoom: 15,
	zoomControl: true,
	attributionControl: false,
    timeDimension: true,
    timeDimensionOptions: {
        loadingTimeout: 5000
    },
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

//------------------//
//A bunch of functions
//------------------//

//Table functions
function rowStyle(row, index) {
    return {
        classes: 'feature-row'
    }
}
function detailFormatter(index, row) {
    var html = [];
    return '<p>' + row.abstract + '</p>';
}

//Update the marker
function markerButtonClicked() {
    if(!clickMarker && currentLayerID) {
        clickLatLng = map.getCenter();
        updateMarker();
    } else if(clickMarker) {
        map.removeLayer(clickMarker);
        clickMarker = null;
        clickLatLng = null;
    }
}

//URL Parameter functions
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

//Eat up the JSON returned by WMS request
function handleJson(data) {
    if(!data || data.features.length < 1){
        return;
    }
    var lat = clickLatLng.lat.toString(),
        lon = clickLatLng.lng.toString(),
        lat_d = lat.split('.')[0],
        lon_d = lon.split('.')[0],
        lat_m = (parseFloat('0.'+lat.split('.')[1])*60).toFixed(3).toString(),
        lon_m = (parseFloat('0.'+lon.split('.')[1])*60).toFixed(3).toString(),
        lat_text = 'n',
        lon_text = 'e';
    if(lat_d.charAt(0) === '-') {
        lat_d = lat_d.slice(1);
        lat_text = 's';
    }
    if(lon_d.charAt(0) === '-') {
        lon_d = lon_d.slice(1);
        lon_text = 'w';
    }
    //make all these things the right length
    lat_m = String("00" + lat_m).slice(-6);
    lon_m = String("00" + lon_m).slice(-6);
    var lat_string = lat_d + '\xB0 ' + lat_m + '\' ' + lat_text,
        lon_string = lon_d + '\xB0 ' + lon_m + '\' ' + lon_text;

    var text = '<div class="table-responsive"><table class="table table-condensed ">';
    //text = text + '<tr><th>Attribute</th><th>Value</th></tr>'
    text += '<tr><td>Latitude</td><td class="pull-right">' + lat_string + '</td>';
    text += '<tr><td>Longitude</td><td class="pull-right">'+ lon_string + '</td>';

    //remove duplicate attrbutes, happens with layer groups
    var foundAttributes = [];
    var thisFeatureProperties = data.features[0].properties;
    for (var i = data.features.length - 1; i >= 0; i--) {
        thisFeatureProperties = data.features[i].properties;
        Object.keys(thisFeatureProperties).forEach(function(key,index) {
            var ignore1 = $.inArray(key, ignoreValues);
            var ignore2 = $.inArray(key, foundAttributes);
            if(ignore1 === -1 && ignore2 === -1) {
                foundAttributes.push(key);
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
        clickMarker = new L.marker(clickLatLng, {title: "Drag me", draggable: true}).addTo(map).bindPopup(text).openPopup();
        clickMarker.lastMove = 0;
        clickMarker.on("drag", function(e) {
            clickLatLng = e.target.getLatLng();
            if(Date.now() - clickMarker.lastMove > 350) {
                // Update with a AJAX request
                clickMarker.lastMove = Date.now();
                updateMarker();
                clickMarker.openPopup();
            }
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
        format_options : 'callback:handleJson',
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
        success : function(data) {
            handleJson(data);
        }
    });
}

function filterDataProductsInGroup() {
    var allSubLayers = [];
    //Identify all the subLayers (layers that are below a layergroup)
    for (var i = dataProducts.length - 1; i >= 0; i--) {
        var item = dataProducts[i];
        if(item.subLayerNames.length > 0) {
            for (var j = item.subLayerNames.length - 1; j >= 0; j--) {
                allSubLayers.push(item.subLayerNames[j]);
            }
        }
    }
    //Remove all the sub-layers from the dataProducts list
    for (var i = allSubLayers.length - 1; i >= 0; i--) {
        var subLayerName = allSubLayers[i];
        for (var j = dataProducts.length - 1; j >= 0; j--) {
            if(dataProducts[j].name === subLayerName) {
                dataProducts.splice(j, 1);
            }
        }
    }
}

function parseXml(xml) {
 	$(xml).find("Layer").find("Layer").each(function() {
		var thisDataProduct = {};
	    var title = $(this).find("Title").first().text();
        title = title.replace(/_/g, ' ');
        var abstract = $(this).find("Abstract").first().text();
        if(!abstract) {abstract = 'No abstract available.';}
	    var name = $(this).find("Name").first().text();
        var west = $(this).find("westBoundLongitude").text(),
            east = $(this).find("eastBoundLongitude").text(),
            south = $(this).find("southBoundLatitude").text(),
            north = $(this).find("northBoundLatitude").text();

        var time = $(this).find("Dimension").text().split(',');
        var group = "Other";
        $(this).find("KeywordList").find("Keyword").each(function() {
            var keyWord = $(this).text();
            var keyWordSplit = keyWord.split(':');
            if(keyWordSplit[0] === 'group') {
                group = keyWordSplit[1].trim();
            }
        });
        var subLayerNames = [];

        //Handle sublayers
        $(this).find("Layer").each(function() {
            //Add time from sublayers
            time = $(this).find("Dimension").text().split(',');
            //Add group from sublayers
            $(this).find("KeywordList").find("Keyword").each(function() {
                var keyWord = $(this).text();
                var keyWordSplit = keyWord.split(':');
                if(keyWordSplit[0] === 'group') {
                    group = keyWordSplit[1];
                }
            });
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
        thisDataProduct.abstract = abstract;
        thisDataProduct.group = group;

	    dataProducts.push(thisDataProduct);
  	});

    //Filter out layers that are in a group.
    filterDataProductsInGroup();

    var dataTable = [];
    //Now add in a uniqueID for each data product.
    for (var i = 0; i < dataProducts.length; i++) {
        var dp = dataProducts[i];
        var dtp = {
            dataid: i,
            group: dp.group,
            title: dp.title,
            abstract: dp.abstract
        };
        dataTable.push(dtp);
    }
    //Set up the table
    $('#layer-list').bootstrapTable({
        data: dataTable
    });
    //Finish spinning.
    map.spin(false);
    //Check for initial layer, and if requested, load it.
    if(initialLayer) {
        for (var i = dataProducts.length - 1; i >= 0; i--) {
            if(dataProducts[i].name === initialLayer) {
                loadDataProduct(i);
                $('#layer-list').find("tr[data-uniqueid="+i+"]").addClass('info')
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
        format: 'image/png8',
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
    } else {
        //We've got a global layer, so if we're zoomed in close, zoom out a bit
        var curZoom = map.getZoom();
        if(curZoom > 7) {
            map.setZoom(6);
        }
    }
    //and set the URL
    setParameter('layer',dataProduct.name)
}