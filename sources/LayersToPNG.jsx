// This script exports photoshop layers as individual images.
// It also write a JSON file that can be imported into Spine
// where the images will be displayed in the same positions.
 
// Settings.
var ignoreHiddenLayers = true;
var saveTemplate = false;
var savePNGs = true;
var saveJSON = true;
var saveSkins = false;
var scaleFactor = 0.5;
showDialog();

function main () {
        // Output dir.
        var dir = app.activeDocument.path + "/images/";
 
        new Folder(dir).create();
 
        var name = decodeURI(app.activeDocument.name);
        name = name.substring(0, name.indexOf("."));
 
        app.activeDocument.duplicate();
 
        if (saveTemplate) {
                if (scaleFactor != 1) scaleImage();
 
                var file = new File(dir + "/template");
                if (file.exists) file.remove();
                activeDocument.saveAs(file, new PNGSaveOptions(), true, Extension.LOWERCASE);
               
                if (scaleFactor != 1) stepHistoryBack();
        }
 
        // Collect original layer visibility and hide all layers.
        var layers = [];
        var layerParents = [];
        getLayers(app.activeDocument, layers);
 
        var layerCount = layers.length;
        var layerVisibility = {};
               
        //Sort the layers so skin keys don't show multiple times.
        layers.sort(function (a, b) {
                if (a.parent.name < b.parent.name) return -1;
                if (a.parent.name > b.parent.name) return 1;
        });
 
        for (var i = layerCount - 1; i >= 0; i--) {            
                var layer = layers[i];         
                layerVisibility[layer] = layer.visible;
                layer.visible = false;                         
        }
 
        // Save JSON.
        if (saveJSON || savePNGs) {
                var skins = {}, slots = {};
                for (var i = layerCount - 1; i >= 0; i--) {
                        var layer = layers[i];
                        if (ignoreHiddenLayers && !layerVisibility[layer]) continue;
 
                        var skinName = (saveSkins && layer.parent.typename == "LayerSet") ? trim(layer.parent.name) : "default";
                        var skinLayers = skins[skinName];
                        if (!skinLayers) skins[skinName] = skinLayers = [];
                        skinLayers[skinLayers.length] = layer;
 
                        slots[trim(layer.name)] = true;
                }
 
                var json = "{\"bones\":[{\"name\":\"root\"}],\n\"slots\":[\n";
                var numSlots = sizeAssocArray(slots);
                var curSlot = 0;
                for (var slotName in slots) {
                        if (!slots.hasOwnProperty(slotName)) continue;
                        json += "\t{\"name\":\"" + slotName + "\",\"bone\":\"root\",\"attachment\":\"" + slotName + "\"}";
                        curSlot++;
                        
                        //omit final comma for well formed json
                        if(curSlot < numSlots) {
                                json += ",\n";
                        } else {
                                json += "\n";
                        }
                }
                json += "],\n\"skins\":{\n";
 
                var numSkins = sizeAssocArray(skins);
                var curSkin = 0;
                for (var skinName in skins) {
                        if (!skins.hasOwnProperty(skinName)) continue;
                        json += "\t\"" + skinName + "\":{\n";
                       
                        var skinLayers = skins[skinName];
                        var numSkinLayers = skinLayers.length;
                        var curSkinLayer = 0;
                        for (var i = skinLayers.length - 1; i >= 0; i--) {
                                var layer = skinLayers[i];
                                var placeholderName = trim(layer.name);
                                var attachmentName = skinName == "default" ? placeholderName : skinName + "/" + placeholderName;
 
                                var x = app.activeDocument.width.as("px") * scaleFactor;
                                var y = app.activeDocument.height.as("px") * scaleFactor;
 
                                layer.visible = true;
                                if (!layer.isBackgroundLayer)
                                        app.activeDocument.trim(TrimType.TRANSPARENT, false, true, true, false);
                                x -= app.activeDocument.width.as("px") * scaleFactor;
                                y -= app.activeDocument.height.as("px") * scaleFactor;
                                if (!layer.isBackgroundLayer)
                                        app.activeDocument.trim(TrimType.TRANSPARENT, true, false, false, true);
                                var width = app.activeDocument.width.as("px") * scaleFactor;
                                var height = app.activeDocument.height.as("px") * scaleFactor;
 
                                // Save image.
                                if (savePNGs) {
                                        if (scaleFactor != 1) scaleImage();
 
                                       
                                        if (skinName != "default") {
                                                var path = new Folder(dir + "/" + skinName);
                                                if (!path.exists) path.create();
                                        }
                                        var file = new File(dir + "/" + attachmentName);
                                        if (file.exists) file.remove();
                                        activeDocument.saveAs(file, new PNGSaveOptions(), true, Extension.LOWERCASE);
 
                                        if (scaleFactor != 1) stepHistoryBack();
                                }
                               
                                if (!layer.isBackgroundLayer) {
                                        stepHistoryBack();
                                        stepHistoryBack();
                                }
                                layer.visible = false;
                               
                                x += Math.round(width) / 2;
                                y += Math.round(height) / 2;
                               
                                if (attachmentName == placeholderName) {
                                        json += "\t\t\"" + placeholderName + "\":{\"" + placeholderName + "\":{\"x\":" + x + ",\"y\":" + y + ",\"width\":" + Math.round(width) + ",\"height\":" + Math.round(height) + "}}";
                                } else {
                                        json += "\t\t\"" + placeholderName + "\":{\"" + placeholderName + "\":{\"name\":\"" + attachmentName + "\", \"x\":" + x + ",\"y\":" + y + ",\"width\":" + Math.round(width) + ",\"height\":" + Math.round(height) + "}}";
                                }
                        
                                //omit final comma for well formed json
                                curSkinLayer++;
                                if(curSkinLayer < numSkinLayers) {
                                        json += ",\n";
                                } else {
                                        json += "\n";
                                }
                        }
                        json += "\t\}";
                  
                        //omit final comma for well formed json
                        curSkin++;
                        if(curSkin < numSkins) {
                                json += ",\n";
                        } else {
                                json += "\n";
                        }
                }
                json += "},\n\"animations\": { \"animation\": {} }}";
 
                if (saveJSON) {
                        // Write file.
                        var file = new File(dir + name + ".json");
                        file.remove();
                        file.open("w", "TEXT");
                        file.lineFeed = "\n";
                        file.write(json);
                        file.close();
                }
        }
 
        activeDocument.close(SaveOptions.DONOTSAVECHANGES);
}
 
