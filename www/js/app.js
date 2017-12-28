var lenkkiApp = angular.module("lenkkiApp", ['ionic', 'ngCordova']);

var kartta;
var pisteLayer;
var viivaLayer;
var ed_lon = 0;
var ed_lat = 0;
var nyk_lon;
var nyk_lat;
var kaikkiLenkinPisteet = [];
var GpsPisteet;
var LenkkiKaynnisssa;
var nyk_nopeus;
var max_nopeus = 0;
var pvm;
var lenkin_pituus = "0.00";
var aika_sekunnit = 0;
var aika_minuutit = 0;
var aika_tunnit = 0;
var ajanOtto_interval;

lenkkiApp.controller("lenkkiAppCtrl", function ($scope, $ionicPlatform, $cordovaGeolocation, $ionicPopup, $http) {
    
    $ionicPlatform.ready(function() {
        
        $scope.LenkkiTeksti = "Aloita uusi lenkki";
        $scope.sekunnit = 0;
        $scope.minuutit = 0;
        $scope.tunnit = 0;
        LenkkiKaynnisssa = false;
        $scope.tulokset = [];
        
        haeTulokset();
        Start();
        
        function Start() {
            $cordovaGeolocation.getCurrentPosition({
                                                "enableHighAccuracy": true,
                                                "timeout" : 15000
                                            })
                                            .then(
                                            function (paikkatieto) {//onnistunut

                                                nyk_lat = paikkatieto.coords.latitude;
                                                nyk_lon = paikkatieto.coords.longitude;
                                                nyk_nopeus = (paikkatieto.coords.speed*3.6).toFixed(2);//palauttaa metrejä sekunnissa joten *3.6 on km/h

                                                kartta = new ol.Map({
                                                                        target: 'kartta',
                                                                        layers: [
                                                                                new ol.layer.Tile({
                                                                                                    source: new ol.source.OSM()
                                                                                                  })
                                                                                ],
                                                                        view: new ol.View({
                                                                                            center: ol.proj.fromLonLat([nyk_lon, nyk_lat]),
                                                                                            zoom: 15
                                                                                           })
                                                                    });//kartta
                                                $scope.lon = nyk_lon;
                                                $scope.lat = nyk_lat;
                                                $scope.nopeus = nyk_nopeus;
                                                $scope.lenkinPituus = "0.00";
                                                piirraPiste(nyk_lon, nyk_lat);
                                                //aloitetaan seuramaan gps pisteitä kun eka paikannus on onnistunut...jos ei onnistu niin tarjotaan yritä uudeleen vaihtoehtoa...
                                                //$cordovaGeolocation.watchCurrentPosition toinen vaihtoehto, mutta tässä versiossa buginen ja ei toimi kaikilla puhelimilla -> GPS kuvake tulee kyllä puhelimeen ja näyttäis toimivan, mutta ei ikinä suorita functiota loppuun vaan jauhaa vain... 
                                                GpsPisteet = navigator.geolocation.watchPosition(onnnistunut, epaonnistunut, { timeout: 10000,  enableHighAccuracy: true});
                                            }, 
                                            function (virhe) {//epäonnistunut
                                                //virheenkäsittely
                                                var dialogi = $ionicPopup.show({
                                                            title : "Paikkatietoja ei saada",
                                                            template : "Paikkatietoja ei saada. Varmista, että GPS ja internetyhteys ovat päällä ja toimivat.",
                                                            buttons : [
                                                                        {
                                                                            text : "Yritä uudelleen",
                                                                            type : "button-dark",
                                                                            onTap : function () {
                                                                                Start();
                                                                            }//onTab
                                                                        },//Yritä uudelleen
                                                                        {
                                                                            text : "Peruuta",
                                                                            onTap : function () {

                                                                            }
                                                                        }//peruuta
                                                                      ]//buttons
                                                });//dialogi
            });//geolocation
        }//Start()
                        
        function onnnistunut(paikkatieto) {
            
            ed_lon = nyk_lon;//korjaus ettei tallenneta turhaan gps pisteitä arrayhyn (ei kannattaisi käyttää arrayta, mutta menettelee tässä "testi/harjoitus" tapauksessa) ellei jompikumpi niistä muutu. 
			                 //Vaikka dokumentaatio antoi ymmärtää, että tätä kutsutaan vain kun gps pisteet muuttuu, silti kutsuu tätä tietyn väliajoin ja näin ollen muuttumattomia koordinaatteja menee ihan turhaan arrayhyn ja sitä myöten kantaan jne jne....
            ed_lat = nyk_lat;
            nyk_lat = paikkatieto.coords.latitude;
            nyk_lon = paikkatieto.coords.longitude;
            nyk_nopeus = (paikkatieto.coords.speed*3.6).toFixed(2);//palauttaa metrejä sekunnissa joten *3.6 on km/h

            $scope.lon = nyk_lon;
            $scope.lat = nyk_lat;
            $scope.nopeus = nyk_nopeus;
            
            if (nyk_nopeus > max_nopeus) {
                max_nopeus = nyk_nopeus;
            }

            if(LenkkiKaynnisssa) {
                
                lenkin_pituus = "0.00";//nollaus pituuteen, koska se lasketaan jokaisella kerralla kokonaaan uusiksi...
                
                if (ed_lon != nyk_lon || ed_lat != nyk_lat) {
                    kaikkiLenkinPisteet.push([nyk_lon, nyk_lat]);
                }
                
                for (var i = 0; i < kaikkiLenkinPisteet.length; i++) {//TODO:Fiksummin... lenkin pituuden laskeminen...vähän ehkä "kökkö" ja ei kovin "optimaalinen" tapa
                        
                        var temp1 = kaikkiLenkinPisteet[i].toString().split(",");//vähän lisää kikkailua :) lenkkien pisteet arrayssa muodossa [[lon,lat],[lon,lat]]....
                        var lon1 = temp1[0];
                        var lat1 = temp1[1];

                        if(kaikkiLenkinPisteet[(i+1)] != null) {//kun piteitä ei enää löydy niin ei tarvitse enää laskea pisteiden välimatkaakaan....
                            var temp2 = kaikkiLenkinPisteet[(i+1)].toString().split(",");
                            var lon2 = temp2[0];
                            var lat2 = temp2[1];
                            
                            var pisteiden_etaisyys = laskeEtaisyys(lat1, lon1, lat2, lon2);
                            
                            lenkin_pituus = parseFloat(lenkin_pituus) + parseFloat(pisteiden_etaisyys);
                            
                        }
                        else {//kun pisteitä ei enää löydy arraysta
                            break;
                        }
                        
                }//for
                
                poistaViiva(viivaLayer);
                piirraViiva(kaikkiLenkinPisteet);
                $scope.lenkinPituus = Math.round((lenkin_pituus / 1000) * 100) / 100;
                $scope.$apply();
            }//if
            else {
                poistaViiva(viivaLayer);
            }
            
            poistaPiste(pisteLayer);
            kartta.getView().setCenter(ol.proj.transform([nyk_lon, nyk_lat], 'EPSG:4326', 'EPSG:3857'));
            piirraPiste(nyk_lon, nyk_lat);
            
            $scope.$apply();

        }//onnistunut()

        function epaonnistunut(error) {
            alert("Paikkatietoja ei saada!");
        }//epaonnistunut()

        $scope.AloitaLopetaLenkki = function () {
            
            if(!LenkkiKaynnisssa){
                LenkkiKaynnisssa = true;
                $scope.LenkkiTeksti = "Lopeta lenkki";
                ajanOtto_interval = setInterval(ajanOtto, 1000);
            }
            else {
                LenkkiKaynnisssa = false;
                $scope.LenkkiTeksti = "Aloita uusi lenkki";
                clearInterval(ajanOtto_interval);
                var aikaleima = new Date().getTime();
                $scope.dialogiData = [];
                var dialogi = $ionicPopup.show({
                                                title : "Tallenna lenkki",
                                                scope : $scope,
                                                template : "<span>Anna lenkille nimi</span>\n\
                                                            <input type='text' ng-model='dialogiData.nimi'/>",
                                                buttons : [
                                                            {
                                                                text : "Tallenna",
                                                                type : "button-dark",
                                                                onTap : function () {
                                                                    
                                                                    $http({
                                                                    method : "PUT",
                                                                    url : "http://192.168.1.84/ws/lenkkiapp.php",
                                                                    data : {
                                                                            lenkin_nimi: $scope.dialogiData.nimi,
                                                                            lenkin_pvm:  aikaleima.toString(),
                                                                            lenkin_max_nopeus: max_nopeus,
                                                                            lenkin_pituus: $scope.lenkinPituus,//tällä kantaan, koska muutettu kilometreiksi...perusmuuttuja metreinä
                                                                            lenkin_gps_pisteet: kaikkiLenkinPisteet.toString(),
                                                                            lenkin_aika: aika_tunnit.toString() + ":" + aika_minuutit.toString() + ":" + aika_sekunnit.toString()
                                                                           }//data
                                                                    })
                                                                    .then(
                                                                      function (response) { //Onnistunut http-kutsu
                                                                          $ionicPopup.alert({
                                                                                              title : "Lenkki tallennettu",
                                                                                              template : "Lenkki on tallennettu ja voit tarkastella kaikkia tallennettuja lenkkejä Omat lenkit - valikosta."
                                                                                          });
                                                                                          kaikkiLenkinPisteet = [];
                                                                                          lenkin_pituus = "0.00";
                                                                                          $scope.lenkinPituus = "0.00";
                                                                                          aika_sekunnit = 0;
                                                                                          aika_minuutit = 0;
                                                                                          aika_tunnit = 0;
                                                                                          $scope.sekunnit = 0;
                                                                                          $scope.minuutit = 0;
                                                                                          $scope.tunnit = 0;
                                                                      }, 
                                                                      function (response) { //Tapahtui virhe...

                                                                        console.log(response);

                                                                        var virhekoodi = response.status;

                                                                        $ionicPopup.alert({
                                                                                              title : "Yhteysvirhe, lenkkiä ei tallennettu",
                                                                                              template : "Palvelimellle ei saatu yhteyttä. Lenkkiä ei voitu tallentaa."
                                                                                          });

                                                                    });//http
                                                                                                                                                                                                           
                                                                }//onTab
                                                            },//tallenna
                                                            {
                                                                text : "Peruuta",
                                                                onTap : function () {
                                                                    kaikkiLenkinPisteet = [];
                                                                    lenkin_pituus = "0.00";
                                                                    $scope.lenkinPituus = "0.00";
                                                                    aika_sekunnit = 0;
                                                                    aika_minuutit = 0;
                                                                    aika_tunnit = 0;
                                                                    $scope.sekunnit = 0;
                                                                    $scope.minuutit = 0;
                                                                    $scope.tunnit = 0;
                                                                }
                                                            }//peruuta
                                                          ]//buttons
                                                });//dialogi
            }
            
        };//AloitaLopetaLenkki()
        
        
        
        //------------------Platformin sisäiset yleiset functiot----------------
        function ajanOtto() {
            aika_sekunnit += 1;

            if(aika_sekunnit >= 60){

                aika_minuutit += 1;
                aika_sekunnit = 0;
            }

            if(aika_minuutit >= 60){

                aika_tunnit += 1;
                aika_minuutit = 0;
            }
            $scope.sekunnit = aika_sekunnit;
            $scope.minuutit = aika_minuutit;
            $scope.tunnit = aika_tunnit;
            $scope.$apply();
        }//ajanOtto()
        
        function haeTulokset() {
            $http({
                method : "GET",
                url : "http://192.168.1.84/ws/lenkkiapp.php"
              })
              .then(
                function (response) { //Onnistunut http-kutsu
                  $scope.tulokset = response.data;
              }, 
                function (response) { //Tapahtui virhe...

                  console.log(response);

                  var virhekoodi = response.status;

                  $ionicPopup.alert({
                                        title : "Yhteysvirhe",
                                        template : "Palvelimellle ei saatu yhteyttä. Et voi tallentaa lenkkiä tai katsella tallennettuja lenkkejä.",
                                        buttons : [
                                                    {
                                                        text : "Ok",
                                                        onTap : function () {
                                                            
                                                        }
                                                    }//peruuta
                                                  ]//buttons
                                    });

            });
        }//haeTulokset
    });//platform.ready
});//lenkkiAppCtrl




