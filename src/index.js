var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var usernames = {};

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    var name;
    do{
        name = "user" + Math.floor((Math.random() * 10000) + 1);
    } while(usernames[name]);

    console.log(name + ' has joined with id ' + socket.id);

    usernames[name] = {name: name, id: socket.id};
    socket.name = name;
    io.emit('new userlist', usernames);
    io.emit('info', getDate() + ' -> ' + name + " has joined");

    socket.on('disconnect', function(){
        console.log(this.name + ' has disconnected');
        delete usernames[this.name];
        io.emit('new userlist', usernames);
        io.emit('info', getDate() + ' -> ' + name + " has quit");
    });

    socket.on('write', function(msg){
        if(msg.toString().startsWith("/nick ")){
            var name = msg.toString().substr(6);
            if(!usernames[name] && name.indexOf(' ')==-1){ //username is free
                var oldName = socket.name;
                var oldId = usernames[oldName].id;
                usernames[name] = {name: name, id: oldId};
                delete usernames[oldName];
                socket.name = name;
                socket.broadcast.emit('info', getDate() + ' -> ' + oldName + ' is now known as ' + name);
                socket.emit('info', 'Your username has changed to ' + name);
                io.emit('new userlist', usernames);
                console.log(oldName + ' has changed username to ' + name);
            } else {
                socket.emit('err', 'name is already taken');
                console.log(oldName + ' hasn\'t changed username because name was already taken');
            }
            return;
        }
        if(msg.toString().startsWith("/help")){
            socket.emit('info', 'Here is a little bit help!');
            return;
        }
        if(msg.toString().startsWith("/msg ")){
            var start = msg.toString().indexOf(' ')+1;
            var end = msg.toString().indexOf(' ', start);
            var name = msg.toString().substr(start, end-start);
            if(socket.name == name){
                socket.emit('err', 'You can\'t write a private message to yourself');
                return;
            }
            if(usernames[name]){
                io.to(usernames[name].id).emit('priv', getDate() + ' <' + socket.name + '>: ' + msg.substr(end+1));
                socket.emit('priv', getDate() + ' <' + socket.name + '>: ' + msg.substr(end+1));
                //usernames[name].socket_id.emit('private', socket.name + ': ' + msg.substr(end+1));
                console.log('Private message from ' + socket.name + ' to ' + name);
            } else {
                socket.emit('err', 'Username ' + name + ' not found');
                console.log('Failed sending message from ' + socket.name + ' to ' + name);
            }
            return;
        }


        console.log(socket.name + ' writes: ' + msg);
        io.emit('write', getDate() + ' <' + socket.name + '> ' + msg);
    });
});

http.listen(3000, function(){
    console.log('listen on *:3000');
});

function getDate(){
    var myDate = new Date();
    return (myDate.getHours()<10?'0':'') + myDate.getHours() + ":"
        + (myDate.getMinutes()<10?'0':'') + myDate.getMinutes() + ":"
        + (myDate.getSeconds()<10?'0':'') + myDate.getSeconds();
}
