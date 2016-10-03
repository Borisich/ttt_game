
//Звуки
soundManager.createSound({
    id: 'new_message',
    url: './sounds/new_message.mp3'
});
soundManager.createSound({
    id: 'my_turn',
    url: './sounds/my_turn.mp3'
});
soundManager.createSound({
    id: 'turn_finished',
    url: './sounds/turn_finished.mp3'
});
soundManager.createSound({
    id: 'win',
    url: './sounds/win.mp3'
});
soundManager.createSound({
    id: 'loose',
    url: './sounds/loose.mp3'
});
soundManager.createSound({
    id: 'disconnect',
    url: './sounds/disconnect.ogg'
});
soundManager.createSound({
    id: 'pat',
    url: './sounds/pat.mp3'
});


var socket = io('http://localhost:81');

//Компонент игрового поля
var GameField = React.createClass({

    getInitialState: function(){
        return {
            shown: false,
            fieldState: ["empty","empty","empty","empty","empty","empty","empty","empty","empty"],
            myTurn: false,
            mySymbol: 'x'
        };
    },

    componentDidMount: function () {
        var self = this;

        //Процесс игры
        socket.on('start game', function () {
            console.log("Игра началась");

            //Показать поле
            self.setState({shown: true});

            //отображение хода другого игрока
            socket.on('other player turn',function(data){
                self.updateFieldState(data.num, data.symbol);
                socket.emit('other player turn getted');
            });

            //обработка события "ваш ход"
            socket.on('your turn',function(symbol){
                self.setState({myTurn: true});
                self.setState({mySymbol: symbol});
            });
        });
    },

    updateFieldState: function(id, state){
        var tmp = this.state.fieldState;
        tmp[id-1] = state;
        this.setState ({fieldState: tmp});
    },

    clickHandler: function(e){
        if (this.state.myTurn){
            var target = e.target;
            if (this.state.fieldState[target.id-1] == "empty"){
                this.setState({myTurn: false});
                this.updateFieldState(target.id, this.state.mySymbol);
                //отправить свой ход на сервер
                socket.emit('turn finished',target.id);
                soundManager.play('turn_finished');
            }
        }
        console.log("fieldState: ");
        console.log(this.state.fieldState);
    },

    render: function(){
        if (this.state.shown) {
            return (
                <div onClick={this.clickHandler}>

                    <div id='1' className={this.state.fieldState[0]}></div>
                    <div id='2' className={this.state.fieldState[1]}></div>
                    <div id='3' className={this.state.fieldState[2]}></div>
                    <div id='4' className={this.state.fieldState[3]}></div>
                    <div id='5' className={this.state.fieldState[4]}></div>
                    <div id='6' className={this.state.fieldState[5]}></div>
                    <div id='7' className={this.state.fieldState[6]}></div>
                    <div id='8' className={this.state.fieldState[7]}></div>
                    <div id='9' className={this.state.fieldState[8]}></div>
                </div>
            );
        }
        else return <div></div>
    }
});


//Компонент строки состояния
var StatusBar = React.createClass({
    getInitialState: function () {
        return {
            shown: false,
            text: ""
        };
    },
    componentDidMount: function () {
        var self = this;
        socket.on('start game', function () {
            console.log("Игра началась");
            self.setState({shown: true});

            socket.once('wait other player', function () {
                self.setState({text: "Ход соперника..."});
            });

            socket.on('opponent informed',function(){
                self.setState({text: "Ход соперника..."});
            });

            //обработка события "ваш ход"
            socket.on('your turn',function(symbol){
                soundManager.play('my_turn');
                self.setState({text: "Ваш ход!"});
            });

            //Обработка события "конец игры"
            socket.once('end game', function(data){

                switch (data){
                    case "loose":
                        soundManager.play('loose');
                        self.setState({text: "Игра закончилась. Вы проиграли"});
                        console.log("Игра закончилась. Вы проиграли");
                        break;
                    case "win":
                        soundManager.play('win');
                        self.setState({text: "Игра закончилась. Вы выиграли!! УРАА!"});
                        console.log("Игра закончилась. Вы выиграли!! УРАА!");
                        break;
                    case "pat":
                        soundManager.play('pat');
                        self.setState({text: "Игра закончилась. Ничья"});
                        console.log("Игра закончилась. Ничья");
                        break;
                    case "disconnect":
                        soundManager.play('disconnect');
                        self.setState({text: "Игра закончилась. Игрок отключился"});
                        console.log("Дисконнект");
                        break;
                    default:
                }
            })
        });

    },
    render: function(){
        if (this.state.shown) {
            return <div>{this.state.text} </div>
        }
        else return <div></div>
    }
});