//----------------------------Globaalit funktiot--------------------------------
function piirraViiva(koordinaatit) {
    
    var lineString = new ol.geom.LineString(koordinaatit);
    
    // transform to EPSG:3857
    lineString.transform('EPSG:4326', 'EPSG:3857');

    var viivanOminaisuudet = new ol.Feature({
                                            geometry: lineString,
                                            name: 'Lenkki'
                                            });

    var viivanTyyli = new ol.style.Style({
                                            stroke: new ol.style.Stroke({
                                                                            color: '#ffcc33',
                                                                            width: 8
                                                                        })
                                         });

    var lahde = new ol.source.Vector({
                                            features: [viivanOminaisuudet]
                                      });
    
    viivaLayer = new ol.layer.Vector({
                                            source: lahde,
                                            style: [viivanTyyli]
                                         });
    
    kartta.addLayer(viivaLayer);
}//piirraViiva()

function piirraPiste(lon, lat) {
    var pisteenTyyli = new ol.style.Style({
                                            image: new ol.style.Circle({
                                                                        radius: 5,
                                                                        fill: new ol.style.Fill({
                                                                                                    color: [51, 153, 255, 1]
                                                                                                }),
                                                                        stroke: new ol.style.Stroke({
                                                                                                    color: [0, 51, 204, 1],
                                                                                                    width: 1.5
                                                                                                    })
                                                                        }),
                                            zIndex: 1

                                            });
    var pisteet = [];
    var pisteenOminaisuudet;

    pisteenOminaisuudet = new ol.Feature({
                                          geometry: new ol.geom.Point(ol.proj.transform(
                                                                                          [lon, lat],//pisteen koordinaatit
                                                                                          'EPSG:4326', 'EPSG:3857'
                                                                                        ))});

    pisteenOminaisuudet.setStyle(pisteenTyyli);
  
    pisteet.push(pisteenOminaisuudet);
  
    pisteLayer = new ol.layer.Vector({ 
        source: new ol.source.Vector({ features: pisteet })
    });
  
    kartta.addLayer(pisteLayer);
}//piiraPiste()

