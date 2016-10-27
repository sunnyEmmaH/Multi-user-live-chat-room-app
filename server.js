var express = require('express'),
	app=express(),
	server=require('http').createServer(app),
	io=require('socket.io').listen(server),
	rooms={},	////////////一个roomname对应一个array，里面储存的是在这个房间内的人员的socket
	users={};     /////////////一个username对应一个socket
		
server.listen(3000);

app.get('/', function(req, res){
  res.sendfile(__dirname + '/index.html');
});

io.on('connection', function(socket){
	socket.on('new user', function(data1, data2, callback){
		if(data1 in users){
			callback(false);
		}else{
			callback(true);
			socket.nickname = data1;
			socket.roomname=data2;
			users[socket.nickname]=socket;
			if(data2 in rooms)
				rooms[data2].push(socket);
			else{
				rooms[data2]=[];
				rooms[data2].push(socket);
			}
			updateRooms();
			updatecurRoom();
		}
	});
	function updateRooms(){
		io.emit('roomnames', Object.keys(rooms));
	}
	function updatecurRoom(){
		users[socket.nickname].emit('curroom', socket.roomname);
	}
		
	socket.on("send message", function(data, callback){     ///"send message" is the same name as html file
		var msg=data.trim();
		if(msg.substr(0, 6) === '/nick '){
			msg=msg.substr(6);
			////check for duplicate name
			if (msg in users){
				var html='This name is already exist. Please change another name!'
				callback(html);
			}
			else{
				var oldnick=socket.nickname;
				socket.nickname=msg;
				users[msg]=users[oldnick];
				delete users[oldnick];
				//////do callback
				var html='You are now known as ';
				html+=socket.nickname;			
				callback(html);
			}
		}
		else if(msg.substr(0, 6) === '/join '){
			msg=msg.substr(6);
			var oldroom=socket.roomname;
			socket.roomname=msg;
			var ind=rooms[oldroom].indexOf(socket);
			rooms[oldroom].splice(ind, 1);
			if(rooms[oldroom].length==0)
				delete rooms[oldroom];
		    ////
			if(msg in rooms)
				rooms[socket.roomname].push(socket);
			else{
				rooms[socket.roomname]=[];
				rooms[socket.roomname].push(socket);
			}				
			updatecurRoom();
			updateRooms();
			//////do callback
			var html='Room changed. Users currenly in ';
			html+=socket.roomname;	
			html+=': ';
			var arr=Object.keys(users);
			for(i=0; i<rooms[socket.roomname].length; i++){
				for(j=0; j<arr.length; j++){
					if(users[arr[j]]==rooms[socket.roomname][i])
						html+=arr[j]+', ';
				}
			}
			callback(html);
		}
		else{
			for(i=0; i<rooms[socket.roomname].length; i++){
				rooms[socket.roomname][i].emit('new message', {msg: data, nick: socket.nickname});
			}
		}
	});
	
	socket.on('disconnect', function(data){
		if(!socket.nickname) return;
		var ind=rooms[socket.roomname].indexOf(socket);
		rooms[socket.roomname].splice(ind, 1);
		if(rooms[socket.roomname].length==0)
			delete rooms[socket.roomname];
		delete users[socket.nickname];
		updateRooms();
	});
});