// Unfinished!
function hasLayerSets (layerset) {
        layerset = layerset.layerSets;
        for (var i = 0; i < layerset.length; i++)
                if (layerset[i].layerSets.length > 0) hasLayerSets(layerset[i]);
}
 
function scaleImage() {
        var imageSize = app.activeDocument.width.as("px");
        app.activeDocument.resizeImage(UnitValue(imageSize * scaleFactor, "px"), undefined, 72, ResampleMethod.BICUBICSHARPER);
}
 
function stepHistoryBack () {
        var desc = new ActionDescriptor();
        var ref = new ActionReference();
        ref.putEnumerated( charIDToTypeID( "HstS" ), charIDToTypeID( "Ordn" ), charIDToTypeID( "Prvs" ));
        desc.putReference(charIDToTypeID( "null" ), ref);
        executeAction( charIDToTypeID( "slct" ), desc, DialogModes.NO );
}
 
function getLayers (layer, collect) {
        if (!layer.layers || layer.layers.length == 0) return layer;
        for (var i = 0, n = layer.layers.length; i < n; i++) {
                // For checking if its an adjustment layer, but it also excludes
                // LayerSets so we need to find the different types needed.
                //if (layer.layers[i].kind == LayerKind.NORMAL) {                      
                        var child = getLayers(layer.layers[i], collect)                
                        if (child) collect.push(child);        
                //}
        }
}
 
function trim (value) {
        return value.replace(/^\s+|\s+$/g, "");
}
 
function hasFilePath() {
        var ref = new ActionReference();
        ref.putEnumerated( charIDToTypeID("Dcmn"), charIDToTypeID("Ordn"), charIDToTypeID("Trgt") );
        return executeActionGet(ref).hasKey(stringIDToTypeID('fileReference'));
}
 
function showDialog () {
        if (!hasFilePath()) {
                alert("File path not found.\nYou need to save the document before continuing.");
                return;
        }
 
        var dialog = new Window("dialog", "Export Layers");
 
        dialog.savePNGs = dialog.add("checkbox", undefined, "Save PNGs");
        dialog.savePNGs.value = savePNGs;
        dialog.savePNGs.alignment = "left";
       
        dialog.saveTemplate = dialog.add("checkbox", undefined, "Save template PNG");
        dialog.saveTemplate.value = saveTemplate;
        dialog.saveTemplate.alignment = "left";
 
        dialog.saveJSON = dialog.add("checkbox", undefined, "Save JSON");
        dialog.saveJSON.alignment = "left";
        dialog.saveJSON.value = saveJSON;
 
        dialog.ignoreHiddenLayers = dialog.add("checkbox", undefined, "Ignore hidden layers");
        dialog.ignoreHiddenLayers.alignment = "left";
        dialog.ignoreHiddenLayers.value = ignoreHiddenLayers;
       
        dialog.saveSkins = dialog.add("checkbox", undefined, "Save skins");
        dialog.saveSkins.alignment = "left";
        dialog.saveSkins.value = saveSkins;
 
        var scaleGroup = dialog.add("panel", [0, 0, 180, 50], "Image Scale");
        var scaleText = scaleGroup.add("edittext", [10,10,40,30], scaleFactor * 100);
        scaleGroup.add("statictext", [45, 12, 100, 20], "%");
        var scaleSlider = scaleGroup.add("slider", [60, 10,165,20], scaleFactor * 100, 1, 100);
        scaleText.onChanging = function() {
                scaleSlider.value = scaleText.text;
                if (scaleText.text < 1 || scaleText.text > 100) {
                        alert("Valid numbers are 1-100.");
                        scaleText.text = scaleFactor * 100;
                        scaleSlider.value = scaleFactor * 100;
                }
        };
        scaleSlider.onChanging = function () { scaleText.text = Math.round(scaleSlider.value); };
 
        var confirmGroup = dialog.add("group", [0, 0, 180, 50]);
        var runButton = confirmGroup.add("button", [10, 10, 80, 35], "Ok");
        var cancelButton = confirmGroup.add("button", [90, 10, 170, 35], "Cancel");
        cancelButton.onClick = function () { this.parent.close(0); return; };
        runButton.onClick = function () {
                savePNGs = dialog.savePNGs.value;
                saveTemplate = dialog.saveTemplate.value;
                saveJSON = dialog.saveJSON.value;
                dialog.ignoreHiddenLayers.value;
                scaleFactor = scaleSlider.value / 100;
                saveSkins = dialog.saveSkins.value;
                main();
                this.parent.close(0);
        };
 
        dialog.orientation = "column";
        dialog.center();
        dialog.show();
}

function sizeAssocArray(obj) {
        var size = 0, key;
        for (key in obj) {
                if (obj.hasOwnProperty(key)) size++;
        }
        return size;
};