//компонент пригласительной ссылки
var InviteLink = React.createClass({
    getInitialState: function () {
        return {
            link: "",
            shown: false,
            comment: ""
        };
    },
    componentDidMount: function () {
        var self = this;
        //Прием от сервера ссылки на приглашение другого игрока
        socket.on('invite link', function (link) {
            console.log("Получена ссылка: "+link);
            socket.emit('link getted');
            //выводим ссылку на экран
            self.setState({
                shown: true,
                link: link,
                comment: "Ссылка:"
            });
        });

        //Обработка запроса сервера о передаче параметров url (url?params)
        socket.on('require url params', function () {
            console.log("Получен запрос require url params");
            socket.emit('url params', {href: window.location.href,
                params: window.location.search});
            console.log("window.location: ");
            console.log(window.location);
            console.log("Отправлено: ");
            console.log({href: window.location.href,
                params: window.location.search});
        });

        //Обработка сообщения сервера, если была попытка подключиться к комнате, которая занята
        socket.on('room is full', function () {
            console.log("Комната уже занята");

            self.setState({
                shown: true,
                link: "",
                comment: "Комната уже занята."
            });

        });

        //Обработка сообщения сервера, если была попытка подключиться к несуществующей комнате
        socket.on('game not found', function () {
            console.log("Игра не найдена");
            self.setState({
                shown: true,
                link: "",
                comment: "Игра не найдена. Проверьте правильность ссылки."
            });
        });

        socket.on('start game', function () {
            console.log("Игра началась");
            self.setState({
                shown: false
            });
        });

    },
    render: function(){
        if (this.state.shown) {
            return <div><h1>Пригласи друга поиграть в крестики-нолики!</h1><br/>{this.state.comment} <br/> {this.state.link} </div>
        }
        else return <div></div>
    }
});

//компонент чата
var Chat = React.createClass({

    getInitialState: function () {
        var el = document.createElement('div');
        return {
            shown: false,
            userInput: "",
            messageList: []
        };
    },

    componentDidMount: function () {
        var self = this;
        socket.on('start game', function () {
            console.log("Игра началась");
            self.setState({
                shown: true
            });
        });
        socket.on('message',function(text){
            var msg = {
                text: text,
                class: "othermessage"
            };
            var tmp = self.state.messageList;
            tmp.unshift(msg);
            self.setState({
                messageList: tmp
            });
            soundManager.play('new_message');
        });
    },


    submitForm: function(e){
        var self = this;
        e.preventDefault();
        socket.emit('message',this.state.userInput);

        self.setState({userInput: ""});
        socket.once('message dilivered to server',function(text){
            var msg = {
                text: text,
                class: "yourmessage"
            };
            var tmp = self.state.messageList;
            tmp.unshift(msg);
            self.setState({
                messageList: tmp
            });
        });
        return false;
    },


    handleUserInput: function(e){
        this.setState({
            userInput: e.target.value
        });
    },

    render: function(){
        if (this.state.shown) {
            return (
                <div>
                    <form onSubmit={this.submitForm} id="chatform">
                        <input id="chatinput" autoComplete="off" autoFocus placeholder="Сообщение..."
                               value={this.state.userInput} onChange={this.handleUserInput}/>
                    </form>
                    <Messages data={this.state.messageList}/>
                </div>
            )
        }
        else
            return <div></div>
    }
});

//Компонент для генерации всех сообщений
var Messages = React.createClass({
    render: function(){
        var list = this.props.data.map(function(message,i){
        return  (
                <p className={message.class} key={i}>
                    {message.text}
                </p>
            )
        });
        return (<div>
                {list}
            </div>
        );
    }
});


ReactDOM.render(<GameField/>, document.getElementById("field"));
ReactDOM.render(<Chat/>, document.getElementById("chat"));
ReactDOM.render(<InviteLink/>, document.getElementById("invitelink"));
ReactDOM.render(<StatusBar/>, document.getElementById("status"));