function poistaPiste(piste) {
    kartta.removeLayer(piste);
}//poistaPiste()

function poistaViiva(viiva) {
    kartta.removeLayer(viiva);
}//poisteViiva()

function laskeEtaisyys(lat1, lon1, lat2, lon2) {
    // a = sin²(deltalat/2) + cos lat1 · cos lat2 · sin²(deltalon/2)
    // c = 2 · atan2( Sqrt(a), Sqrt(1-a) )
    // d = R · c
        var R = 6371000;  // Maapallon säde metreinä
        var lat1rad = AsteetRadiaaneiksi(lat1);
        var lat2rad = AsteetRadiaaneiksi(lat2);
        var deltalat = AsteetRadiaaneiksi((lat2 - lat1));
        var deltalon = AsteetRadiaaneiksi((lon2 - lon1));

        var a = Math.sin(deltalat / 2) * Math.sin(deltalat / 2) +
                   Math.cos(lat1rad) * Math.cos(lat2rad) *
                   Math.sin(deltalon / 2) * Math.sin(deltalon / 2);

        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        var d = R * c;

        return d;
}  // LaskeEtaisyys

function AsteetRadiaaneiksi(asteet)
{
    return (asteet * Math.PI / 180.0);
} // AsteetRadiaaneiksi

function RadiaanitAsteiksi(radiaanit)
{
    return (radiaanit / Math.PI * 180.0);
}  // RadiaanitAsteiksi
