var express = require("express");
var app = express();
var path = require('path');
app.use(express.static(path.join(__dirname, 'public')));
var server = require("http").createServer(app);
var io = require("socket.io").listen(server);

function getRandomInt(max) {return Math.floor(Math.random() * Math.floor(max));}
var tour = 1; //tour
var idDuTour;

var counterVal = 10;
 
users = []; //liste des noms(couleurs)
vies = []; // dans le meme ordre que les sockets
connections = []; // liste des sockets connectés avec un id et un nom (couleur)
var couleursNonDispo = [];
var premierJoueur;

//fonctions utilitaires :
function couleurToid(couleur) {
  console.log(connections[0]);
  for(i in connections) {
    if(connections[i].username==couleur) { 
      return connections[i].id; 
    }
  }
}
function idToCouleur(id) {
  for(i in connections) {
    if(connections[i].id==id) { return connections[i].username; }
  }
}
function idToPlace(id) { // la place(position) dans la liste users
  for(i in connections) {
    if(connections[i].id == id) { return i; }
  }
}

console.log("server lancé...");

server.listen(process.env.PORT || 3000);
app.get("/", function(req, res){
  res.sendFile(__dirname + "/index.html");
});


io.sockets.on("connection", function(socket){
  connections.push(socket);
  console.log("Connecté : %s sockets connectés", connections.lenght);
  var i;
  for (i in couleursNonDispo) {
    io.sockets.emit("enleverCouleur", couleursNonDispo[i]);
  }
  // CONNEXION ET DECONNEXION
  socket.on("disconnect", function(data){
      // déconnexion
    users.splice(users.indexOf(socket.username), 1);
    updateUsernames();
    connections.splice(connections.indexOf(socket), 1);
    couleursNonDispo.splice(couleursNonDispo.indexOf(socket.username),1);
    vies.splice(connections.indexOf(socket), 1); // abc là
    io.sockets.emit("remettreCouleur", socket.username);
    console.log("Déconnecté : %s utilisateurs connectés", users.lenght);
  });
  //nouveaux utilisateurs
  socket.on("new user", function(data, callback){ // des qu'un utilisateur a choisi sa couleur
    
    console.log("nouvel utilisateur : "+data);
    callback = true;
    socket.username = data;
    
    users.push(socket.username);
    vies.push(100);
    updateUsernames();

    couleursNonDispo.push(data);
    var i;
    for (i in couleursNonDispo) {
      io.sockets.emit("enleverCouleur", couleursNonDispo[i]);
    }
  });
  function updateUsernames(){
    io.sockets.emit("get users", users);
  }
  // ----------- LOGIQUE DU JEU -----------
  //    --> tour
  socket.on("finTour", function(data) {
    tour++;
    var id = data;
    for (var i = 0; i < connections.length; i++) {
      
      if (connections[i].id == id) {
        if (i!= connections.length-1) {
          idDuTour = connections[i+1].id;
        } else { 
          idDuTour = connections[0].id; 
          io.sockets.emit("tour", 0); //quand un tour est passé (tous les joueurs ont joué une fois)
        }
      }
    }
    io.sockets.emit("Tour", false); // quand c'est le Tour du joueur
    io.to(idDuTour).emit("Tour", true);
  });



  //    --> attaque
  // data[couleur, pv_en_moins]
  socket.on("attaque", function(data) {
    //le client envoie la couleur a attaquer, il faut la convertir en id
    var id = couleurToid(data[0]);
    var pos = idToPlace(id);
    vies[pos] -= data[1];
    if (vies[pos]<=0) { vies[pos] = 0; }
    io.to(id).emit("attaqué", vies[pos]);
  });
  socket.on("lobby" , function() {
    if (users.length == 1) {
      var counter = setInterval(function() {
        counterVal -= 1;
          
        io.sockets.emit('counter', counterVal);
        
        console.log(counterVal);
         
        if (counterVal == 0) {
          clearInterval(counter);
          }
        }, 1000);
    }
    else {
      io.sockets.emit('counter', counterVal);
      choisirJoueurDebut();
    }
    
  });

  socket.on("chrono", function() {
    var centi = 0;
	  var sec = 0;
	  var min = 0;
	  var h = 0;
	  var loc;
	  var compt = 0;
	
	  setInterval(function chrono() {
			  centi++;
			  centi*10;
			  if (centi > 9) {
				  centi = 0;
				  sec++;
			  }
								
			  if (sec > 59) {
				  sec = 0;
				  min++;
			  }
								
			  if (min > 59) {
				  min = 0;
				  h++;
			  }
			
			  if (sec < 10) {
				  var sec_ = "0" + sec;
			  }
			  else {
				  var sec_ = sec;
			  }
				
			  if (min < 10) {
				  var min_ = "0" + min;
			  }
			  else {
				  var min_ = min;
			  }
								
			  var loc = h + ":" + min_ + ":" + sec_;
        //console.log(loc);
        io.sockets.emit("chrono", loc);
      }, 100);

      
  });

});

function choisirJoueurDebut() {
  premierJoueur = connections[0].id; //length TH
  //premierJoueur = connections[0].id;
  io.sockets.emit("Tour", false);
  io.to(premierJoueur).emit("Tour", true);
}
