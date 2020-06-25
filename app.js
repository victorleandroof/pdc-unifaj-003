require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const http = require('http');
const { emit } = require('process');
const server = http.createServer(app);
const io = require('socket.io').listen(server);

app.use('/assets', express.static(__dirname + '/assets'));
app.engine('html', require('ejs').renderFile);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');


let jogadores = [];
let congruencias = [];
let bingoInit = false;

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

function gerarCartelaBingo(pos){
    const jogador = jogadores[pos];
    const cartela = new Array();
    const colunas = {};
    let sorteados = [];
    let sugestao = 0;
    for(let i=0;i<5;i++){
        for(let j=0; j<5;j++){
            if (sorteados.length == 99) {
                throw Error('acabou os numeros')
            }
            sugestao = getRandomInt(0,99);
            while (sorteados.indexOf(sugestao) >= 0) { 
                sugestao =  getRandomInt(0,99);
            }
            if(!colunas[`coluna${i+1}`]) colunas[`coluna${i+1}`] = new Array();
            colunas[`coluna${i+1}`].push(sugestao);
            sorteados.push(sugestao);
        }
    }
    cartela.push(colunas.coluna1);
    cartela.push(colunas.coluna2);
    cartela.push(colunas.coluna3);
    cartela.push(colunas.coluna4);
    cartela.push(colunas.coluna5);
    return cartela;
}
app.get('/', (req, res) => {
    return res.render('index');
});

server.listen(port, () => {
    console.log(`ouvindo em porta ${port}`);
});

io.on('connection', socket => {
    console.log(`Socket connection ${socket.id}`);
    socket.on('bingo', (data)=>{
        let verificar = []
        const jogador = jogadores.filter((jogador)=>socket.id == jogador.uuid);
        congruencias.forEach(congruencia=>{
            const sub = congruencia.b - congruencia.a;
            data.forEach(mod=>{
                if(sub % mod){
                    verificar.push(true);
                }else{
                    verificar.push(false);
                }
            });
        })
        if(verificar.indexOf(false) >= 0){
            socket.emit('error-gamer',{message:'hm expertinho não foi dessa vez'})
        }else {
            jogadores.forEach(jogador=>{
                io.clients().to(jogador.uuid).emit('vencedor',jogador[0].username)
            })
        }
    });
    socket.on('init', data => {
        if (data.username) {
            let flag = false;
            let pos = jogadores.length;
            jogadores.forEach((jogador)=>{
                if(jogador.username == data.username) flag = true;
            });
            if(flag){
                socket.emit('error-gamer',{message:'ja tem esse username',username:true});
            }else {
                data['uuid'] = socket.id;
                data['cartela'] = gerarCartelaBingo(pos-1);
                jogadores[pos]= data;
                if(jogadores.length == 2 && !bingoInit){
                    jogadores.forEach((jogador)=>{
                        io.clients().to(jogador.uuid).emit('pos-init',jogador);
                    })
                    if(congruencias.length){
                            io.clients().to(jogadores[0].uuid).emit('numeros',congruencias);
                            io.clients().to(jogadores[1].uuid).emit('numeros',congruencias);
                            //io.clients().to(jogadores[2].uuid).emit('numeros',congruencias[i]);
                            //io.clients().to(jogadores[3].uuid).emit('numeros',congruencias[i]);
                            //io.clients().to(jogadores[4].uuid).emit('numeros',congruencias[i]);
                    }
                };
            } 
        } else {
            socket.emit('error-gamer', {
                message: "Username não informado"
            });
        }
    });
    socket.on('disconnect', ()=> {
        console.log(`Got disconnect! ${socket.id}`);
        let jogadoresAux = jogadores;
        jogadores = jogadoresAux.filter((jogador)=>socket.id != jogador.uuid);
    });
})


async function gerarCongruencias(){
    while(congruencias.length <= 3000){
        let numA = getRandomInt(1,10000);
        let numB = getRandomInt(1,10000);
        let subtr = numB - numA;
        let flag = true;
        let contador = 5;
        while(flag){
            if(subtr % contador){
                flag = false;
                congruencias.push({a:numA,b:numB});
            }else {
                numA = getRandomInt(1,10000);
                numB = getRandomInt(1,10000);
                subtr = numB - numA;
            }
            contador++;
        }
    }
}
gerarCongruencias();