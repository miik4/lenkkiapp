<?php
//laitetaan mysql tiedot - tässä perus koska on testi versio
$dns = "mysql:host=localhost;dbname=lenkkiapp;";
$tunnus = "root";
$salasana = "";

try {//virheviesti jos ei onnaa kirjautuminen/yhteys tietokantaan
	$yhteys = new PDO($dns, $tunnus, $salasana);
} catch (PDOException $e){
	die("Virhe: ".$e->getMessage());
}
$yhteys->exec("SET NAMES utf8");

$data = file_get_contents("php://input");
$tiedot = json_decode($data);

$metodi = $_SERVER['REQUEST_METHOD'];

switch ($metodi) {
	case "GET" : $sql_lause = "SELECT * FROM tallennetutlenkit ORDER BY lenkin_pvm";
		break;
	
	case "PUT" : $sql_lause = "INSERT INTO tallennetutlenkit (lenkin_nimi, lenkin_pvm, lenkin_max_nopeus, lenkin_pituus, lenkin_gps_pisteet, lenkin_aika) VALUES ('".$tiedot->lenkin_nimi."',
																																						   '".$tiedot->lenkin_pvm."',
																																						  '".$tiedot->lenkin_max_nopeus."'
																																						  ,'".$tiedot->lenkin_pituus."'
																																						  ,'".$tiedot->lenkin_gps_pisteet."'
																																						  ,'".$tiedot->lenkin_aika."');";
		break;
		
    case "POST": $sql_lause="UPDATE pelitiedot SET nimi='".$tiedot->nimi."', pisteet='".$tiedot->pisteet."', kysymys3='".$tiedot->kysymys2."'";
        break;
    
    case "DELETE": $sql_lause="DELETE FROM pelitiedot WHERE id='".$tiedot->id."';";
        break;
    
    default: $paluuviesti="Webservice vastaa: ei tuettu method (".$method.")";
        break;
}

$kysely = $yhteys->prepare($sql_lause);
$kysely->execute();

//paluu viesti kamaa
header("Access-Control-Allow-Origin: *"); // CORS
header("Access-Control-Allow-Methods: GET, POST, DELETE, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept");//Tietyt Chromen versiot vaativat POST varten
//header("Content-type: application/json");
header("Content-type: text/plain");
echo json_encode($kysely->fetchAll(PDO::FETCH_ASSOC));
?>
